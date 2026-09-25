Type: task
Status: ready-for-agent

## Goal

Deliver Phase 2 catalog discovery: categories, artists, product filters, `oldest` sorting, shareable query URLs, breadcrumbs, and explicit empty/not-found/mobile states.

## Scope

- Add category index and category product pages using the public category endpoints; return `200` with an empty page for a known category with no published products, `404` only for an unknown category.
- Treat `GET /categories` as a flat array of category records; do not require `children`.
- Add artist list and artist detail pages using the public artist endpoints.
- Add main-catalog artist (OR), original-price minimum/maximum, in-stock-only, and `oldest` discovery controls. Keep category pages pagination-only and artist detail already artist-scoped because their endpoints do not support the global filter set.
- Preserve filters and pagination in shareable URL query parameters.
- Add breadcrumbs from explicit loaded product/category/artist records and parent IDs only when available.
- Distinguish loading, API error, empty results, and product/category/artist not-found states.
- Keep controls usable on mobile.

## Acceptance Criteria

- Product requests use only documented fields and encode repeated artist/type filters correctly.
- `sort=oldest`, original-price range, and `stock_status=true` reach the API and remain in the URL.
- Changing a filter resets page to `1`; pagination retains every other filter.
- Category pages work when category data has no `children` property.
- Search no-match, valid empty category, invalid category, invalid artist, and invalid product routes have distinct useful states; valid category emptiness is not encoded as `404`.
- Artist and category links lead to published customer-facing products only.

## Testing Notes

Use frontend rendered app tests for query restoration, request construction, URL sharing, breadcrumbs, and visible states. Use backend HTTP compatibility tests for public filter/sort contracts, OR artist matching, original-price ranges, known-empty categories, and not-found responses. Reuse existing product API and storefront tests; add no category-tree abstraction.

## Blocked by

None.
