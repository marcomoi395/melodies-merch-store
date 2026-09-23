import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { createTestApp } from './helpers/app-setup';
import { createSchema, dropSchema } from './database/postgres-lifecycle';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe('TypeORM API compatibility (e2e)', () => {
    let app: INestApplication | undefined;
    let schema: string;

    beforeAll(async () => {
        if (!databaseUrl) {
            throw new Error('TEST_DATABASE_URL is required for TypeORM API compatibility tests');
        }
        schema = `test_api_${randomUUID().replaceAll('-', '')}`;
        await createSchema(databaseUrl, schema);
        process.env.DATABASE_URL = databaseUrl;
        process.env.DATABASE_SCHEMA = schema;
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
        ({ app } = await createTestApp());
    });

    afterAll(async () => {
        await app?.close();
        if (databaseUrl && schema) {
            await dropSchema(databaseUrl, schema);
        }
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

        const email = `e2e-${Date.now()}@example.com`;
        const register = await http.post('/api/auth/register').send({
            email,
            password: 'Password@123',
            fullName: 'E2E User',
        });
        expect(register.status).toBe(201);
        const login = await http.post('/api/auth/login').send({ email, password: 'Password@123' });
        expect(login.status).toBe(200);
        const token = login.body.data.accessToken as string;
        expect((await http.get('/api/cart').set('Authorization', `Bearer ${token}`)).status).toBe(
            200,
        );
        expect(
            (
                await http
                    .post('/api/order/preview')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ items: [] })
            ).status,
        ).toBe(400);
    });
});
