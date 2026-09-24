Type: task
Status: resolved

## Goal

Restrict shopper order detail to the authenticated owner while preserving guest checkout and admin order access.

## Scope

- Protect the shopper order-detail route with JWT authentication.
- Query shopper details by order ID and authenticated user ID; return non-disclosing not-found behavior.
- Keep guest order creation and preview public.
- Preserve the permission-protected admin order detail route.
- Add production HTTP regression coverage for unauthenticated, owner, non-owner, guest-create, and admin cases.

## Blocked by

None.

## Answer

Implemented owner-scoped shopper order detail, preserved guest checkout and admin access, and added HTTP regression coverage for anonymous, owner, non-owner, guest, and admin flows.
