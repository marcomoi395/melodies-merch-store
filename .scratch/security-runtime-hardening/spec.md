# Security and Runtime Hardening

Status: ready-for-agent

## Problem Statement

As a Melodies Merch Store shopper, my order contact and delivery information must not be readable by someone who only knows an order UUID. As an account holder, I need account-verification and password-reset email links to open a usable flow. As an operator, the API must start cleanly with deliberate browser access and API documentation behavior rather than emitting predictable runtime errors or exposing every origin by default.

## Solution

Protect shopper order detail with the authenticated shopper identity, make account email links target the configured customer application rather than incompatible backend POST endpoints, invalidate sessions after a password credential changes, and make CORS and Swagger startup behavior explicit configuration. Prove all behavior through the existing disposable PostgreSQL production HTTP compatibility suite, with focused unit tests only for generated email and session side effects.

## User Stories

1. As a signed-in shopper, I want to read only my own order details, so that my contact, address, payment, and item data stay private.
2. As an unauthenticated visitor, I want an order-detail UUID to reveal nothing, so that checkout identifiers are not bearer credentials.
3. As a signed-in shopper, I want another shopper's order UUID to behave as unavailable, so that ownership cannot be enumerated.
4. As a Super Admin with the existing order-view permission, I want to inspect any order through the administration route, so that fulfillment continues to work.
5. As a guest shopper, I want order creation to remain available, so that authentication is not required for checkout.
6. As a guest shopper, I want the creation response to remain my confirmation source, so that no insecure guest order lookup is introduced.
7. As an account holder, I want verification email links to open the customer application flow with the token, so that I can complete verification through the documented POST API.
8. As an account holder, I want password-reset email links to open the customer application flow with the token, so that I can safely provide a new password through the documented POST API.
9. As an account holder changing a password, I want every previously issued refresh session revoked, so that a stolen session cannot survive the credential change.
10. As an account holder resetting a password, I want every previously issued refresh session revoked, so that recovery ends unauthorized access.
11. As a user requesting a password reset, I want the same accepted response whether or not my email is registered, so that the API does not disclose account existence.
12. As an operator, I want CORS to allow only configured client origins, so that arbitrary websites cannot make credential-bearing browser requests.
13. As an operator, I want startup to either serve a valid API document intentionally or skip documentation quietly, so that a missing file does not create a recurring production error.
14. As a maintainer, I want the documented configuration template and runtime validation to match all required public URLs and security settings, so that deployment failures are deterministic.
15. As a maintainer, I want security regressions asserted through the production Nest HTTP seam, so that guards, serialization, persistence, and configuration behavior are exercised together.

## Implementation Decisions

- Keep guest order creation and order preview public. Do not add a guest order-detail endpoint or treat an order UUID as authorization.
- Require JWT authentication for shopper order detail and fetch it by both order ID and authenticated user ID. Return the existing not-found behavior for absent or non-owned orders; do not disclose which case occurred.
- Keep Super Admin order detail and fulfillment status workflows on their existing permission-protected administration routes.
- Change account verification and reset mail links to use one explicit customer-application base URL configuration. The link carries only the existing opaque token; the customer application submits that token to the current POST API endpoint. Do not add GET mutation endpoints.
- Make the customer-application URL required in runtime configuration and document it in the environment template. Keep API URL configuration only for API-specific uses.
- Revoke all Redis refresh-token whitelist entries after both authenticated password change and password reset. Preserve the current one-time reset and verification token semantics.
- Return the same successful forgot-password response for known and unknown addresses. Do not send email, create a reset token, or expose rate-limit details for an unknown address.
- Replace unrestricted CORS with a parsed, configured allowlist. Development must be explicitly represented in configuration rather than inferred from a wildcard production policy.
- Do not load Swagger from a nonexistent working-directory file. Use a checked-in valid document or generate the document from Nest metadata, then expose it only when explicitly enabled by configuration. Keep failure to configure documentation non-fatal and quiet.
- Preserve existing API response envelopes and published endpoint paths except that unauthenticated or non-owner shopper order-detail requests become unauthorized or unavailable as specified above.

## Testing Decisions

- A good test uses observable HTTP status and response data, generated email context, or Redis session state; it does not assert decorator placement, repository call shapes, or private helper calls.
- Extend the disposable PostgreSQL API compatibility suite with two shopper sessions: no token cannot read an order, the owner can read it, a different shopper cannot read it, and the authorized administrator can still read it through the admin route.
- Extend the same suite to verify guest creation still succeeds but does not create a public read capability.
- Add focused service tests for reset and change-password revocation, known/unknown reset response parity, and customer-application email URLs carrying the generated token.
- Add application-bootstrap or configuration tests for CORS allowlist handling and Swagger behavior when documentation is disabled or enabled.
- Reuse the existing isolated migration, seed, Redis mock, and production Nest application harness. No controller mocks or test-only authorization bypasses.
- Run unit, API compatibility E2E, database, build, typecheck, lint, and formatting checks.

## Out of Scope

- A guest order tracking or recovery feature, email delivery-provider integration, payment-provider changes, new roles or permissions, a frontend implementation, rate limiting for every API route, or a general authorization redesign.
- Returning a distinct error that confirms another shopper owns an order.
- Rewriting all API documentation beyond restoring reliable startup and the current published routes.

## Further Notes

- The current public shopper order-detail response includes email, full name, phone, shipping address, payment method, note, totals, and purchased items; its UUID must never authorize access.
- The current email templates use links to backend paths that accept POST bodies, so browser navigation cannot complete either flow without a customer application route.
- The repository README advertises an `openapi.yaml`, but no tracked file exists; startup currently catches and logs this error on every boot.
