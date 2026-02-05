# Copilot Instructions - Melodies Merch Store Backend

This is a NestJS backend for an e-commerce platform selling music products and merchandise, using Prisma ORM with PostgreSQL and Redis for session management.

## Build, Test, and Lint Commands

```bash
# Install dependencies
npm install

# Database setup (after configuring .env)
npx prisma migrate dev          # Run migrations
npx prisma db seed              # Seed initial data (Super Admin, Categories)
npx prisma generate             # Generate Prisma Client (output: generated/prisma/)

# Development
npm run start:dev               # Watch mode on port 3000

# Build & Production
npm run build                   # Compile to dist/
npm run start:prod              # Run production build

# Testing
npm run test                    # Run all unit tests
npm run test:watch              # Watch mode
npm run test:cov                # With coverage
npm run test:e2e                # E2E tests (config: test/jest-e2e.json)
npm test -- [path/to/file.spec.ts]  # Run single test file

# Linting & Formatting
npm run lint                    # ESLint with --fix
npm run format                  # Prettier on src/ and test/
# Pre-commit: Husky runs lint-staged (auto-fixes staged TS/JSON/MD files)

# Docker
docker-compose up -d            # Run full stack (API, PostgreSQL, Redis, Nginx)
docker-compose ps               # Check container status
```

## Architecture Overview

### Module Organization

Each feature follows a **consistent structure**:

```
src/[feature]/
├── [feature].module.ts              # Module definition
├── [feature].service.ts             # Business logic
├── controllers/
│   ├── [feature].public.controller.ts   # Public endpoints
│   └── [feature].admin.controller.ts    # Admin endpoints (protected)
└── dto/
    ├── create-[feature].dto.ts
    ├── update-[feature].dto.ts
    ├── get-[feature].dto.ts
    └── [feature]-response.dto.ts
```

**Key Principle:** Public and admin controllers are separate but share the same service, enabling different permission strategies per endpoint.

### Core Modules

- **auth/** - JWT & local authentication strategies, session management
- **prisma/** - PrismaService (extends PrismaClient with PrismaPg adapter)
- **redis/** - RedisService for session storage
- **permissions/** - RBAC system with PermissionGuard
- **roles/** - Role management
- **shared/** - Reusable guards, helpers, interfaces, decorators

### Response Standardization

All endpoints return:

```typescript
{
    statusCode: 200,
    message: 'Action successful',
    data: [...],
    meta?: { page, limit, totalItems, totalPages }  // For paginated responses
}
```

Use `plainToInstance(ResponseDto, data, { excludeExtraneousValues: true })` to transform service results.

## Key Conventions

### DTO Patterns

**Input DTOs** (request validation):

- Use `class-validator` decorators: `@IsString()`, `@IsEnum()`, `@IsOptional()`, `@ValidateNested()`
- Include enums for constrained values (e.g., `ProductType.MUSIC`, `ProductType.MERCH`)
- Use `@Type(() => NestedDto)` for nested object validation

**Response DTOs** (output transformation):

- Use `class-transformer` decorators: `@Expose()`, `@Transform()`, `@Type()`
- Custom decorator `@DecimalToNumber()` converts Prisma Decimal to number
- Support nested transformations with `@Type(() => NestedDto)`
- Include constructors accepting partial objects

Example:

```typescript
export class ProductResponseDto {
    @Expose()
    @Transform(({ obj }) => obj?.productArtists?.map((pa) => pa.artist) || [])
    @Type(() => ArtistDto)
    artists: ArtistDto[];

    @Expose()
    @DecimalToNumber()
    price: number; // Prisma Decimal → number
}
```

### Authorization Flow

Three-layer security for protected endpoints:

1. **AuthGuard('jwt')** - Validates JWT token
2. **PermissionGuard** - Checks resource-action permissions
3. **@RequiredPermission(resource, action)** - Declares needed permissions

```typescript
@Get()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiredPermission('PRODUCT', 'VIEW')
async getProducts() { }
```

**Permission Naming:** `RESOURCE_ACTION` format (e.g., `PRODUCT_VIEW`, `CATEGORY_MANAGE`)

**Optional Auth:** Use `OptionalJwtAuthGuard` (in `src/shared/guards/`) to allow unauthenticated access while still populating `req.user` if token exists.

### Prisma Integration

- **Generated Client Location:** `generated/prisma/` (not default `node_modules/.prisma/`)
- **Import Path:** `import { PrismaClient } from '../generated/prisma/client'`
- **PrismaService:** Uses `PrismaPg` adapter, injects ConfigService for DATABASE_URL
- **Seeding:** `prisma/seed.ts` populates Super Admin, permissions, and base data from `seed.json`

### Shared Utilities

Located in `src/shared/`:

- **Helpers:** `formatUserResponse()`, `formatCartResponse()`, `formatRoleResponse()`, `generateRandomToken()`
- **Guards:** `OptionalJwtAuthGuard`
- **Interfaces:** `ApiResponse<T>`, `Pagination`

### Environment Configuration

Required variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token signing key
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` - Redis config
- `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` - SMTP for transactional emails
- `BCRYPT_SALT_ROUNDS` - Password hashing rounds

App validates env vars with Joi schema in `app.module.ts` on startup.

### Testing Conventions

- Unit tests: `src/**/*.spec.ts` (Jest with ts-jest)
- E2E tests: `test/**/*.e2e-spec.ts`
- Module name mapping: `src/...` and `generated/...` paths configured in `package.json` jest config
- Prisma mocking: Use dependency injection to replace PrismaService in test modules

## API Documentation

- **Swagger UI:** Available at `/api` endpoint (auto-generated from `openapi.yaml`)
- **Local:** http://localhost:3000/api
- **Production:** https://melodies.studio/api

## Common Workflows

### Adding a New Feature Module

1. Generate module: `nest g module [feature]`
2. Generate service: `nest g service [feature]`
3. Create `controllers/[feature].public.controller.ts` and `controllers/[feature].admin.controller.ts`
4. Create DTOs in `dto/` (create, update, get, response)
5. Add guards to admin controller: `@UseGuards(AuthGuard('jwt'), PermissionGuard)`
6. Add permissions in `prisma/seed.ts` (PermissionKey enum)
7. Import module in `app.module.ts`

### Adding New Permissions

1. Add enum entry in `prisma/seed.ts` (PermissionKey)
2. Add to `PERMISSIONS` array in seed file
3. Run `npx prisma db seed` to sync to database
4. Use `@RequiredPermission(resource, action)` on controller endpoints

### Database Schema Changes

1. Modify `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name [description]`
3. Generate client: `npx prisma generate`
4. Update seed data if needed: Edit `prisma/seed.ts` or `prisma/seed.json`
