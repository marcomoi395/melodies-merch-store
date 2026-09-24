# Complete API Endpoint Regression Coverage

Status: ready-for-agent

## Problem Statement

As a Melodies Merch Store shopper or staff member, I cannot rely on an API change preserving every published route. The disposable PostgreSQL compatibility suite currently proves only a representative subset of identity, catalog, cart, order, and promotion requests. Many account, staff, role, catalog-management, cart-write, checkout, and administrative order routes have no real HTTP regression coverage. Class-level permission requirements are also ignored by the authorization guard, allowing an authenticated shopper to reach some back-office routes.

## Solution

Extend the existing disposable PostgreSQL API compatibility suite so one migrated-and-seeded production Nest application exercises every REST endpoint through HTTP. The suite will use seed-based shopper and Super Admin sessions, create isolated test records where a write route needs one, assert documented success or validation behavior and standard response envelopes, and discard the schema afterwards. Make the authorization guard honor both handler-level and controller-level permission requirements.

## User Stories

1. As a shopper, I want catalog product lists to remain available, so that I can browse merchandise and music.
2. As a shopper, I want product detail to remain available by slug, so that I can select variants before purchase.
3. As a shopper, I want artist lists and artist detail to remain available, so that I can discover artist merchandise.
4. As a shopper, I want the category tree and category product lists to remain available, so that I can navigate the catalog.
5. As a shopper, I want registration, login, refresh, and logout to retain their response contracts, so that I can manage a session.
6. As a shopper, I want invalid password-reset and account-verification submissions to return validation errors rather than server errors, so that protected account flows fail safely.
7. As a signed-in shopper, I want profile read, profile update, and password change routes to work, so that I can maintain my account.
8. As a signed-in shopper, I want a cart to be created, read, updated, and cleared through the API, so that its contents remain accurate.
9. As a shopper, I want order preview and order creation to calculate from an available product variant, so that checkout remains functional.
10. As a signed-in shopper, I want to list, inspect, and cancel my pending order, so that I can manage purchases.
11. As a Super Admin, I want product list, detail, create, update, and removal routes to work, so that I can manage catalog inventory.
12. As a Super Admin, I want artist create, update, and removal routes to work, so that I can manage artist catalog data.
13. As a Super Admin, I want category create, update, and removal routes to work, so that I can organize the catalog.
14. As a Super Admin, I want promotion list, create, update, and removal routes to work, so that I can manage vouchers.
15. As a Super Admin, I want the permissions list to remain available, so that I can assign authorization deliberately.
16. As a Super Admin, I want role list, create, update, and removal routes to authorize against my seeded permissions, so that role administration is usable after seeding.
17. As a Super Admin, I want staff list, create, update, and removal routes to authorize against my seeded permissions, so that staff administration is usable after seeding.
18. As a Super Admin, I want order list, detail, and status update routes to work, so that fulfillment can proceed.
19. As a maintainer, I want each API regression suite to migrate and seed its own PostgreSQL schema, so that test writes never touch a shared database.
20. As a maintainer, I want endpoint regressions to identify the route and behavior that failed, so that repair work stays focused.

## Implementation Decisions

- Reuse the existing disposable PostgreSQL compatibility seam: create a unique schema, run migrations and seed data, boot the production Nest application with its Redis mock, issue HTTP requests, then drop the schema.
- Keep endpoint coverage in the existing compatibility suite. Do not create a second API harness, controller mocks, generic route registry, or test-only authorization bypass.
- Use only API responses to discover seeded IDs and to chain create/update/delete workflows. Seeded shopper and Super Admin credentials provide the real authentication and authorization context.
- Cover every controller route with an observable successful request when it has no external side effect. For reset-password, verification-email, and verify-account paths, cover invalid input or invalid token behavior to avoid sending real email while still exercising the production HTTP pipeline.
- Mutating tests create uniquely named artists, categories, products, promotions, roles, staff accounts, cart items, and orders inside the disposable schema. No test cleanup beyond schema destruction is needed.
- Keep the standard response envelope and expected status code as the contract. Validate significant returned values only where they prove the requested state change.
- Resolve permission metadata from both a route handler and its controller, preserving the existing `ROLE_MANAGE` and `STAFF_MANAGE` seed permission model.

## Testing Decisions

- A good regression test invokes a real HTTP route with real validation, guards, service logic, TypeORM persistence, migrations, and seed data. It asserts response status and observable response payload or state transition; it does not assert decorators, repository calls, or query-builder internals.
- The compatibility suite covers authentication, user profile, permissions, public catalog, administrative catalog, cart, shopper orders, administrative orders, promotions, roles, and staff endpoints.
- The existing isolated PostgreSQL lifecycle, API compatibility test, seed process, and controller/service tests are prior art. The compatibility suite is the highest existing seam and supersedes adding per-controller HTTP mocks.
- The normal unit suite remains focused on domain branches. It is not expanded merely to mirror HTTP routes already covered by the compatibility suite.

## Out of Scope

- New API routes, response-schema changes, mail delivery integration, payment-provider integration, frontend work, or production database verification.
- Testing arbitrary invalid permutations for every DTO, load testing, and duplicating service unit tests at the HTTP seam.
- New roles, permissions, database schema changes, or general authorization redesign beyond applying existing controller-level permissions.

## Further Notes

- The suite requires `TEST_DATABASE_URL` and never falls back to the application database.
- The seeded Super Admin is `admin@gmail.com` with the documented seed password; the seeded shopper is `client@gmail.com` with the same password. These are disposable test-schema fixtures only.
