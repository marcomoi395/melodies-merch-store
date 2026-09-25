import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    let controller: AuthController;
    const authService = { login: jest.fn() };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authService }],
        }).compile();
        controller = module.get(AuthController);
        jest.clearAllMocks();
    });

    it('keeps admin login available', async () => {
        const result = { accessToken: 'access', refreshToken: 'refresh' };
        authService.login.mockResolvedValue(result);
        await expect(controller.login({ user: { id: 'admin' } } as any)).resolves.toEqual({
            statusCode: 200,
            message: 'Login successful',
            data: result,
        });
    });

    it.each([
        ['registerUser', () => controller.registerUser({} as any)],
        ['forgotPassword', () => controller.forgotPassword({} as any)],
        ['resetPassword', () => controller.resetPassword({} as any)],
    ])('disables customer %s', async (_name, call) => {
        await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
    });
});
