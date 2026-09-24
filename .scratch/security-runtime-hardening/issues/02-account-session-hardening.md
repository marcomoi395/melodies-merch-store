Type: task
Status: ready-for-agent

## Goal

Make account recovery links usable and invalidate stale sessions after credential changes without leaking account existence.

## Scope

- Generate verification and password-reset links from the configured customer-application URL.
- Revoke all refresh-token whitelist entries after password change and password reset.
- Return the same successful forgot-password behavior for known and unknown addresses; avoid token/email side effects for unknown addresses.
- Add focused service tests for links, revocation, and response parity.

## Blocked by

None.
