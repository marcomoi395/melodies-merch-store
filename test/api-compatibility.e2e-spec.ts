import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { createSchema, dropSchema } from './database/postgres-lifecycle';

const databaseUrl = process.env.TEST_DATABASE_URL;

type ApiResponse = {
    status: number;
    body: { statusCode?: number; message?: unknown; data?: unknown };
};

function expectApi(response: ApiResponse, statusCode: number): void {
    if (response.status !== statusCode) {
        throw new Error(
            `Expected HTTP ${statusCode}, received ${response.status}: ${JSON.stringify(response.body)}`,
        );
    }
    expect(response.status).toBe(statusCode);
    expect(response.body.statusCode).toBe(statusCode);
    expect(response.body.message).toBeDefined();
}

function getData<T>(response: ApiResponse): T {
    if (response.body.data === undefined) {
        throw new Error('Expected API response data');
    }
    return response.body.data as T;
}

function bearer(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
}

describe('TypeORM API compatibility (e2e)', () => {
    let app: INestApplication | undefined;
    let schema: string;
    let adminToken = '';
    let categoryId = '';
    let productSlug = '';
    let productVariantId = '';
    let superAdminRoleId = '';

    beforeAll(async () => {
        if (!databaseUrl) {
            throw new Error('TEST_DATABASE_URL is required for TypeORM API compatibility tests');
        }
        schema = `test_api_${randomUUID().replaceAll('-', '')}`;
        await createSchema(databaseUrl, schema);
        process.env.DATABASE_URL = databaseUrl;
        process.env.DATABASE_SCHEMA = schema;
        process.env.CUSTOMER_APP_URL ??= 'http://localhost:3001';
        process.env.CORS_ORIGINS ??= 'http://localhost:3001';
        process.env.SWAGGER_ENABLED ??= 'false';
        const migration = spawnSync(
            process.execPath,
            [
                require.resolve('typeorm/cli-ts-node-commonjs.js'),
                'migration:run',
                '-d',
                'src/database/data-source.ts',
            ],
            { cwd: process.cwd(), encoding: 'utf8', env: process.env },
        );
        if (migration.status !== 0) {
            throw new Error(`${migration.stdout}${migration.stderr}`);
        }
        const seed = spawnSync('npm', ['run', 'seed'], {
            cwd: process.cwd(),
            encoding: 'utf8',
            env: process.env,
        });
        if (seed.status !== 0) {
            throw new Error(`${seed.stdout}${seed.stderr}`);
        }
        const { createTestApp } = await import('./helpers/app-setup');
        ({ app } = await createTestApp());
    });

    afterAll(async () => {
        await app?.close();
        if (databaseUrl && schema) {
            await dropSchema(databaseUrl, schema);
        }
    });

    it('serves every public catalog endpoint', async () => {
        const http = request(app!.getHttpServer());
        const products = await http.get('/api/products?limit=20');
        expectApi(products, 200);

        const catalog = getData<
            Array<{
                id: string;
                slug: string;
                variants: Array<{ id: string; stockQuantity: number }>;
            }>
        >(products);
        const product = catalog.find((item) =>
            item.variants.some((variant) => variant.stockQuantity > 5),
        );
        if (!product) {
            throw new Error('Seed data must include an in-stock product variant');
        }
        const variant = product.variants.find((item) => item.stockQuantity > 5);
        if (!variant) {
            throw new Error('Seed data must include an in-stock product variant');
        }
        productSlug = product.slug;
        productVariantId = variant.id;

        expectApi(await http.get(`/api/products/${productSlug}`), 200);

        const artists = await http.get('/api/artists?limit=1');
        expectApi(artists, 200);
        const artist = getData<Array<{ slug: string }>>(artists)[0];
        if (!artist) {
            throw new Error('Seed data must include an artist');
        }
        expectApi(await http.get(`/api/artists/${artist.slug}`), 200);

        const categories = await http.get('/api/categories');
        expectApi(categories, 200);
        const category = getData<Array<{ id: string; slug: string }>>(categories).find(
            (item) => item.slug === 'cd',
        );
        if (!category) {
            throw new Error('Seed data must include the cd category');
        }
        categoryId = category.id;
        expectApi(await http.get(`/api/categories/${category.slug}`), 200);
    });

    it('keeps authentication admin-only and disables customer account flows', async () => {
        const http = request(app!.getHttpServer());
        const password = 'Password@123';

        expectApi(
            await http.post('/api/auth/register').send({
                email: `e2e-${randomUUID()}@example.com`,
                password,
                fullName: 'E2E Shopper',
            }),
            403,
        );

        const customerLogin = await http
            .post('/api/auth/login')
            .send({ email: 'client@gmail.com', password: '123456' });
        expectApi(customerLogin, 401);

        const login = await http
            .post('/api/auth/login')
            .send({ email: 'admin@gmail.com', password: '123456' });
        expectApi(login, 200);
        const initialTokens = getData<{ accessToken: string; refreshToken: string }>(login);
        const initialAccessToken = initialTokens.accessToken;
        const initialRefreshToken = initialTokens.refreshToken;
        expect(initialAccessToken).toEqual(expect.any(String));
        expect(initialRefreshToken).toEqual(expect.any(String));

        const refresh = await http
            .post('/api/auth/refresh')
            .send({ refreshToken: initialRefreshToken });
        expectApi(refresh, 200);
        const refreshedTokens = getData<{ accessToken: string; refreshToken: string }>(refresh);
        const refreshedAccessToken = refreshedTokens.accessToken;
        const refreshedRefreshToken = refreshedTokens.refreshToken;
        expectApi(
            await http
                .post('/api/auth/logout')
                .set(bearer(refreshedAccessToken))
                .send({ refreshToken: refreshedRefreshToken }),
            200,
        );

        adminToken = initialAccessToken;
        expectApi(
            await http.post('/api/auth/forgot-password').send({ email: 'client@gmail.com' }),
            403,
        );
        expectApi(
            await http.post('/api/auth/reset-password').send({
                token: 'invalid-token',
                newPassword: password,
            }),
            403,
        );
    });

    it('supports guest checkout and email/phone shipment tracking', async () => {
        const http = request(app!.getHttpServer());
        const order = {
            fullName: 'E2E Guest',
            email: `guest-${randomUUID()}@example.com`,
            phone: '0900000000',
            items: [{ productVariantId, quantity: 1 }],
            shippingAddress: '1 Regression Test Street',
            paymentMethod: 'COD',
        };
        expectApi(
            await http.post('/api/order/preview').send({
                items: order.items,
                shippingAddress: order.shippingAddress,
            }),
            200,
        );

        const guestOrder = await http.post('/api/order').send(order);
        expectApi(guestOrder, 201);
        const guestOrderId = getData<{ id: string }>(guestOrder).id;
        expect(guestOrderId).toEqual(expect.any(String));
        const tracked = await http.post('/api/order/track').send({ email: order.email });
        expectApi(tracked, 200);
        expect(getData<Array<{ id: string; email?: string }>>(tracked)[0]).toEqual(
            expect.objectContaining({ id: guestOrderId }),
        );
        expect(getData<Array<{ email?: string }>>(tracked)[0]?.email).toBeUndefined();
        expectApi(await http.post('/api/order/track').send({ email: order.email }), 429);
        expectApi(
            await http.post('/api/order/track').send({ email: order.email, phone: order.phone }),
            400,
        );
        expectApi(await http.post('/api/order/track').send({ phone: '+84900000000' }), 200);

        expectApi(await http.get('/api/admin/order').set(bearer(adminToken)), 200);
        expectApi(await http.get(`/api/admin/order/${guestOrderId}`).set(bearer(adminToken)), 200);
        expectApi(
            await http
                .patch(`/api/admin/order/${guestOrderId}`)
                .set(bearer(adminToken))
                .send({ status: 'PROCESSING' }),
            200,
        );
    });

    it('serves every administrative catalog and promotion endpoint', async () => {
        const http = request(app!.getHttpServer());
        const suffix = randomUUID().slice(0, 8);

        expectApi(await http.get('/api/admin/products').set(bearer(adminToken)), 200);
        expectApi(
            await http.get(`/api/admin/products/${productSlug}`).set(bearer(adminToken)),
            200,
        );

        const artist = await http
            .post('/api/admin/artists')
            .set(bearer(adminToken))
            .send({ stageName: `E2E Artist ${suffix}`, bio: 'Regression artist' });
        expectApi(artist, 201);
        const artistId = getData<{ id: string }>(artist).id;
        expectApi(
            await http
                .patch(`/api/admin/artists/${artistId}`)
                .set(bearer(adminToken))
                .send({ stageName: `Updated E2E Artist ${suffix}` }),
            200,
        );

        const category = await http
            .post('/api/admin/categories')
            .set(bearer(adminToken))
            .send({ name: `E2E Category ${suffix}` });
        expectApi(category, 201);
        const createdCategoryId = getData<{ id: string }>(category).id;
        expectApi(
            await http
                .patch(`/api/admin/categories/${createdCategoryId}`)
                .set(bearer(adminToken))
                .send({ name: `Updated E2E Category ${suffix}` }),
            200,
        );

        const createdProduct = await http
            .post('/api/admin/products')
            .set(bearer(adminToken))
            .send({
                name: `E2E Product ${suffix}`,
                categoryId,
                productType: 'merch',
                artistIds: [artistId],
                variants: [
                    {
                        sku: `E2E-${suffix}`,
                        name: 'Regression Variant',
                        originalPrice: 100000,
                        stockQuantity: 10,
                        attributes: [{ key: 'Size', value: 'M' }],
                    },
                ],
            });
        expectApi(createdProduct, 201);
        const createdProductId = getData<{ id: string }>(createdProduct).id;
        expectApi(
            await http
                .patch(`/api/admin/products/${createdProductId}`)
                .set(bearer(adminToken))
                .send({ name: `Updated E2E Product ${suffix}` }),
            200,
        );
        expectApi(
            await http.delete(`/api/admin/products/${createdProductId}`).set(bearer(adminToken)),
            200,
        );
        expectApi(await http.delete(`/api/admin/artists/${artistId}`).set(bearer(adminToken)), 200);
        expectApi(
            await http.delete(`/api/admin/categories/${createdCategoryId}`).set(bearer(adminToken)),
            200,
        );

        expectApi(await http.get('/api/admin/promotion').set(bearer(adminToken)), 200);
        const promotion = await http
            .post('/api/admin/promotion')
            .set(bearer(adminToken))
            .send({
                code: `E2E${suffix}`,
                type: 'fixed',
                value: 1000,
                startDate: '2030-01-01T00:00:00.000Z',
                endDate: '2030-12-31T00:00:00.000Z',
            });
        expectApi(promotion, 201);
        const promotionId = getData<{ id: string }>(promotion).id;
        expectApi(
            await http
                .patch(`/api/admin/promotion/${promotionId}`)
                .set(bearer(adminToken))
                .send({ description: 'Updated regression promotion' }),
            200,
        );
        expectApi(
            await http.delete(`/api/admin/promotion/${promotionId}`).set(bearer(adminToken)),
            200,
        );
    });

    it('serves permissions, role, and staff administration endpoints', async () => {
        const http = request(app!.getHttpServer());
        const suffix = randomUUID().slice(0, 8);

        expectApi(await http.get('/api/admin/roles'), 401);

        const permissions = await http.get('/api/permissions');
        expectApi(permissions, 200);
        const permissionId = getData<Array<{ id: string }>>(permissions)[0]?.id;
        if (!permissionId) {
            throw new Error('Seed data must include a permission');
        }

        const roles = await http.get('/api/admin/roles').set(bearer(adminToken));
        expectApi(roles, 200);
        const superAdmin = getData<Array<{ id: string; name: string }>>(roles).find(
            (role) => role.name === 'SUPER_ADMIN',
        );
        if (!superAdmin) {
            throw new Error('Seed data must include the Super Admin role');
        }
        superAdminRoleId = superAdmin.id;

        const role = await http
            .post('/api/admin/roles')
            .set(bearer(adminToken))
            .send({
                name: `E2E_ROLE_${suffix}`,
                description: 'Regression role',
                permissionIds: [permissionId],
            });
        expectApi(role, 201);
        const roleId = getData<{ id: string }>(role).id;
        expectApi(
            await http
                .patch(`/api/admin/roles/${roleId}`)
                .set(bearer(adminToken))
                .send({ description: 'Updated regression role' }),
            200,
        );
        expectApi(await http.delete(`/api/admin/roles/${roleId}`).set(bearer(adminToken)), 200);

        expectApi(await http.get('/api/admin/staff').set(bearer(adminToken)), 200);
        const staff = await http
            .post('/api/admin/staff')
            .set(bearer(adminToken))
            .send({
                email: `staff-${suffix}@example.com`,
                fullName: 'E2E Staff',
                password: 'Password@123',
                roleIds: [superAdminRoleId],
            });
        expectApi(staff, 201);
        const staffId = getData<{ id: string }>(staff).id;
        expectApi(
            await http
                .patch(`/api/admin/staff/${staffId}`)
                .set(bearer(adminToken))
                .send({ fullName: 'Updated E2E Staff' }),
            200,
        );
        expectApi(await http.delete(`/api/admin/staff/${staffId}`).set(bearer(adminToken)), 200);
    });
});
