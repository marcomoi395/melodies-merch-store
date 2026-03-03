import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/**
 * Test helper utilities for E2E and unit tests
 */

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
}

/**
 * Login and get auth tokens for E2E tests
 */
export async function getAuthToken(
    app: INestApplication,
    email: string = 'admin@melodies.com',
    password: string = 'Admin@123',
): Promise<AuthTokens> {
    const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

    return {
        accessToken: response.body.data.accessToken,
        refreshToken: response.body.data.refreshToken,
    };
}

/**
 * Create authorization header for authenticated requests
 */
export function authHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
}

/**
 * Create a test user
 */
export async function createTestUser(
    app: INestApplication,
    userData: {
        email: string;
        password: string;
        fullName: string;
        phoneNumber?: string;
    },
): Promise<any> {
    const response = await request(app.getHttpServer()).post('/auth/register').send(userData);

    return response.body.data;
}

/**
 * Verify response structure matches ApiResponse interface
 */
export function expectApiResponse(response: any, expectedStatusCode: number = 200) {
    expect(response.body).toHaveProperty('statusCode', expectedStatusCode);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
}

/**
 * Verify paginated response structure
 */
export function expectPaginatedResponse(response: any) {
    expectApiResponse(response);
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('currentPage');
    expect(response.body.meta).toHaveProperty('totalPages');
    expect(response.body.meta).toHaveProperty('limit');
    expect(response.body.meta).toHaveProperty('totalItems');
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
