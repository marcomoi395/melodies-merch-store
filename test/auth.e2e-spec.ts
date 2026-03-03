import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createTestApp, createRedisMock } from './helpers/app-setup.ts';
import { expectApiResponse } from './helpers/test-helpers';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let redisMock: ReturnType<typeof createRedisMock>;

    const mockUser = {
        id: 'user-uuid-001',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '0123456789',
        passwordHash: '$2a$10$hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    };

    const prismaMock = {
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn((fn) =>
            typeof fn === 'function' ? fn(prismaMock) : Promise.resolve(fn),
        ),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };

    beforeAll(async () => {
        redisMock = createRedisMock();
        ({ app } = await createTestApp(prismaMock, redisMock));
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue({
                ...mockUser,
                email: 'newuser@example.com',
                passwordHash: undefined,
            });

            const res = await request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'newuser@example.com',
                    password: 'Password@123',
                    fullName: 'New User',
                })
                .expect(201);

            expect(res.body.statusCode).toBe(201);
            expect(res.body.message).toBeDefined();
            expect(res.body.data).toBeDefined();
        });

        it('should return 409 when email already exists', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            await request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Password@123',
                    fullName: 'Test User',
                })
                .expect(409);
        });

        it('should return 400 for invalid email format', async () => {
            await request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'not-an-email',
                    password: 'Password@123',
                    fullName: 'Test User',
                })
                .expect(400);
        });

        it('should return 400 when required fields are missing', async () => {
            await request(app.getHttpServer())
                .post('/api/auth/register')
                .send({ email: 'test@example.com' })
                .expect(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully and return tokens', async () => {
            const hashedPwd = await bcrypt.hash('Password@123', 10);
            prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hashedPwd });
            redisMock.set.mockResolvedValue('OK');

            const res = await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({ email: mockUser.email, password: 'Password@123' })
                .expect(200);

            expectApiResponse(res);
            expect(res.body.data).toHaveProperty('accessToken');
            expect(res.body.data).toHaveProperty('refreshToken');
        });

        it('should return 401 for wrong password', async () => {
            const hashedPwd = await bcrypt.hash('CorrectPassword@123', 10);

            prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hashedPwd });

            await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({ email: mockUser.email, password: 'WrongPassword' })
                .expect(401);
        });

        it('should return 401 for non-existent user', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({ email: 'nobody@example.com', password: 'Password@123' })
                .expect(401);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer())
                .post('/api/auth/logout')
                .send({ refreshToken: 'some-token' })
                .expect(401);
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should return 400 when refreshToken is missing', async () => {
            await request(app.getHttpServer()).post('/api/auth/refresh').send({}).expect(400);
        });
    });

    describe('POST /api/auth/forgot-password', () => {
        it('should return 400 when email is missing', async () => {
            await request(app.getHttpServer())
                .post('/api/auth/forgot-password')
                .send({})
                .expect(400);
        });
    });

    describe('POST /api/auth/reset-password', () => {
        it('should return 400 when token or newPassword is missing', async () => {
            await request(app.getHttpServer())
                .post('/api/auth/reset-password')
                .send({ token: 'some-token' })
                .expect(400);
        });
    });
});
