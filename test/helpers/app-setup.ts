import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { TestingModule, Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Generate a test JWT token for authenticated E2E requests
 */
export function generateTestToken(userId: string, email: string, secret: string): string {
    return jwt.sign({ sub: userId, email, jti: 'test-token-id' }, secret, { expiresIn: '1d' });
}

/**
 * Minimal Redis mock that satisfies the app's Redis usage
 */
export function createRedisMock() {
    const store = new Map<string, { value: string; expiry?: number }>();

    return {
        set: jest.fn((key: string, value: string, ...args: any[]) => {
            store.set(key, { value });
            return 'OK';
        }),
        get: jest.fn((key: string) => Promise.resolve(store.get(key)?.value ?? null)),
        del: jest.fn((...keys: string[]) => {
            keys.forEach((k) => store.delete(k));
            return Promise.resolve(keys.length);
        }),
        ttl: jest.fn(() => Promise.resolve(-1)),
        scanStream: jest.fn(() => {
            const stream = new EventEmitter();
            process.nextTick(() => {
                stream.emit('data', []);
                stream.emit('end');
            });
            return stream;
        }),
        pipeline: jest.fn(() => ({
            unlink: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        })),
        quit: jest.fn().mockResolvedValue('OK'),
        disconnect: jest.fn(),
        _store: store,
    };
}

/**
 * Creates a NestJS test application with Prisma and Redis mocked.
 * Returns the app, module, and the actual JWT secret used by the app.
 */
export async function createTestApp(
    prismaMock: any,
    redisMock?: any,
): Promise<{ app: INestApplication; module: TestingModule; jwtSecret: string }> {
    const redis = redisMock ?? createRedisMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .overrideProvider('REDIS_CLIENT')
        .useValue(redis)
        .compile();

    const app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.setGlobalPrefix('api');

    await app.init();

    // Get the actual JWT_SECRET the app uses (from ConfigService / .env)
    const configService = moduleFixture.get(ConfigService);
    const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');

    return { app, module: moduleFixture, jwtSecret };
}
