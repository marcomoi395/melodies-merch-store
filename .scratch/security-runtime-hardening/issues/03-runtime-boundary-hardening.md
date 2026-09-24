Type: task
Status: resolved

## Goal

Make browser access, API documentation, and deployment configuration explicit and quiet at startup.

## Scope

- Replace unrestricted CORS with a parsed configured origin allowlist.
- Make customer-application URL and relevant security settings explicit in runtime validation and `.env.example`.
- Remove the missing-working-directory OpenAPI error path by using a checked-in document or generated metadata, and gate documentation behind explicit configuration.
- Add bootstrap/configuration tests for CORS and Swagger behavior.

## Blocked by

None.

## Answer

Implemented configured CORS, explicit runtime URL and Swagger settings, generated optional Swagger metadata, quiet Swagger failure handling, and bootstrap/configuration tests.
