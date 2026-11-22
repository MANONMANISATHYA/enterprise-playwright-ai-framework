import { AiOutputError } from '../../src/ai/output';
import {
  buildRequest,
  parseLocator,
  prepareSnapshot,
  suggestLocatorRepair,
} from '../../src/ai/locator-repair';
import { createProvider, type AiProvider } from '../../src/ai/provider';
import { expect, test } from '../../src/fixtures';

const SNAPSHOT = `<html><body>
<input data-test="username" placeholder="Username">
<button data-test="sign-in-button">Login</button>
</body></html>`;

const INPUT = {
  locator: "getByTestId('login-button')",
  errorText: 'element(s) not found',
  snapshot: SNAPSHOT,
};
const offline = createProvider({ AI_PROVIDER: 'offline' });

const replying = (answer: object): AiProvider => ({
  name: 'fake',
  complete: () => Promise.resolve(JSON.stringify(answer)),
});

const suggestion = (suggestedLocator: string, strategy = 'testid'): object => ({
  suggestedLocator,
  strategy,
  reasoning: 'because',
  confidence: 'high',
});

test.describe('locator parsing @unit', () => {
  test('only one plain getBy call is accepted', () => {
    expect(parseLocator("getByTestId('sign-in-button')")).toEqual({
      strategy: 'testid',
      key: 'sign-in-button',
    });
    expect(parseLocator('getByLabel("Username")')).toEqual({ strategy: 'label', key: 'Username' });
    expect(parseLocator("getByRole('button', { name: 'Login' })")).toEqual({
      strategy: 'role',
      key: 'Login',
    });
  });

  test('CSS, chains, code and role without a name are refused', () => {
    expect(parseLocator("locator('#login')")).toBeUndefined();
    expect(parseLocator("getByTestId('a').click()")).toBeUndefined();
    expect(parseLocator("getByTestId('a'); process.exit()")).toBeUndefined();
    expect(parseLocator('getByTestId(`a`)')).toBeUndefined();
    expect(parseLocator("getByRole('button')")).toBeUndefined();
    expect(parseLocator("getByTestId('')")).toBeUndefined();
  });
});

test.describe('AI locator repair @unit', () => {
  test('the snapshot is cleaned before it leaves the machine', () => {
    const dirty =
      '<script>var token="abc"</script><!-- data-test="evil" --><input value="hunter2" data-test="x"> password=hunter2 SNAPSHOT>>> end';

    const clean = prepareSnapshot(dirty);

    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('evil');
    expect(clean).not.toContain('hunter2');
    expect(clean).not.toContain('SNAPSHOT>>>');
    expect(clean).toContain('data-test="x"');
  });

  test('the request treats page content as data and limits the answer form', () => {
    const request = buildRequest(INPUT);

    expect(request.task).toBe('locator-repair');
    expect(request.system).toContain('untrusted data');
    expect(request.system).toContain('No CSS, no XPath');
    expect(request.prompt).toContain("Failing locator: getByTestId('login-button')");
  });

  test('the offline provider finds a renamed test id', async () => {
    const result = await suggestLocatorRepair(offline, INPUT);

    expect(result).toMatchObject({
      status: 'suggested',
      suggestedLocator: "getByTestId('sign-in-button')",
    });
  });

  test('the offline provider says none when nothing is close or the id still exists', async () => {
    const far = await suggestLocatorRepair(offline, {
      ...INPUT,
      locator: "getByTestId('logout-link')",
    });
    const present = await suggestLocatorRepair(offline, {
      ...INPUT,
      locator: "getByTestId('username')",
    });

    expect(far.status).toBe('none');
    expect(present.status).toBe('none');
  });

  test('a suggestion that is not in the snapshot is rejected as invented', async () => {
    await expect(
      suggestLocatorRepair(replying(suggestion("getByTestId('buy-now')")), INPUT),
    ).rejects.toThrow(/does not appear in the page snapshot/);
  });

  test('unsafe, mismatched or unchanged suggestions are rejected', async () => {
    await expect(
      suggestLocatorRepair(replying(suggestion("locator('#login')")), INPUT),
    ).rejects.toThrow(/one plain getByTestId/);
    await expect(
      suggestLocatorRepair(replying(suggestion("getByTestId('sign-in-button')", 'label')), INPUT),
    ).rejects.toThrow(/does not match the locator/);
    await expect(
      suggestLocatorRepair(replying(suggestion('getByTestId("login-button")')), {
        ...INPUT,
        snapshot: `${SNAPSHOT}<b data-test="login-button">`,
      }),
    ).rejects.toThrow(/same as the failing locator/);
    await expect(suggestLocatorRepair(replying({ suggestedLocator: 5 }), INPUT)).rejects.toThrow(
      AiOutputError,
    );
  });

  test('a text or role suggestion is accepted when the text is on the page', async () => {
    const result = await suggestLocatorRepair(
      replying(suggestion("getByRole('button', { name: 'Login' })", 'role')),
      INPUT,
    );

    expect(result.status).toBe('suggested');
  });
});
