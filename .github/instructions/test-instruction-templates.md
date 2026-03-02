# Test Instruction Templates — Melodies Merch Store Backend

Invoke a template by name (e.g. "Service Test", "Admin Controller Test", "Public Controller Test") and these rules apply automatically.

---

## 1. Service Test

**Template name:** `Service Test`

### Module Setup

```ts
let service: XxxService;
let prisma: PrismaService;

const mockPrismaService = {
    modelName: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    relatedModel: {
        findFirst: jest.fn(),
    },
};

beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        providers: [XxxService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<XxxService>(XxxService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
});
```

### `mockModel` shape

- Include full raw DB fields: `id`, core fields, `createdAt`, `updatedAt`, `deletedAt: null`
- No DTO-level transformations; this represents raw Prisma return values.

### Paginated List Tests (`getXxx({ page, limit })`)

1. **Happy path** — mock `count` + `findMany`, assert both called, assert full result:

    ```ts
    expect(result).toEqual({ data: [...], meta: { currentPage, totalPages, limit, totalItems } });
    ```

2. **Empty results** — `count: 0, findMany: []` → assert `data: []`, `meta.totalItems: 0`
3. **Default pagination** — call with `{}`, assert `findMany` called with `take: 20, skip: 0`, assert `meta.limit: 20, meta.currentPage: 1`
4. **Pagination skip math** — page 2, limit 10 → assert `findMany` called with `skip: 10`

### findUnique / Detail Tests

1. **Happy path** — assert `findUnique` called with `expect.objectContaining({ where: { slug: '...', deletedAt: null } })`, assert result structure
2. **Not found** — mock returns `null` → `rejects.toThrow(NotFoundException)`
3. **Computed field tests** — test service-level calculations (e.g. `maxPrice`):
    - With discount: `effectivePrice = originalPrice * (1 - discountPercent / 100)`
    - Without discount (`discountPercent: null` or `0`): `effectivePrice = originalPrice`
    - `maxPrice = Math.max(...variants)` → `-Infinity` when `productVariants: []`
    - Access via `result.model[0]?.nested?.['computedField']` (optional chaining for TS safety)

### Create Tests

1. **Happy path** — assert `prisma.model.create` called with `expect.objectContaining({ data: expect.objectContaining({ field, slug: expect.any(String) }) })`, assert result fields
2. **Slug generation** — assert `create` called with `expect.objectContaining({ data: expect.objectContaining({ slug: 'generated-slug' }) })`
3. **P2002 → ConflictException**:

    ```ts
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['slug'] },
    });
    ```

4. **Non-P2002 error rethrow** — `new Error('Unexpected DB error')` → `rejects.toThrow('Unexpected DB error')`

### Update Tests

1. **Happy path** — assert `update` called with `{ where: { id }, data: expect.objectContaining({...}) }`, assert result
2. **P2025 → NotFoundException**: `new Prisma.PrismaClientKnownRequestError('...', { code: 'P2025', clientVersion: '5.0.0' })`
3. **P2002 → ConflictException** (same shape as create, P2002)
4. **Slug not updated when stageName absent** — assert `update` called with `expect.not.objectContaining({ slug: expect.anything() })`
5. **Non-Prisma error rethrow** — `new Error('...')` → assert original message thrown

### Delete Tests (soft/hard)

1. **NotFoundException** — `findUnique` returns `null` → `rejects.toThrow(NotFoundException)`
2. **Soft delete when used in orders** — `findUnique` returns record, `relatedModel.findFirst` returns an item → `update` called with `expect.objectContaining({ status: 'deleted' })`, `delete` NOT called
3. **Hard delete when not in orders** — `relatedModel.findFirst` returns `null` → `delete` called with `{ where: { id } }`, `update` NOT called
4. **Basic happy path** — assert `findUnique` called with `{ where: { id } }` (smoke test)

### Prisma Mock Reset Rule

- **Never reassign** a mock property object inline inside a test (e.g. `mockPrismaService.orderItem = {...}`).
- Always use `.mockResolvedValue()` / `.mockRejectedValue()` on the existing `jest.fn()` reference.
- `jest.clearAllMocks()` in `beforeEach` handles cleanup.

---

## 2. Admin Controller Test

**Template name:** `Admin Controller Test`

### Module Setup

```ts
let controller: XxxAdminController;
let service: XxxService;

const mockXxxService = {
    createXxxForAdmin: jest.fn(),
    updateXxxForAdmin: jest.fn(),
    deleteXxxForAdmin: jest.fn(),
};

beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        controllers: [XxxAdminController],
        providers: [{ provide: XxxService, useValue: mockXxxService }],
    })
        .overrideGuard(AuthGuard('jwt'))
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionGuard)
        .useValue({ canActivate: () => true })
        .compile();

    controller = module.get<XxxAdminController>(XxxAdminController);
    service = module.get<XxxService>(XxxService);

    jest.clearAllMocks();
});
```

### `mockModel` shape

- **Minimal core fields only**: `id`, display fields — NO timestamps, NO `status`, NO `deletedAt`

### Guard Rule

- Admin controllers **always** override both `AuthGuard('jwt')` and `PermissionGuard` to `{ canActivate: () => true }`

### Per-method test cases

#### Create (`POST`)

1. **Happy path** — assert service called with DTO, assert response:

    ```ts
    expect(result).toEqual({
        statusCode: 201,
        message: '... created successfully',
        data: expect.anything(),
    });
    ```

2. **DTO transformation** (`'should transform data correctly (exclude secret fields)'`):
    - Raw service return includes `status`, `createdAt`, `updatedAt`, `deletedAt`
    - Assert `result.data` equals exact expected object (only `@Expose()` fields: `id`, display fields, `metadata: {}`, `products: undefined` if no productArtists)
    - Assert `result.data` does NOT have each secret field:

        ```ts
        expect(result.data).not.toHaveProperty('status');
        expect(result.data).not.toHaveProperty('createdAt');
        expect(result.data).not.toHaveProperty('updatedAt');
        expect(result.data).not.toHaveProperty('deletedAt');
        ```

3. **ConflictException** — `mockRejectedValue(new ConflictException('...'))` → `rejects.toThrow(ConflictException)`, assert service called

#### Update (`PATCH`)

1. **Happy path** → `{ statusCode: 200, message: '... updated successfully', data: expect.anything() }`, assert service called with `(id, dto)`
2. **NotFoundException** — `mockRejectedValue(new NotFoundException('...'))` → assert throws, assert service called
3. **ConflictException** — same pattern

#### Delete (`DELETE`)

1. **Happy path** — `mockResolvedValue(undefined)`, assert response **has no `data` field**:

    ```ts
    expect(result).toEqual({ statusCode: 200, message: '... deleted successfully' });
    ```

2. **NotFoundException** — same error pattern, assert service called

---

## 3. Public Controller Test

**Template name:** `Public Controller Test`

### Module Setup

```ts
let controller: XxxPublicController;
let service: XxxService;

const mockXxxService = {
    getXxxs: jest.fn(),
    getXxxDetail: jest.fn(),
};

beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        controllers: [XxxPublicController],
        providers: [{ provide: XxxService, useValue: mockXxxService }],
    }).compile(); // NO guard overrides — public controllers have no guards

    controller = module.get<XxxPublicController>(XxxPublicController);
    service = module.get<XxxService>(XxxService);

    jest.clearAllMocks();
});
```

### `mockModel` shape

- Same as Admin Controller: minimal core fields, no timestamps

### Paginated List Tests (`getXxxs({ page, limit })`)

1. **Happy path paginated**:

    ```ts
    expect(result).toEqual({
        statusCode: 200,
        message: '... fetched successfully',
        data: expect.any(Array),
        meta: mockResult.meta,
    });
    ```

2. **DTO transformation** — exclude `status`, `createdAt`, `updatedAt`, `deletedAt`; assert exact `result.data[0]` shape; use `.not.toHaveProperty()` for each secret field
3. **Empty list** — `data: []`, assert `result.data` equals `[]`, assert `result.meta.totalItems` is `0`
4. **Pagination params forwarded** — assert `service.getXxxs` called with exact `{ page, limit }` values
5. **Multi-page meta** — build `Array.from({ length: n }, ...)`, assert `result.meta` equals full meta object, assert `result.data.toHaveLength(n)`
6. **Default pagination** — call with `{}`, assert service called with `{}`, assert service called exactly once (`toHaveBeenCalledTimes(1)`)

### Detail Tests (`getXxxDetail({ slug })`)

1. **Happy path** → `{ statusCode: 200, message: '... detail fetched successfully', data: expect.anything() }`, assert service called with extracted slug string
2. **DTO transformation**:
    - Raw data includes relational join field (e.g. `productArtists: []`)
    - Assert `result.data` does NOT have raw join field (e.g. `productArtists`)
    - Assert `result.data` DOES have the mapped field (e.g. `products: []` when `productArtists: []`)
    - Assert secret fields absent via `.not.toHaveProperty()`
3. **NotFoundException** — `mockRejectedValue(new NotFoundException('...'))` → `rejects.toThrow(NotFoundException)`, assert service called

---

## Cross-cutting Rules (All Test Types)

- `jest.clearAllMocks()` in every `beforeEach` — never `jest.resetAllMocks()` or `jest.restoreAllMocks()`
- Happy path always asserts **both** the service call args AND the return value shape
- Error path always asserts **both** that it rejects with the correct exception class AND that the service was called with the right args
- Use `expect.objectContaining({})` when only a subset of object properties needs asserting
- Use `expect.any(String)` / `expect.any(Array)` for values that are non-deterministic but type-constrained
- Use optional chaining (`?.`) when accessing nested properties on typed results that may be `undefined` (e.g. `result.items[0]?.nested?.['field']`)
- Access DTO-excluded/computed properties via bracket notation (`['fieldName']`) to avoid TypeScript compile errors
