import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
    };

    const mockAuthService = {
        registerUserForClient: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        refreshTokens: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        })
            .overrideGuard(AuthGuard('local'))
            .useValue({ canActivate: () => true })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should register a new user', async () => {
            const registerDto = {
                email: 'newuser@example.com',
                password: 'Password@123',
                fullName: 'New User',
                phoneNumber: '1234567890',
            };

            mockAuthService.registerUserForClient.mockResolvedValue(mockUser);

            const result = await controller.registerUser(registerDto);

            expect(authService.registerUserForClient).toHaveBeenCalledWith(registerDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'User registered successfully',
                data: mockUser,
            });
        });

        it('should propagate errors from service', async () => {
            const registerDto = {
                email: 'existing@example.com',
                password: 'Password@123',
                fullName: 'Existing User',
            };

            mockAuthService.registerUserForClient.mockRejectedValue(
                new Error('User already exists'),
            );

            await expect(controller.registerUser(registerDto as any)).rejects.toThrow(
                'User already exists',
            );
        });
    });

    describe('login', () => {
        it('should login user and return tokens', async () => {
            const mockRequest = {
                user: mockUser,
            } as any;

            const mockLoginResult = {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: mockUser,
            };

            mockAuthService.login.mockResolvedValue(mockLoginResult);

            const result = await controller.login(mockRequest);

            expect(authService.login).toHaveBeenCalledWith(mockUser);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Login successful',
                data: mockLoginResult,
            });
        });

        it('should propagate errors from service', async () => {
            const mockRequest = { user: mockUser } as any;

            mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

            await expect(controller.login(mockRequest)).rejects.toThrow('Invalid credentials');
        });
    });

    describe('logout', () => {
        it('should logout user successfully', async () => {
            const mockRequest = {
                user: { sub: 'user_123', email: 'test@example.com', jti: 'token-id' },
            } as any;

            const refreshTokenDto = {
                refreshToken: 'refresh-token',
            };

            mockAuthService.logout.mockResolvedValue(undefined);

            const result = await controller.logout(mockRequest, refreshTokenDto);

            expect(authService.logout).toHaveBeenCalledWith(
                refreshTokenDto.refreshToken,
                'user_123',
            );
            expect(result).toEqual({
                statusCode: 200,
                message: 'Logout successful',
            });
        });

        it('should propagate errors from service', async () => {
            const mockRequest = {
                user: { sub: 'user_123', email: 'test@example.com', jti: 'token-id' },
            } as any;
            const refreshTokenDto = { refreshToken: 'refresh-token' };

            mockAuthService.logout.mockRejectedValue(new Error('Token not found'));

            await expect(controller.logout(mockRequest, refreshTokenDto)).rejects.toThrow(
                'Token not found',
            );
        });
    });

    describe('refreshTokens', () => {
        it('should refresh tokens successfully', async () => {
            const refreshTokenDto = {
                refreshToken: 'old-refresh-token',
            };

            const mockRefreshResult = {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
            };

            mockAuthService.refreshTokens.mockResolvedValue(mockRefreshResult);

            const result = await controller.refreshTokens(refreshTokenDto);

            expect(authService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Tokens refreshed successfully',
                data: mockRefreshResult,
            });
        });

        it('should propagate errors from service', async () => {
            const refreshTokenDto = { refreshToken: 'invalid-refresh-token' };

            mockAuthService.refreshTokens.mockRejectedValue(new Error('Invalid refresh token'));

            await expect(controller.refreshTokens(refreshTokenDto)).rejects.toThrow(
                'Invalid refresh token',
            );
        });
    });

    describe('forgotPassword', () => {
        it('should send password reset email', async () => {
            const forgotPasswordDto = {
                email: 'test@example.com',
            };

            mockAuthService.requestPasswordReset.mockResolvedValue(undefined);

            const result = await controller.forgotPassword(forgotPasswordDto);

            expect(authService.requestPasswordReset).toHaveBeenCalledWith(forgotPasswordDto.email);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Password reset email sent successfully',
            });
        });

        it('should propagate errors from service', async () => {
            const forgotPasswordDto = { email: 'unknown@example.com' };

            mockAuthService.requestPasswordReset.mockRejectedValue(new Error('User not found'));

            await expect(controller.forgotPassword(forgotPasswordDto)).rejects.toThrow(
                'User not found',
            );
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            const resetPasswordDto = {
                token: 'reset-token',
                newPassword: 'NewPassword@123',
            };

            mockAuthService.resetPassword.mockResolvedValue(undefined);

            const result = await controller.resetPassword(resetPasswordDto);

            expect(authService.resetPassword).toHaveBeenCalledWith(
                resetPasswordDto.token,
                resetPasswordDto.newPassword,
            );
            expect(result).toEqual({
                statusCode: 200,
                message: 'Password reset successfully',
            });
        });

        it('should propagate errors from service', async () => {
            const resetPasswordDto = {
                token: 'expired-token',
                newPassword: 'NewPassword@123',
            };

            mockAuthService.resetPassword.mockRejectedValue(new Error('Token expired'));

            await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
                'Token expired',
            );
        });
    });
});
