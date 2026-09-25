Type: task
Status: ready-for-agent

## Goal

Deliver Phase 2 store discovery: in-store artist filtering, `oldest` sorting, shareable query URLs, and explicit empty/not-found/mobile states.

## Scope

- Do not expose `/category` or `/artist` storefront pages. Keep artist selection as a main-store filter only.
- Add main-store artist (OR), original-price minimum/maximum, in-stock-only, and `oldest` discovery controls.
- Preserve filters and pagination in shareable URL query parameters.
- Distinguish loading, API error, empty results, and product-not-found states.
- Keep controls usable on mobile.

## Acceptance Criteria

- Product requests use only documented fields and encode repeated artist/type filters correctly.
- `sort=oldest`, original-price range, and `stock_status=true` reach the API and remain in the URL.
- Changing a filter resets page to `1`; pagination retains every other filter.
- `/category` and `/artist` routes are absent and show the generic not-found state.
- Search no-match, filter-empty, and invalid product routes have distinct useful states.

## Testing Notes

Use frontend rendered app tests for query restoration, request construction, URL sharing, visible states, gallery, related products, and removed routes. Use backend HTTP compatibility tests for public filter/sort contracts, OR artist matching, and original-price ranges. Reuse existing product API and storefront tests; add no category-tree abstraction.

## Blocked by

None.
