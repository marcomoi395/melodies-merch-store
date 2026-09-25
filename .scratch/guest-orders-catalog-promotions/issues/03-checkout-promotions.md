Type: task
Status: ready-for-agent

## Goal

Deliver Phase 3 checkout promotions: voucher entry, server preview, discount breakdown, and actionable invalid/expired/usage-limit handling.

## Scope

- Add voucher input to guest checkout.
- Send `appliedVoucher` to `POST /order/preview` only when non-empty.
- Render server-returned subtotal, discount, shipping fee, applied voucher, and final total.
- Propagate the previewed voucher to `POST /order`; inside the order transaction, lock the voucher and revalidate active state, date window, usage limit, and final discount amount before consuming usage.
- Invalidate preview when voucher, address, quantity, or checkout items change.
- Handle invalid voucher, inactive/expired voucher, usage-limit reached, stock failure, and retry states.
- Do not add voucher discovery or a public promotion endpoint.

## Acceptance Criteria

- No voucher code means no `appliedVoucher` request field.
- A successful preview visibly shows the server discount and final total.
- Invalid, expired/inactive, and usage-limited codes show distinct useful messages from backend errors.
- Checkout cannot submit against a stale preview after relevant input changes.
- Final order payload includes the voucher from the current successful preview, but the transaction recalculates eligibility and discount rather than trusting a stale preview.
- Final order failure clears the stale preview and allows a fresh preview without losing cart items.
- Guest checkout retains voucher support.

## Testing Notes

Use rendered frontend app tests for payloads, breakdown, state invalidation, error messages, and retry. Use backend HTTP compatibility/service tests for preview validation plus transaction-side active/date/usage/amount rechecks at expiry and usage boundaries. Reuse existing checkout and order preview tests; do not test a voucher list because no public endpoint exists.

## Blocked by

None.
