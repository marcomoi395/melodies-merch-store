# Testing Guide - Melodies Merch Store

This document describes testing conventions and best practices for the Melodies Merch Store backend.

## Overview

- **Unit Tests**: Test services and controllers in isolation with mocked dependencies
- **E2E Tests**: Test full API request/response cycles with real HTTP calls
- **Test Location**:
    - Unit tests: `src/**/*.spec.ts` (alongside source files)
    - E2E tests: `test/**/*.e2e-spec.ts`

## Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- src/auth/auth.service.spec.ts
```

## Project Structure

```
test/
├── factories/          # Test data factories
│   └── user.factory.ts
├── helpers/           # Test utilities
│   └── test-helpers.ts
├── mocks/            # Mock objects
│   └── typeorm.mock.ts
├── jest-e2e.json     # E2E test configuration
└── README.md         # This file
```

## Unit Testing Patterns

### Service Tests

Services contain business logic and interact with injected TypeORM repositories. Mock repositories at the service boundary.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleService } from './module.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from 'src/database/entities/user.entity';

describe('ModuleService', () => {
    let service: ModuleService;
    let repository: typeof repositoryMock;

    const repositoryMock = { findOne: jest.fn(), save: jest.fn() };

    beforeEach(async () => {
        resetTypeORMMocks();

        const module: TestingModule = await Test.createTestingModule({
        providers: [ModuleService, { provide: getRepositoryToken(UserEntity), useValue: repositoryMock }],
        }).compile();

        service = module.get<ModuleService>(ModuleService);
        repository = module.get(getRepositoryToken(UserEntity));
    });

    it('should perform CRUD operation', async () => {
        const mockData = { id: '1', name: 'Test' };
        typeorm.model.findUnique.mockResolvedValue(mockData);

        const result = await service.findById('1');

        expect(typeorm.model.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
        expect(result).toEqual(mockData);
    });
});
```

### Controller Tests

Controllers handle HTTP requests and call service methods. Mock the service layer.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';

describe('ModuleController', () => {
    let controller: ModuleController;
    let service: ModuleService;

    const mockService = {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ModuleController],
            providers: [{ provide: ModuleService, useValue: mockService }],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ModuleController>(ModuleController);
        service = module.get<ModuleService>(ModuleService);
    });

    it('should return formatted response', async () => {
        const mockData = [{ id: '1', name: 'Test' }];
        mockService.findAll.mockResolvedValue({
            data: mockData,
            meta: { currentPage: 1, totalPages: 1, limit: 10, totalItems: 1 },
        });

        const result = await controller.findAll({ page: 1, limit: 10 });

        expect(result.statusCode).toBe(200);
        expect(result.message).toBeDefined();
        expect(result.data).toBeDefined();
    });
});
```

## E2E Testing Patterns

E2E tests use `supertest` to make real HTTP requests against the application.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { getAuthToken, authHeader, expectApiResponse } from '../helpers/test-helpers';

describe('Module (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        const tokens = await getAuthToken(app);
        authToken = tokens.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/endpoint (GET)', () => {
        it('should return list of items', () => {
            return request(app.getHttpServer())
                .get('/endpoint')
                .set(authHeader(authToken))
                .expect(200)
                .expect((res) => {
                    expectApiResponse(res);
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });
    });

    describe('/endpoint/:id (GET)', () => {
        it('should return single item', async () => {
            const response = await request(app.getHttpServer())
                .get('/endpoint/123')
                .set(authHeader(authToken))
                .expect(200);

            expectApiResponse(response);
            expect(response.body.data).toHaveProperty('id');
        });
    });
});
```

## Test Utilities

### Test Helpers (`test/helpers/test-helpers.ts`)

- `getAuthToken(app, email?, password?)` - Login and get JWT token
- `authHeader(token)` - Create Authorization header
- `createTestUser(app, userData)` - Register new test user
- `expectApiResponse(response, statusCode?)` - Verify response structure
- `expectPaginatedResponse(response)` - Verify paginated response

### Factories (`test/factories/`)

Generate test data with sensible defaults:

```typescript
import { UserFactory, ProductFactory } from 'test/factories/user.factory';

const user = UserFactory.create({ email: 'custom@example.com' });
const product = ProductFactory.create({ name: 'Custom Product' });
```

### Mocks (`test/mocks/`)

Pre-configured mock objects:

```typescript
import { mockTypeORMService, resetTypeORMMocks } from 'test/mocks/typeorm.mock';

// Use in tests
beforeEach(() => {
    resetTypeORMMocks();
});
```

## Best Practices

### General

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Reset Mocks**: Always reset mocks between tests with `resetTypeORMMocks()` or `jest.clearAllMocks()`
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
4. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification phases

### Unit Tests

1. **Mock External Dependencies**: Mock TypeORMService, external APIs, and other services
2. **Test Business Logic**: Focus on testing business rules and edge cases
3. **Verify Method Calls**: Use `expect(mock).toHaveBeenCalledWith(...)` to verify interactions
4. **Test Error Cases**: Always test error scenarios (NotFoundException, ValidationError, etc.)

### E2E Tests

1. **Test Critical Flows**: Focus on user journeys and integration points
2. **Use Test Database**: Configure separate test database to avoid polluting dev data
3. **Clean Up**: Clean up test data after each test or test suite
4. **Test Authentication**: Test both authenticated and unauthenticated scenarios
5. **Test Permissions**: Verify RBAC works correctly across endpoints

## Response Format

All API endpoints return standardized responses:

```typescript
{
    statusCode: 200,
    message: 'Operation successful',
    data: { /* response data */ },
    meta?: {  // For paginated responses
        currentPage: 1,
        totalPages: 10,
        limit: 10,
        totalItems: 100
    }
}
```

## Common Testing Scenarios

### Testing Decimal Fields

TypeORM returns Decimal objects. Use `@DecimalToNumber()` decorator in response DTOs:

```typescript
it('should convert Decimal to number', () => {
    const product = { price: new TypeORM.Decimal(99.99) };
    const dto = plainToInstance(ProductResponseDto, product, {
        excludeExtraneousValues: true,
    });
    expect(typeof dto.price).toBe('number');
});
```

### Testing Pagination

```typescript
it('should return paginated results', async () => {
    typeorm.model.findMany.mockResolvedValue([
        /* items */
    ]);
    typeorm.model.count.mockResolvedValue(25);

    const result = await service.findAll({ page: 2, limit: 10 });

    expect(result.meta).toEqual({
        currentPage: 2,
        totalPages: 3,
        limit: 10,
        totalItems: 25,
    });
});
```

### Testing Transactions

```typescript
it('should execute in transaction', async () => {
    typeorm.$transaction.mockImplementation((fn) => fn(typeorm));

    await service.methodWithTransaction();

    expect(typeorm.$transaction).toHaveBeenCalled();
});
```

### Testing Guards

```typescript
it('should deny access without permission', async () => {
    // Override guard to return false
    const module = await Test.createTestingModule({
        controllers: [Controller],
        providers: [{ provide: Service, useValue: mockService }],
    })
        .overrideGuard(PermissionGuard)
        .useValue({ canActivate: () => false })
        .compile();

    // Test will fail with 403 Forbidden
});
```

## Debugging Tests

```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test file
npm test -- auth.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should login"

# Debug with Chrome DevTools
npm run test:debug
# Open chrome://inspect in Chrome
```

## Coverage Goals

- **Services**: 80%+ coverage on business logic
- **Controllers**: 70%+ coverage on endpoint handling
- **Critical Flows**: 100% E2E coverage for auth, checkout, payments
- **Overall**: 75%+ total coverage

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
