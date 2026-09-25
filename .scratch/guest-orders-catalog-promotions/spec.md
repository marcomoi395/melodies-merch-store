# Guest Ordering, Shipment Tracking, Catalog Discovery, and Promotions

Status: ready-for-agent

## Problem Statement

Melodies Merch Store không cần tài khoản customer cho giai đoạn này. Customer phải mua hàng như guest, không bị yêu cầu đăng nhập, nhưng vẫn cần xem trạng thái vận đơn sau khi đặt hàng bằng email hoặc số điện thoại. Đăng nhập chỉ phục vụ admin; giao diện admin chưa nằm trong phạm vi. Catalog discovery và voucher checkout vẫn cần được hoàn thiện.

## Solution

Deliver three customer-facing phases:

- Phase 1.5 chuyển từ customer account sang guest ordering và shipment tracking bằng email/phone.
- Phase 2 thêm category, artist, bộ lọc catalog, URL query shareable, breadcrumbs, empty/not-found states.
- Phase 3 thêm voucher checkout, server preview, discount breakdown, và xử lý invalid/expired/usage-limit.

Customer-facing login, register, profile, password change, customer order history, customer order detail qua tài khoản, và customer order cancellation bị loại bỏ. Auth backend chỉ phục vụ admin/staff. Không xây admin UI trong effort này.

## User Stories

1. As a customer, I want to browse the storefront without an account, so that I can shop immediately.
2. As a customer, I want to add products to a guest browser cart, so that I can prepare an order without signing in.
3. As a guest customer, I want to submit an order with name, email, phone, address, payment method, and items, so that I can complete checkout without registration.
4. As a guest customer, I want the order request to remain valid without a bearer token, so that customer login is not required.
5. As a guest customer, I want checkout to show loading and validation errors, so that I can correct incomplete contact or delivery data.
6. As a guest customer, I want a server-generated preview before placing an order, so that I can confirm stock and the amount due.
7. As a guest customer, I want an order confirmation with an order identifier, so that I can reference the purchase later.
8. As a guest customer, I want to open shipment tracking from the storefront, so that I can check an existing order without an account.
9. As a guest customer, I want to search my order using my email or phone number, so that I can retrieve its current status without a password.
10. As a guest customer, I want tracking lookup to validate email and phone formats, so that malformed requests fail clearly.
11. As a guest customer, I want tracking results to show order ID, created date, status, tracking code when available, payment method, totals, and delivery progress, so that I know what is happening to my order.
12. As a guest customer, I want multiple matching orders listed newest first, so that I can choose the order I need.
13. As a guest customer, I want tracking results to expose only the minimum order data needed for shipment checking, so that contact and delivery data are not unnecessarily public.
14. As a guest customer, I want an empty tracking state, so that I know no order matched the submitted identifier.
15. As a guest customer, I want tracking errors and retry feedback, so that temporary API failures are recoverable.
16. As a guest customer, I want tracking lookup to work on mobile, so that I can check an order from my phone.
17. As an admin, I want the existing authentication flow to remain available, so that I can access protected administration APIs.
18. As a customer, I do not want customer login or registration presented in the storefront, so that the purchase flow stays guest-only.
19. As a maintainer, I want customer credentials rejected by the admin login flow, so that customer accounts cannot use admin authentication.
20. As a customer, I want a category index, so that I can start discovery from product groupings.
21. As a customer, I want category links to show published products, so that category browsing leads to purchasable items.
22. As a customer, I want category data handled as the flat list returned by the API, so that the UI does not assume a `children` tree.
23. As a customer, I want a valid category with no products to show an empty state, so that I can distinguish it from an invalid category.
24. As a customer, I want category breadcrumbs based only on explicit API data, so that the UI does not invent hierarchy.
25. As a customer, I want an artist list, so that I can browse by performer or creator.
26. As a customer, I want an artist detail page with published products, so that I can discover that artist's catalog.
27. As a customer, I want artist list/detail loading, error, empty, and not-found states, so that discovery remains understandable.
28. As a customer, I want to filter the main catalog by one or more artists, so that I can narrow results to relevant creators.
29. As a customer, I want artist filters to use OR semantics, so that products from any selected artist are included.
30. As a customer, I want to filter by original-price range, so that I can shop within my budget using the API's documented price basis.
31. As a customer, I want an in-stock-only filter, so that I can hide products with no available variant.
32. As a customer, I want to sort products by `oldest`, so that I can discover the earliest catalog entries.
33. As a customer, I want existing newest and price sorting preserved, so that discovery does not regress.
34. As a customer, I want catalog filters and pagination encoded in the URL, so that I can refresh or share a discovery view.
35. As a customer, I want search-empty, filter-empty, product-not-found, category-not-found, and artist-not-found states, so that stale or narrow queries remain understandable.
36. As a customer, I want catalog discovery controls and breadcrumbs usable on mobile, so that browsing does not require a desktop.
37. As a guest customer, I want to enter a voucher at checkout, so that I can use a code received from an external campaign.
38. As a guest customer, I want voucher preview evaluated by the server, so that the displayed total matches checkout rules.
39. As a guest customer, I want subtotal, voucher discount, shipping fee, and final total shown separately, so that I understand the amount due.
40. As a guest customer, I want invalid, expired, and usage-limited vouchers explained, so that I can correct or remove the code.
41. As a guest customer, I want changing voucher, address, quantity, or items to invalidate the previous preview, so that stale totals cannot be submitted.
42. As a guest customer, I want the order request to include the voucher from the current preview, so that the server applies the intended promotion.
43. As a customer, I do not want a public voucher directory, because the API provides no public voucher discovery endpoint.
44. As a customer, I want consistent loading, error, empty, validation, success, and mobile states across checkout, tracking, catalog, and promotions.

## Implementation Decisions

- Remove customer-facing login, register, forgot-password, reset-password, verify-account, profile, password-change, account navigation, customer order history, customer order detail, and customer cancellation from the storefront.
- Preserve backend admin/staff authentication and protected administration APIs. Restrict login to users with the existing admin/staff authorization model; customer accounts must not be accepted as admin sessions. Disable or remove public customer registration, password recovery, reset, and verification routes for this scope. Do not build admin screens in this effort.
- Keep guest order creation through `POST /order` without a bearer token. Do not create or require a customer account during checkout. Preserve the existing browser cart and clear it after successful checkout.
- Keep checkout contact fields explicit: `fullName`, `email`, `phone`, `shippingAddress`, `paymentMethod`, optional `note`, and `items`. Server validation remains authoritative.
- Add a public shipment lookup contract at `POST /order/track`, accepting one exact normalized identifier: valid `email` or valid `phone`. The response returns a minimal tracking projection, not the full `OrderResponseDto`.
- Tracking results are restricted to order summary fields: order ID, created date, status, tracking code, payment method, subtotal, shipping fee, discount amount, total amount, and a masked delivery/contact summary where needed. Do not return password data, internal roles, or unrestricted customer/order details.
- Match email case-insensitively and normalize phone consistently with the backend's supported phone format. Return matching guest orders newest first. Return an empty result for no match without distinguishing whether the identifier is registered.
- Preserve the existing order status values `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, and `CANCELLED`. Shipment progress is derived from status and tracking code; no carrier integration is added.
- Apply appropriate abuse protection to the public tracking endpoint before production release, such as rate limiting and response minimization. Do not expose a customer order list through an unauthenticated full-detail endpoint.
- Use `GET /categories`, `GET /categories/:slug`, `GET /artists`, and `GET /artists/:slug` for discovery. Categories are flat records such as `{ id, name, slug, parentId }`; a known category with no published products returns `200` with an empty page, while an unknown category returns `404`.
- Extend only the main catalog request with repeated `artistId` using OR semantics, repeated `type`, `price_min`, `price_max`, `stock_status=true`, `sort=oldest`, `keyword`, `page`, and `limit`. Category pages remain pagination-only because their endpoint contract does not support the broader filters. Price range uses `originalPrice`.
- Preserve discovery query parameters in the URL. Applying a filter resets page to `1`; pagination retains all other values. Use allowlisted sort values only.
- Use explicit API records and parent IDs for breadcrumbs. Do not require or synthesize a `children` tree.
- Keep voucher entry available for guest checkout. Send `appliedVoucher` only when non-empty to `POST /order/preview` and `POST /order`.
- Use the preview response as the displayed source of truth for subtotal, discount, shipping, applied voucher, and total. Invalidate preview when its inputs change.
- At order creation, revalidate voucher active state, date window, usage limit, and final discount under the voucher transaction lock before consuming usage. Recheck stock transactionally. On failure, clear the stale preview and preserve the guest cart context.
- Do not add voucher discovery, automatic suggestions, stacking, payment gateway integration, shipping-rate calculation, or carrier tracking integration.
- Preserve the existing monochrome storefront design language and responsive layout. Avoid new routing/state-management dependencies.

## Testing Decisions

- Test guest checkout and public tracking at the production Nest HTTP compatibility seam: no bearer required for order creation, guest order persistence, lookup matching, response minimization, no-match behavior, ordering, validation, and status/tracking output.
- Add backend tests proving customer users cannot log in through the admin authentication flow, while existing admin/staff login remains available. Do not add admin UI tests.
- Test frontend rendered behavior with Vitest/jsdom: customer login routes absent, guest checkout requests, confirmation, tracking form, query payload, loading/error/empty states, minimal tracking rendering, catalog query URLs, flat categories, and voucher breakdown.
- Add Playwright only for the customer journey: browse -> add to cart -> guest checkout -> receive order ID -> open tracking -> submit email/phone -> view status. No admin browser flow.
- Test Phase 2 API behavior for OR artist filters, original-price ranges, stock filter, `oldest`, known-empty categories, and not-found responses.
- Test Phase 3 preview and transaction behavior for valid, invalid, expired, usage-limited, stale, and final stock failure cases.
- Reuse existing backend API compatibility, migration/seed, frontend Vitest/jsdom, API client, and storefront helper seams. Run backend unit/E2E/database/build/type/lint/format checks plus frontend unit/build and Playwright checks.

## Out of Scope

- Customer login, registration, verification, profile, password reset/change, account pages, customer order history, customer order detail through authentication, and customer order cancellation.
- Admin dashboard, admin catalog/order/promotion screens, and any admin frontend UI. Admin backend APIs and admin authentication remain supported.
- Guest order tracking by order ID alone, unrestricted order detail, delivery address exposure, carrier API integration, real-time shipment events, delivery ETA, returns, refunds, or stock restoration on cancellation.
- Avatar upload, image hosting, payment gateway/callbacks, shipping-rate calculation, and multi-carrier integration.
- Public voucher listing, voucher search, automatic voucher suggestions, voucher stacking, and customer-specific promotion eligibility.
- New category-tree API, category CRUD, artist CRUD, product publishing, arbitrary sort values, undocumented query fields, or a broad storefront redesign.

## Further Notes

- Current guest order creation already supports an optional bearer token; the new scope makes the no-token path canonical for customers.
- The current order response contains more personal data than a public tracking response should expose. Tracking needs a dedicated minimal DTO and endpoint rather than reusing `OrderResponseDto`.
- The current category endpoint implementation returns a flat array and currently reports no products as `404`; Phase 2 requires changing the known-empty behavior so the frontend can distinguish it from an unknown slug.
- The current order creation transaction rechecks stock and voucher activity/usage but must also recheck voucher date eligibility and final discount before usage consumption.
- The current frontend has no browser E2E runner. Playwright is the smallest new test dependency required for the guest customer flow.
