import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
    let service: AuthService;
    let _prisma: PrismaService;
    let _userService: UserService;
    let _jwtService: JwtService;
    let _redis: any;

    const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        passwordHash: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockPipeline = {
        unlink: jest.fn(),
        exec: jest.fn(),
    };

    const mockRedis = {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        ttl: jest.fn(),
        scanStream: jest.fn(),
        pipeline: jest.fn().mockReturnValue(mockPipeline),
    };

    const mockPrismaService = {
        user: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockUserService = {
        getUser: jest.fn(),
        getUserById: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const configs = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '7d',
            };
            return configs[key];
        }),
    };

    const mockMailerService = {
        sendMail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: 'REDIS_CLIENT', useValue: mockRedis },
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: UserService, useValue: mockUserService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: MailerService, useValue: mockMailerService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        _prisma = module.get<PrismaService>(PrismaService);
        _userService = module.get<UserService>(UserService);
        _jwtService = module.get<JwtService>(JwtService);
        _redis = module.get('REDIS_CLIENT');

        jest.clearAllMocks();
    });

    describe('registerUserForClient', () => {
        it('should register a new user successfully', async () => {
            const registerDto = {
                email: 'newuser@example.com',
                password: 'password123',
                fullName: 'New User',
                phoneNumber: '1234567890',
            };

            mockUserService.getUser.mockResolvedValue(null);
            const newUser = {
                id: 'user_123',
                email: registerDto.email,
                fullName: registerDto.fullName,
                phoneNumber: registerDto.phoneNumber,
                passwordHash: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockPrismaService.user.create.mockResolvedValue(newUser);

            const result = await service.registerUserForClient(registerDto);

            expect(mockUserService.getUser).toHaveBeenCalledWith(registerDto.email);
            expect(mockPrismaService.user.create).toHaveBeenCalled();
            expect(result).toHaveProperty('email', registerDto.email);
            // UserEntity removes passwordHash
        });

        it('should throw ConflictException if user already exists', async () => {
            const registerDto = {
                email: 'existing@example.com',
                password: 'password123',
                fullName: 'Existing User',
            };

            mockUserService.getUser.mockResolvedValue(mockUser);

            await expect(service.registerUserForClient(registerDto)).rejects.toThrow(
                ConflictException,
            );
            expect(mockPrismaService.user.create).not.toHaveBeenCalled();
        });
    });

    describe('validateUser', () => {
        it('should validate user with correct credentials', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            mockUserService.getUser.mockResolvedValue({
                ...mockUser,
                passwordHash: hashedPassword,
            });

            const result = await service.validateUser('test@example.com', 'password123');

            expect(result).toBeDefined();
            expect(result?.email).toBe('test@example.com');
            expect(result).not.toHaveProperty('passwordHash');
        });

        it('should return null for invalid password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            mockUserService.getUser.mockResolvedValue({
                ...mockUser,
                passwordHash: hashedPassword,
            });

            const result = await service.validateUser('test@example.com', 'wrongpassword');

            expect(result).toBeNull();
        });

        it('should return null if user does not exist', async () => {
            mockUserService.getUser.mockResolvedValue(null);

            const result = await service.validateUser('nonexistent@example.com', 'password123');

            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should generate tokens and store refresh token in Redis', async () => {
            mockJwtService.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');
            mockRedis.set.mockResolvedValue('OK');

            const result = await service.login(mockUser as any);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(mockRedis.set).toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should remove refresh token from Redis', async () => {
            mockJwtService.verify.mockReturnValue({
                sub: 'user_123',
                jti: 'token-id',
            });
            mockRedis.del.mockResolvedValue(1);

            await service.logout('valid-refresh-token', 'user_123');

            expect(mockJwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
            expect(mockRedis.del).toHaveBeenCalled();
        });

        it('should throw BadRequestException for invalid token', async () => {
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(service.logout('invalid-token', 'user_123')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if userId mismatch', async () => {
            mockJwtService.verify.mockReturnValue({
                sub: 'user_456',
                jti: 'token-id',
            });

            await expect(service.logout('valid-refresh-token', 'user_123')).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('refreshTokens', () => {
        it('should refresh access token with valid refresh token', async () => {
            const storedToken = 'stored-refresh-token';
            mockJwtService.verify.mockReturnValue({
                sub: 'user_123',
                email: 'test@example.com',
                jti: 'token-id',
            });
            mockRedis.get.mockResolvedValue(storedToken);
            mockRedis.del.mockResolvedValue(1);
            mockRedis.set.mockResolvedValue('OK');
            mockJwtService.sign
                .mockReturnValueOnce('new-access-token')
                .mockReturnValueOnce('new-refresh-token');

            const result = await service.refreshTokens(storedToken);

            expect(result).toHaveProperty('accessToken', 'new-access-token');
            expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
            expect(mockRedis.get).toHaveBeenCalled();
        });

        it('should throw ForbiddenException if token not in whitelist', async () => {
            mockJwtService.verify.mockReturnValue({
                sub: 'user_123',
                jti: 'token-id',
            });
            mockRedis.get.mockResolvedValue(null);

            await expect(service.refreshTokens('invalid-refresh-token')).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should revoke all tokens and throw ForbiddenException if refresh token has been reused', async () => {
            mockJwtService.verify.mockReturnValue({
                sub: 'user_123',
                email: 'test@example.com',
                jti: 'token-id',
            });
            mockRedis.get.mockResolvedValue('current-valid-token');
            mockRedis.scanStream.mockImplementation(() =>
                (async function* () {
                    yield [];
                })(),
            );

            await expect(service.refreshTokens('used-old-token')).rejects.toThrow(
                ForbiddenException,
            );
            await expect(service.refreshTokens('used-old-token')).rejects.toThrow('Access Denied');
        });

        it('should throw BadRequestException if token verification fails', async () => {
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('jwt malformed');
            });

            await expect(service.refreshTokens('bad-token')).rejects.toThrow(BadRequestException);
            await expect(service.refreshTokens('bad-token')).rejects.toThrow(
                'Invalid refresh token',
            );
        });
    });

    describe('revokeAllTokens', () => {
        it('should revoke all tokens for a user', async () => {
            const keys = ['whitelist:user_123:token1', 'whitelist:user_123:token2'];
            mockRedis.scanStream.mockImplementation(() =>
                (async function* () {
                    yield keys;
                })(),
            );
            mockPipeline.exec.mockResolvedValue([]);

            await service.revokeAllTokens('user_123');

            expect(mockRedis.scanStream).toHaveBeenCalledWith({
                match: 'whitelist:user_123:*',
                count: 100,
            });
            expect(mockPipeline.unlink).toHaveBeenCalledTimes(2);
            expect(mockPipeline.exec).toHaveBeenCalled();
        });

        it('should do nothing if no tokens found', async () => {
            mockRedis.scanStream.mockImplementation(() =>
                (async function* () {
                    yield [];
                })(),
            );

            await service.revokeAllTokens('user_123');

            expect(mockPipeline.exec).not.toHaveBeenCalled();
        });
    });

    describe('requestPasswordReset', () => {
        it('should throw BadRequestException if user does not exist', async () => {
            mockUserService.getUser.mockResolvedValue(null);

            await expect(service.requestPasswordReset('unknown@example.com')).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.requestPasswordReset('unknown@example.com')).rejects.toThrow(
                'User with this email does not exist',
            );
        });

        it('should send password reset email successfully', async () => {
            mockUserService.getUser.mockResolvedValue(mockUser);
            mockRedis.set
                .mockResolvedValueOnce('OK') // rate-limit NX set succeeds
                .mockResolvedValueOnce('OK'); // token storage
            mockMailerService.sendMail.mockResolvedValue(true);

            await service.requestPasswordReset('test@example.com');

            expect(mockMailerService.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                }),
            );
        });

        it('should throw BadRequestException if rate limit is exceeded', async () => {
            mockUserService.getUser.mockResolvedValue(mockUser);
            mockRedis.set.mockResolvedValue(null); // NX set fails – key already exists
            mockRedis.ttl.mockResolvedValue(45);

            await expect(service.requestPasswordReset('test@example.com')).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.requestPasswordReset('test@example.com')).rejects.toThrow(
                '45 seconds',
            );
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            mockRedis.get.mockResolvedValue('user_123');
            mockRedis.del.mockResolvedValue(1);
            mockPrismaService.user.update.mockResolvedValue(mockUser);

            await service.resetPassword('valid-token', 'newPassword123');

            expect(mockRedis.get).toHaveBeenCalledWith('reset_password:valid-token');
            expect(mockRedis.del).toHaveBeenCalledWith('reset_password:valid-token');
            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: 'user_123' },
                data: { passwordHash: expect.any(String) },
            });
        });

        it('should throw BadRequestException if token is invalid or expired', async () => {
            mockRedis.get.mockResolvedValue(null);

            await expect(service.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow(
                'Invalid or expired password reset token',
            );
        });
    });
});
