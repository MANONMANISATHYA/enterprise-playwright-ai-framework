'use strict';

/**
 * Self-hosted target app for the enterprise-playwright-ai-framework.
 *
 * - No dependencies: Node's built-in http module only.
 * - Mirrors the data-test contract of the public SauceDemo site, so the same
 *   page objects and tests run against it unchanged.
 * - Synthetic data only. State lives in memory and resets when the server stops.
 * - Defects are switched on with the DEFECT env var (comma-separated ids).
 */

const http = require('node:http');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const DEFECTS = new Set(
  (process.env.DEFECT || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
const hasDefect = (id) => DEFECTS.has(id);

/** Counts successful logins so the flaky-login defect can fail every third one. */
let loginCount = 0;

const PASSWORD = 'secret_sauce';
const USERS = {
  standard_user: { locked: false },
  locked_out_user: { locked: true },
  second_user: { locked: false },
};

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const PRODUCTS = [
  ['Sauce Labs Backpack', 29.99],
  ['Sauce Labs Bike Light', 9.99],
  ['Sauce Labs Bolt T-Shirt', 15.99],
  ['Sauce Labs Fleece Jacket', 49.99],
  ['Sauce Labs Onesie', 7.99],
  ['Test.allTheThings() T-Shirt (Red)', 15.99],
].map(([name, price]) => ({ name, price, slug: slugify(name) }));

const PROTECTED = new Set([
  '/inventory.html',
  '/cart.html',
  '/checkout-step-one.html',
  '/checkout-step-two.html',
  '/checkout-complete.html',
]);

/** token -> { user, cart: string[], shipping } */
const sessions = new Map();

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseCookies = (header) => {
  const cookies = {};
  for (const part of (header || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return cookies;
};

const readText = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const readForm = async (req) => new URLSearchParams(await readText(req));

/** Parsed JSON body, or undefined when the body is not valid JSON. */
const readJson = async (req) => {
  try {
    return JSON.parse(await readText(req));
  } catch {
    return undefined;
  }
};

const getSession = (req) => sessions.get(parseCookies(req.headers.cookie).session);

const send = (res, status, html, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
};

const redirect = (res, location, headers = {}) => {
  res.writeHead(303, { Location: location, ...headers });
  res.end();
};

const layout = (body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Swag Labs</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f6f7f9; color: #14181f; }
  main { max-width: 720px; margin: 0 auto; }
  header { display: flex; gap: 16px; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  input, select, button { font: inherit; padding: 8px 12px; margin: 4px 0; }
  .item { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 12px; margin: 8px 0; }
  [data-test="error"] { color: #b00020; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;

const loginPage = (error) =>
  layout(`
<h1>Swag Labs</h1>
<form method="post" action="/login">
  <div><input data-test="username" name="username" placeholder="Username" autocomplete="off"></div>
  <div><input data-test="password" name="password" type="password" placeholder="Password"></div>
  <input type="submit" value="Login">
</form>
${error ? `<h3 data-test="error" role="alert">${esc(error)}</h3>` : ''}`);

const header = (session) => {
  const count = session.cart.length;
  const shown = hasDefect('wrong-cart-count') && count > 0 ? count + 1 : count;
  return `
<header>
  <div>
    <button type="button" onclick="document.getElementById('menu').hidden = !document.getElementById('menu').hidden">Open Menu</button>
    <nav id="menu" hidden><a data-test="logout-sidebar-link" href="/logout">Logout</a></nav>
  </div>
  <a data-test="shopping-cart-link" href="/cart.html">Cart${
    shown > 0 ? ` <span data-test="shopping-cart-badge">${shown}</span>` : ''
  }</a>
</header>`;
};

const sortProducts = (sort) => {
  const list = [...PRODUCTS];
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (sort === 'za' && !hasDefect('sort-za-broken')) return list.sort(byName).reverse();
  if (sort === 'lohi') return list.sort((a, b) => a.price - b.price || byName(a, b));
  if (sort === 'hilo') return list.sort((a, b) => b.price - a.price || byName(a, b));
  return list.sort(byName);
};

const inventoryPage = (session, sort) => {
  const items = sortProducts(sort)
    .map((p) => {
      const inCart = session.cart.includes(p.slug);
      const testId = inCart ? `remove-${p.slug}` : `add-to-cart-${p.slug}`;
      const label = inCart ? 'Remove' : 'Add to cart';
      const action = inCart ? '/cart/remove' : '/cart/add';
      return `
<div class="item" data-test="inventory-item">
  <div data-test="inventory-item-name">${esc(p.name)}</div>
  <div data-test="inventory-item-price">$${p.price.toFixed(2)}</div>
  <form method="post" action="${action}">
    <input type="hidden" name="slug" value="${esc(p.slug)}">
    <button type="submit" data-test="${esc(testId)}">${label}</button>
  </form>
</div>`;
    })
    .join('');
  const options = [
    ['az', 'Name (A to Z)'],
    ['za', 'Name (Z to A)'],
    ['lohi', 'Price (low to high)'],
    ['hilo', 'Price (high to low)'],
  ]
    .map(
      ([value, text]) =>
        `<option value="${value}"${value === sort ? ' selected' : ''}>${text}</option>`,
    )
    .join('');
  const sortLabel = hasDefect('a11y-select-unlabelled') ? '' : ' aria-label="Sort products"';
  return layout(`${header(session)}
<span data-test="title">Products</span>
<select data-test="product-sort-container"${sortLabel} onchange="location.search = '?sort=' + this.value">${options}</select>
${items}`);
};

const cartItems = (session) =>
  session.cart
    .map((slug) => PRODUCTS.find((p) => p.slug === slug))
    .filter(Boolean)
    .map(
      (p) => `
<div class="item" data-test="inventory-item">
  <div data-test="inventory-item-name">${esc(p.name)}</div>
  <div>$${p.price.toFixed(2)}</div>
</div>`,
    )
    .join('');

const cartPage = (session) =>
  layout(`${header(session)}
<span data-test="title">Your Cart</span>
${cartItems(session)}
<p><a data-test="checkout" href="/checkout-step-one.html">Checkout</a></p>`);

const checkoutOnePage = (session, error) =>
  layout(`${header(session)}
<span data-test="title">Checkout: Your Information</span>
<form method="post" action="/checkout-step-one.html">
  <div><input data-test="firstName" name="firstName" placeholder="First Name"></div>
  <div><input data-test="lastName" name="lastName" placeholder="Last Name"></div>
  <div><input data-test="postalCode" name="postalCode" placeholder="Zip/Postal Code"></div>
  <input data-test="continue" type="submit" value="Continue">
</form>
${error ? `<h3 data-test="error" role="alert">${esc(error)}</h3>` : ''}`);

const checkoutTwoPage = (session) =>
  layout(`${header(session)}
<span data-test="title">Checkout: Overview</span>
${cartItems(session)}
<form method="post" action="/checkout-complete.html">
  <button data-test="finish" type="submit">Finish</button>
</form>`);

const completePage = (session) =>
  layout(`${header(session)}
<span data-test="title">Checkout: Complete!</span>
<h2 data-test="complete-header">${
    hasDefect('wrong-confirmation-text') ? 'Order received' : 'Thank you for your order!'
  }</h2>`);

const validateCheckout = (form) => {
  if (!form.get('firstName') && !hasDefect('checkout-no-validation')) {
    return 'Error: First Name is required';
  }
  if (!form.get('lastName') && !hasDefect('no-lastname-validation')) {
    return 'Error: Last Name is required';
  }
  if (!form.get('postalCode')) return 'Error: Postal Code is required';
  return null;
};

const handleLogin = (form) => {
  const username = form.get('username') || '';
  const password = form.get('password') || '';
  if (!username) return { error: 'Epic sadface: Username is required' };
  if (!password) return { error: 'Epic sadface: Password is required' };
  const user = Object.hasOwn(USERS, username) ? USERS[username] : undefined;
  if (!user || password !== PASSWORD) {
    return { error: 'Epic sadface: Username and password do not match any user in this service' };
  }
  if (user.locked && !hasDefect('locked-user-can-login')) {
    return { error: 'Epic sadface: Sorry, this user has been locked out.' };
  }
  return { username };
};

/** Bearer token -> username. API tokens are separate from browser sessions. */
const tokens = new Map();
/** order id -> { id, owner, items, total } */
const orders = new Map();
let nextOrderId = 1;

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const sendNoContent = (res) => {
  res.writeHead(204);
  res.end();
};
const sendError = (res, status, error, message) => sendJson(res, status, { error, message });

const apiProduct = (product, index) => {
  const body = { id: index + 1, name: product.name, price: product.price };
  if (hasDefect('api-missing-field')) delete body.price;
  return body;
};

const apiOrder = (order) => ({
  id: order.id,
  status: 'created',
  items: order.items,
  total: order.total,
});

const validateOrder = (body) => {
  if (!body || typeof body !== 'object' || !Array.isArray(body.items) || body.items.length === 0) {
    return 'items must be a non-empty array';
  }
  for (const item of body.items) {
    if (!item || !Number.isInteger(item.productId) || !PRODUCTS[item.productId - 1]) {
      return 'every item needs a known productId';
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return 'quantity must be an integer from 1 to 99';
    }
  }
  return null;
};

const handleApi = async (req, res, url) => {
  const path = url.pathname;
  const method = req.method || 'GET';

  if (method === 'POST' && path === '/api/auth/token') {
    const body = await readJson(req);
    if (!body || typeof body !== 'object') {
      return sendError(res, 400, 'invalid_json', 'Body must be a JSON object');
    }
    const { username, password } = body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return sendError(res, 400, 'validation_error', 'username and password are required');
    }
    const user = Object.hasOwn(USERS, username) ? USERS[username] : undefined;
    if (!user || password !== PASSWORD) {
      return sendError(res, 401, 'invalid_credentials', 'Unknown user or wrong password');
    }
    if (user.locked && !hasDefect('locked-user-can-login')) {
      return sendError(res, 403, 'locked_out', 'This user has been locked out');
    }
    const token = crypto.randomUUID();
    tokens.set(token, username);
    const response = { token, expiresIn: 3600 };
    if (hasDefect('api-token-leaks-password')) response.password = password;
    return sendJson(res, 200, response);
  }

  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  const user = bearer ? tokens.get(bearer[1]) : undefined;
  const openProducts =
    method === 'GET' && path.startsWith('/api/products') && hasDefect('api-no-auth-products');
  if (!user && !openProducts) {
    return sendError(res, 401, 'unauthorized', 'A valid bearer token is required');
  }

  if (method === 'GET' && path === '/api/products') {
    return sendJson(res, 200, { products: PRODUCTS.map(apiProduct) });
  }

  const productMatch = /^\/api\/products\/(\d+)$/.exec(path);
  if (method === 'GET' && productMatch) {
    const index = Number(productMatch[1]) - 1;
    const product = PRODUCTS[index];
    if (!product) return sendError(res, 404, 'not_found', 'Product not found');
    return sendJson(res, 200, apiProduct(product, index));
  }

  if (method === 'POST' && path === '/api/orders') {
    const body = await readJson(req);
    const problem = validateOrder(body);
    if (problem) return sendError(res, 400, 'validation_error', problem);
    const items = body.items.map(({ productId, quantity }) => ({ productId, quantity }));
    const sum = items.reduce((total, item) => {
      const quantity = hasDefect('api-total-wrong') ? 1 : item.quantity;
      return total + PRODUCTS[item.productId - 1].price * quantity;
    }, 0);
    const order = { id: nextOrderId++, owner: user, items, total: Math.round(sum * 100) / 100 };
    orders.set(order.id, order);
    return sendJson(res, hasDefect('api-wrong-status-create') ? 200 : 201, apiOrder(order));
  }

  const orderMatch = /^\/api\/orders\/(\d+)$/.exec(path);
  if (orderMatch) {
    const order = orders.get(Number(orderMatch[1]));
    const visible = Boolean(order) && (order.owner === user || hasDefect('api-order-idor'));
    if (method === 'GET') {
      if (!visible) return sendError(res, 404, 'not_found', 'Order not found');
      return sendJson(res, 200, apiOrder(order));
    }
    if (method === 'DELETE') {
      if (!visible) {
        if (hasDefect('api-delete-always-204')) return sendNoContent(res);
        return sendError(res, 404, 'not_found', 'Order not found');
      }
      orders.delete(order.id);
      return sendNoContent(res);
    }
  }

  return sendError(res, 404, 'not_found', 'Unknown API route');
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method || 'GET';

    if (path.startsWith('/api/')) return await handleApi(req, res, url);

    if (method === 'GET' && path === '/') {
      const from = url.searchParams.get('from');
      return send(
        res,
        200,
        loginPage(
          from ? `Epic sadface: You can only access '${from}' when you are logged in.` : '',
        ),
      );
    }

    if (method === 'POST' && path === '/login') {
      const result = handleLogin(await readForm(req));
      if (result.error) return send(res, 200, loginPage(result.error));
      if (hasDefect('flaky-login') && ++loginCount % 3 === 0) {
        return send(res, 200, loginPage('Epic sadface: Something went wrong, please try again'));
      }
      const token = crypto.randomUUID();
      sessions.set(token, { user: result.username, cart: [], shipping: null });
      return redirect(res, '/inventory.html', {
        'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax`,
      });
    }

    if (method === 'GET' && path === '/logout') {
      if (hasDefect('logout-keeps-session')) return redirect(res, '/');
      sessions.delete(parseCookies(req.headers.cookie).session);
      return redirect(res, '/', { 'Set-Cookie': 'session=; Path=/; Max-Age=0' });
    }

    if (PROTECTED.has(path) || path.startsWith('/cart/')) {
      let session = getSession(req);
      if (!session && path === '/inventory.html' && hasDefect('skip-auth-inventory')) {
        session = { user: null, cart: [], shipping: null };
      }
      if (!session) {
        return redirect(res, `/?from=${encodeURIComponent(path)}`);
      }

      if (method === 'GET' && path === '/inventory.html') {
        return send(res, 200, inventoryPage(session, url.searchParams.get('sort') || 'az'));
      }
      if (method === 'GET' && path === '/cart.html') return send(res, 200, cartPage(session));
      if (method === 'POST' && path === '/cart/add') {
        const slug = (await readForm(req)).get('slug');
        if (slug && PRODUCTS.some((p) => p.slug === slug) && !session.cart.includes(slug)) {
          session.cart.push(slug);
        }
        return redirect(res, '/inventory.html');
      }
      if (method === 'POST' && path === '/cart/remove') {
        const slug = (await readForm(req)).get('slug');
        session.cart = session.cart.filter((s) => s !== slug);
        return redirect(res, '/inventory.html');
      }
      if (method === 'GET' && path === '/checkout-step-one.html') {
        return send(res, 200, checkoutOnePage(session, ''));
      }
      if (method === 'POST' && path === '/checkout-step-one.html') {
        const form = await readForm(req);
        const error = validateCheckout(form);
        if (error) return send(res, 200, checkoutOnePage(session, error));
        session.shipping = Object.fromEntries(form);
        return redirect(res, '/checkout-step-two.html');
      }
      if (method === 'GET' && path === '/checkout-step-two.html') {
        return send(res, 200, checkoutTwoPage(session));
      }
      if (method === 'POST' && path === '/checkout-complete.html') {
        session.cart = [];
        return redirect(res, '/checkout-complete.html');
      }
      if (method === 'GET' && path === '/checkout-complete.html') {
        return send(res, 200, completePage(session));
      }
    }

    return send(res, 404, layout('<h1>Not found</h1>'));
  } catch (error) {
    console.error(error);
    return send(res, 500, layout('<h1>Server error</h1>'));
  }
});

server.listen(PORT, () => {
  const active = DEFECTS.size ? ` with defects: ${[...DEFECTS].join(', ')}` : '';
  console.log(`Target app listening on http://localhost:${PORT}${active}`);
});
