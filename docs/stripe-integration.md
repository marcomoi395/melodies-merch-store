# Stripe Checkout — test environment

COD and MoMo remain available. `paymentMethod: "STRIPE"` creates a hosted Stripe Checkout session for card payments in VND. No frontend SDK or publishable key is needed: card details are entered on Stripe's page. This integration accepts only `sk_test_...` keys, test sessions and test webhook events.

## Configuration

Backend `.env` (also listed in `.env.example`):

```dotenv
STRIPE_ENVIRONMENT=test
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Set `STRIPE_SECRET_KEY` to the secret key from your Stripe sandbox/test Dashboard. Set `STRIPE_WEBHOOK_SECRET` to the signing secret for the webhook endpoint, or the secret printed by Stripe CLI for local forwarding. Keep both on the backend; never commit them or put them in `VITE_*` variables.

`CUSTOMER_APP_URL` must point to the storefront the browser should return to. For local testing, use the actual Vite URL, for example `http://localhost:5173`; include that origin in `CORS_ORIGINS`. Restart the backend after editing `.env`.

Forward local webhooks while testing:

```sh
stripe login
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/payment/stripe/webhook
```

Copy the printed `whsec_...` value into `.env`, then restart the backend. CLI and backend must use the same Stripe sandbox/account. For a hosted environment, register `https://<backend-host>/api/payment/stripe/webhook` in the Stripe Dashboard with the same two event types; use that endpoint's signing secret instead of the CLI secret.

## HTTP contract

| Method | Endpoint                                 | Purpose                                                                                                       |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/order`                             | `paymentMethod: "STRIPE"` returns `paymentId` and `paymentUrl` after the order and reservation commit.        |
| POST   | `/api/payment/stripe/webhook`            | Verify `Stripe-Signature` against original request bytes; apply settlement transactionally; return empty 204. |
| GET    | `/api/payment/stripe/<paymentId>/status` | Minimal uncached payment status; authenticated Stripe API reconciliation when pending.                        |

Checkout success and cancel URLs both return to `/payment/result?payment=<paymentId>&provider=stripe`. Browser query parameters never confirm payment. Treat payment UUIDs and result URLs as private capabilities; the status endpoint returns no customer information or credentials.

The backend uses Stripe's HTTPS REST API with a pinned API version and Node's built-in HMAC verification. VND is zero-decimal: `150000` VND is sent as `unit_amount=150000`, not multiplied by 100. This checkout accepts integer totals from 12,000 to 99,999,999 VND; Stripe can impose further account-specific limits.

## Settlement and recovery

Checkout parameters and payment UUID are persisted before contacting Stripe. Retries use the same stored body and `Idempotency-Key`, preventing duplicate sessions on timeout. Checkout expires 24 hours after preparation. Unknown creation results retain the reservation; the result page polls every five seconds and the backend reconciles up to 20 pending payments per minute. Creation retries stop after 23 hours to stay within Stripe's idempotency retention. An older attempt with no known session ID requires staff investigation; it is never silently retried or canceled.

Only a verified session with matching test mode, currency, total, payment/order metadata and session identity can settle. A complete, paid session marks payment `SUCCESS` and order `PROCESSING`. An expired, unpaid session marks payment `FAILED`, cancels the order, restores stock and decreases voucher usage once. Duplicate or out-of-order notifications cannot repeat compensation or undo success. A late payment after stock release is recorded with `requiresReview: true`; fulfillment is blocked for staff review.

A declined card or the browser's Back button does not expire the session: it stays pending and can be retried on the same Checkout page until expiry. Staff/customer order endpoints cannot bypass gateway confirmation to fulfill or cancel an unpaid Stripe order. Automatic refunds and alternative Stripe payment methods are outside this card checkout.

## Manual test

1. Set both test secrets, start webhook forwarding, restart backend, start frontend.
2. Choose **Thẻ qua Stripe (test)** and submit an order. Check that Checkout shows the correct VND total.
3. Use `4242 4242 4242 4242`, any future expiry and three-digit CVC. Confirm the return page reports success and the order becomes `PROCESSING`.
4. Use `4000 0000 0000 0002` for a declined card or `4000 0025 0000 3155` for authentication. A declined attempt remains pending; retry with a successful card on the same session.
5. Close the browser after payment: the webhook or background reconciliation must still settle the order. Reopen its private result URL.
6. Expire an unpaid session from Stripe's test API/CLI (`stripe checkout sessions expire <SESSION_ID>`). Verify canceled status and one stock/voucher release; replay the real webhook and verify no additional release.
7. Check COD and MoMo still work.

Automated tests mock Stripe HTTP and database repositories, covering immutable requests, test-only credentials, currency units, signature checks, mismatched sessions, duplicate settlement, expiry compensation, late-payment review, API reconciliation and real local HTTP webhook parsing. Frontend tests cover all three payment selections and both providers' result states. A real Stripe test transaction and PostgreSQL settlement require your actual test credentials and running database.

References: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [Webhook signature verification](https://docs.stripe.com/webhooks/signature), [Idempotent requests](https://docs.stripe.com/api/idempotent_requests), [Currencies](https://docs.stripe.com/currencies), [Testing cards](https://docs.stripe.com/testing).
