Type: task
Status: ready-for-agent

## Goal

Remove customer account functionality from the storefront. Make guest checkout the only customer purchase flow. Add public shipment lookup through email or phone. Preserve admin-only authentication and admin backend APIs without building admin UI.

## Scope

- Remove customer login, registration, password recovery, verification, profile, password change, account navigation, customer order history, customer order detail, and customer cancellation UI.
- Keep guest cart and guest `POST /order` checkout.
- Keep admin/staff authentication and reject customer users from admin login.
- Add a minimal public `POST /order/track` lookup using exact normalized email or phone.
- Return matching guest order summaries newest first with status, tracking code, totals, and minimal contact/delivery information.
- Add loading, validation, error, empty, retry, and responsive tracking states.
- Add Playwright flow: browse -> cart -> guest checkout -> tracking lookup.

## Acceptance Criteria

- Customer can complete checkout without a bearer token or account.
- Customer-facing auth routes and links are absent; public customer registration and recovery endpoints are disabled or removed.
- Existing admin/staff login remains functional; customer users cannot obtain admin sessions.
- Tracking accepts valid email or phone, does not require login, and does not expose full order details.
- No-match lookup returns a safe empty result without account enumeration details.
- Multiple matches are newest first.
- Tracking shows status and tracking code when available.
- Guest order data remains private enough for the public contract; rate limiting/response minimization is applied before production release.
- Admin UI is not added.

## Testing Notes

Use the backend production HTTP compatibility seam for guest order creation, tracking match/no-match/validation/minimal response, and admin-only authentication. Use frontend Vitest/jsdom for route removal and tracking states. Add one Playwright guest customer journey; no admin browser flow.

## Blocked by

None.
