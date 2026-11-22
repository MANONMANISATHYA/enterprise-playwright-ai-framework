Requirements for the demo shop
Each requirement has an id such as REQ-001 and numbered acceptance criteria such as AC1.
The AI test generation reads this format. The criteria are the source of truth: every generated
test case must point back to one of them. Markdown markers (## and -) are allowed but not needed.
REQ-001: Login
AC1: A standard user who enters valid credentials reaches the product list.
AC2: A locked-out user is rejected with an error message.
AC3: A wrong password shows an error message and does not sign the user in.
AC4: Submitting the form with an empty username is rejected with an error message.
AC5: Protected pages cannot be opened without signing in.
REQ-002: Checkout
AC1: A signed-in user with an item in the cart can complete an order and sees a confirmation.
AC2: Checkout is rejected with an error message when the first name is empty.
AC3: Checkout is rejected with an error message when the last name is empty.
REQ-003: Orders API
AC1: Creating an order with a valid token returns status 201 and an order whose total equals price times quantity.
AC2: Creating an order without a token is rejected with status 401.
AC3: An order with no items is rejected with status 400.
AC4: A user cannot read an order that belongs to another user.
AC5: Deleting an order removes it, so fetching it afterwards returns status 404.
