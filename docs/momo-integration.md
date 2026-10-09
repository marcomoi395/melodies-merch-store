# MoMo wallet integration

Researched 2026-10-06 against MoMo's official developer documentation. Documentation version `v3` describes gateway API endpoints under `/v2/gateway/api/`.

## Gateway configuration

Use `https://test-payment.momo.vn` for sandbox, `https://payment.momo.vn` for production. Requests use POST and `Content-Type: application/json; charset=UTF-8`. Configure a timeout of at least 30 seconds. MoMo supplies separate `partnerCode`, `accessKey`, and `secretKey` credentials per environment; keep credentials on the backend. [Integration process](https://developers.momo.vn/v3/vi/docs/payment/onboarding/integration-process/)

## Create payment

POST `/v2/gateway/api/create` with `partnerCode`, unique `requestId`, unique `orderId`, `orderInfo`, `amount`, `redirectUrl`, `ipnUrl`, `requestType: "captureWallet"`, `extraData`, `lang`, and `signature`. Set `autoCapture: true` for the ordinary one-step checkout. `extraData` may be `""`; otherwise use Base64-encoded JSON. `lang` is `vi` or `en`. The response provides `resultCode`, `payUrl`, identifiers, and amount. A successful create response creates a checkout URL; it does not prove the customer has paid. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)

`amount` is an integer amount in VND, minimum 1,000, maximum 50,000,000. `requestId` is limited to 50 characters; `orderInfo` to 255; `extraData` to 1,000. Although the create table calls `orderId` String(200), the integration guide requires at most 64 bytes, unpredictability, uniqueness, and no sensitive user information. A UUID fits both constraints. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [Integration process](https://developers.momo.vn/v3/vi/docs/payment/onboarding/integration-process/)

Calculate the lowercase hexadecimal HMAC-SHA256 with `secretKey` over this exact ordered string, using the actual values without URL-encoding:

```text
accessKey={accessKey}&amount={amount}&extraData={extraData}&ipnUrl={ipnUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={partnerCode}&redirectUrl={redirectUrl}&requestId={requestId}&requestType=captureWallet
```

The documentation's signature examples show 64 hexadecimal characters. `accessKey` participates in the signature; the documented request example does not include it in the JSON body. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)

Treat `payUrl` as untrusted data at the redirect boundary: require HTTPS and the configured gateway hostname (`test-payment.momo.vn` in sandbox; `payment.momo.vn` in production), with no username/password. The docs establish these gateway domains and show a sandbox `payUrl` on that hostname; they do not publish an exhaustive list of alternative payment URL hosts. The allowlist is an implementation recommendation. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [Integration process](https://developers.momo.vn/v3/vi/docs/payment/onboarding/integration-process/)

Persist the payment attempt before contacting MoMo. Keep its MoMo `orderId` and create `requestId` separate from the store order ID. `requestId` acts as an idempotency key for POST requests, retained for 31 days; MoMo recommends UUID v4. Retry the same uncertain request with the same identifiers and payload, or query its existing order; avoid immediately creating another payment attempt after a network timeout. [Idempotency](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/idempotency/)

## IPN and redirect

MoMo redirects the browser with GET query parameters to `redirectUrl`. Independently, it POSTs JSON transaction data to `ipnUrl`. The documented notification fields include `partnerCode`, `orderId`, `requestId`, `amount`, `orderInfo`, `orderType`, `transId`, `resultCode`, `message`, `payType`, `responseTime`, `extraData`, and `signature`. [Notifications](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/), [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)

Verify the notification HMAC-SHA256 using this exact string:

```text
accessKey={accessKey}&amount={amount}&extraData={extraData}&message={message}&orderId={orderId}&orderInfo={orderInfo}&orderType={orderType}&partnerCode={partnerCode}&payType={payType}&requestId={requestId}&responseTime={responseTime}&resultCode={resultCode}&transId={transId}
```

Compare the signature with a constant-time comparison. Validate payload types, then match `partnerCode`, `orderId`, `amount`, and the stored create `requestId` against the persisted attempt. Apply an idempotent state update transactionally; a duplicate notification must not decrement stock, create another order, or fulfill twice. Signature validation and matching stored partner/order/amount are explicit MoMo requirements; transactional idempotency and constant-time comparison are implementation recommendations. [Notifications](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/), [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)

Acknowledge a valid, durably processed notification with **HTTP 204, empty body, within 15 seconds**. IPN exists specifically because the customer may close the browser or never return successfully. Browser redirects should display backend payment state, trigger reconciliation when needed, and never alone authorize fulfillment. [Notifications](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/)

## Query and reconciliation

POST `/v2/gateway/api/query` with `partnerCode`, a fresh unique `requestId` for the query, the payment attempt's `orderId`, `lang`, and `signature`. Sign:

```text
accessKey={accessKey}&orderId={orderId}&partnerCode={partnerCode}&requestId={requestId}
```

The response includes `partnerCode`, query `requestId`, `orderId`, `amount`, `transId`, `resultCode`, `message`, `responseTime`, `extraData`, and `payType`. The query response contract does **not** document a response signature. Validate returned identifiers and amount against the attempt before updating it; rely on the authenticated server-to-server HTTPS request. Use query after uncertain creation, a browser return without IPN, or delayed notification. [Query](https://developers.momo.vn/v3/vi/docs/payment/api/payment-api/query/)

## Result codes

| Code                                           | Meaning                                                                   | Store handling                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `0`                                            | Successful                                                                | Mark the verified payment paid.                                          |
| `1000`                                         | Initialized, waiting for customer                                         | Keep pending.                                                            |
| `7000`, `7002`                                 | Processing                                                                | Keep pending; reconcile later.                                           |
| `9000`                                         | Authorized                                                                | Keep pending until confirmed captured; see ambiguity below.              |
| `1001`, `1002`, `1004`, `1007`                 | Insufficient funds, issuer rejection, limit exceeded, account unavailable | Payment failed.                                                          |
| `1003`, `1006`, `1017`                         | Canceled, customer rejected, partner canceled                             | Payment failed/canceled.                                                 |
| `1005`                                         | Payment URL/QR expired                                                    | Payment expired; new attempt may be offered.                             |
| `40`                                           | Duplicate request ID                                                      | Reconcile existing attempt; avoid duplicate fulfillment.                 |
| `41`                                           | Duplicate order ID                                                        | Query the existing order.                                                |
| `42`                                           | Invalid/missing order ID                                                  | Investigate; this is not proof an uncertain payment cannot settle.       |
| `10`, `11`, `12`, `13`, `20`, `21`, `22`, `43` | Maintenance/access/version/authentication/request/amount/conflict errors  | Record request error; apply appropriate recovery, not a paid transition. |

The result-code page labels `9000` non-final, while saying it can be considered successful with `autoCapture=1`; notification docs distinguish it as authorization. Conservative checkout implementation should only fulfill on verified `0`, retaining `9000` pending for reconciliation. Do not translate every nonzero query code into a terminal failed store order: several codes explicitly represent pending or request errors. [Result codes](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/resultcode/), [Notifications](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/)

Compensation recommendation: release an attempt's inventory reservation after a verified terminal payment failure, or an explicit create validation/authentication rejection when no earlier send of that attempt had an ambiguous outcome. Network timeout, HTTP 5xx, malformed response, create duplicate/conflict errors, and query `42` after an uncertain create should keep the attempt recoverable. The docs do not establish that a single not-found query proves an earlier timed-out create can never settle. A late verified success must still be handled, including after a failed-looking response. Request failure and customer payment failure are separate states. [Result codes](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/resultcode/), [Idempotency](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/idempotency/)

## Recommended minimum flow

1. Backend validates checkout, computes the trusted VND total, persists order/payment attempt, creates signed MoMo checkout with `autoCapture: true`, returns `payUrl`.
2. Browser navigates to `payUrl`; customer pays through MoMo.
3. Public backend IPN verifies signature and attempt identity, updates payment/order atomically, acknowledges HTTP 204.
4. Return page reads backend state. If unresolved, backend queries MoMo with a signed server request; only verified success fulfills the order.
5. Pending attempts remain recoverable after browser closure, API timeout, or late IPN. Keep successful attempts immutable against stale failure callbacks; allow a verified late success to be reconciled rather than discarded.

Steps above combine MoMo's create, notification, query, and idempotency contracts; persistence/state rules are implementation recommendations. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [Notifications](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/), [Query](https://developers.momo.vn/v3/vi/docs/payment/api/payment-api/query/), [Idempotency](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/idempotency/)

## Documentation caveats

- The create response signature formula literally reads `accessKey=$accessKey&amount=$amount&orderId=$orderId&partnerCode=$partnerCode&payUrl=&payUrl&requestId=$requestId&responseTime=$responseTime&resultCode=$resultCode`. It has a visible typo (`payUrl=&payUrl`); the example response omits a signature. Do not invent an obligatory response signature format from that typo. The IPN and query request signature formulas are explicit. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)
- `qrCodeUrl` is QR payload data, not an image URL. Production access to `qrCodeUrl`, `deeplink`, and `deeplinkMiniApp` requires MoMo permission; ordinary website checkout can use `payUrl`. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)
- Sandbox payment requires the MoMo test app/test account; production rollout requires MoMo's business verification and UAT process. Credentials and a publicly reachable notification endpoint must be configured before real end-to-end validation. [Wallet checkout](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [Integration process](https://developers.momo.vn/v3/vi/docs/payment/onboarding/integration-process/)

## Setup in this repository

The local ignored `.env` uses the public sandbox sample keys from [MoMo's Node.js example](https://github.com/momo-wallet/payment/blob/master/nodejs/MoMo.js). A direct `captureWallet` create request returned `resultCode: 0` and a `test-payment.momo.vn` checkout URL on 2026-10-06. These keys are shared demonstration credentials; use only test data. This verifies payment creation, not a completed wallet transaction or IPN delivery.

No database migration or new package is needed: payment attempts use the existing `transactions` table. COD continues to work without MoMo credentials.

Configure these backend environment variables (see `.env.example`):

```dotenv
MOMO_ENVIRONMENT=sandbox
MOMO_PARTNER_CODE=<sandbox merchant partner code>
MOMO_ACCESS_KEY=<sandbox access key>
MOMO_SECRET_KEY=<sandbox secret key>
API_URL=https://your-public-host/api
CUSTOMER_APP_URL=https://your-public-host
```

`API_URL` includes the backend `/api` prefix. Both applications must use the same public deployment, or the frontend's `VITE_API_BASE_URL` must target that backend. MoMo must reach the HTTPS IPN URL from the Internet; localhost cannot receive MoMo callbacks. Restart the backend after changing environment variables. Never put merchant keys in frontend variables or commit them.

Implemented endpoints:

| Method | Endpoint                                       | Purpose                                                                                                         |
| ------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/order`                                   | `paymentMethod: "COD"` creates a COD order; `"MOMO"` returns `paymentId` and `paymentUrl`.                      |
| POST   | `/api/payment/momo/ipn`                        | Signature-verified server callback; empty HTTP 204.                                                             |
| GET    | `/api/payment/momo/return?payment=<paymentId>` | Fixed HTTP 303 redirect to storefront `/payment/result?payment=<paymentId>`. Browser result claims are ignored. |
| GET    | `/api/payment/momo/<paymentId>/status`         | Minimal payment state; no PII, no cache. UUID is a private capability; do not publish it.                       |

The frontend provides COD/MoMo radio choices, navigates to `paymentUrl`, then displays success/failure/pending using backend state. Missing checkout URL opens the result page instead of creating another order. Its pending page polls every five seconds; the backend limits gateway query claims to once per five seconds per attempt and reconciles up to 20 oldest pending attempts every minute. A pending attempt with no checkout URL and query result `42` resends the same stored request/order IDs. Server restart retains those IDs. Timeout alone does not release stock.

Verified payment success moves the order to `PROCESSING`; verified terminal failure cancels it, restores stock and voucher use exactly once. Unknown/request-error codes remain pending. A first create rejected for code `11/12/13/20/21/22` can release its reservation; subsequent uncertain attempts require reconciliation. A late verified payment after stock release is recorded as successful with `requiresReview: true`, retaining the order as `PENDING` and blocking automatic/manual fulfillment until reviewed. Staff must handle such exceptional reconciliation directly; automatic refunds are outside this checkout integration.

### Sandbox acceptance check

1. Configure the merchant sandbox keys and publicly reachable URLs above. Restart the backend.
2. Checkout with COD: no MoMo redirect; ordinary receipt appears.
3. Checkout with MoMo: verify redirect to `test-payment.momo.vn`, pay with the MoMo test app/account, verify return to `/payment/result` and confirmed success.
4. Decline payment or allow the checkout URL to expire: verify canceled result, restored stock/voucher use, retained cart. Start a fresh checkout only after the previous attempt is terminal.
5. Close the browser during payment: verify the IPN or background query still settles the attempt. Revisit the private result URL.
6. Replay an authentic IPN: stock and voucher counts must not change again. Send a modified signature or amount: reject without changing payment/order.

Automated checks cover request signatures, amount limits, unconfigured gateway, URL allowlist, forged/mismatched callbacks, duplicate settlement, failure compensation, late-success review, query reconciliation/retry, public HTTP routes, COD/MoMo selection, browser redirect, and result display. Gateway HTTP and repositories are mocked in automated tests; an actual MoMo sandbox payment and PostgreSQL settlement must be verified in the configured deployment before production use.
