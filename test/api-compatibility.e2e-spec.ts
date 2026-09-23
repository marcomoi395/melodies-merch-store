import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/app-setup';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe('TypeORM API compatibility (e2e)', () => {
    let app: INestApplication | undefined;

    beforeAll(async () => {
        if (!databaseUrl) {
            throw new Error('TEST_DATABASE_URL is required for TypeORM API compatibility tests');
        }
        process.env.DATABASE_URL = databaseUrl;
        ({ app } = await createTestApp());
    });

    afterAll(async () => {
        await app?.close();
    });

    it('serves representative identity, catalog, cart, order, and promotion boundaries', async () => {
        expect(app).toBeDefined();
        const http = request(app!.getHttpServer());
        const responses = await Promise.all([
            http.get('/api/products'),
            http.get('/api/artists'),
            http.get('/api/categories'),
            http.get('/api/cart'),
            http.get('/api/order'),
            http.get('/api/admin/promotion'),
            http.post('/api/auth/login').send({}),
        ]);
        expect(responses.every(({ status }) => status < 500)).toBe(true);
    });
});
