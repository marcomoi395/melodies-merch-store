import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('UserService', () => {
    let service: UserService;
    let prisma: PrismaService;
    let mailer: MailerService;
    let redis: any;

    const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        passwordHash: 'hashedPassword',
        avatarUrl: null,
        provider: 'local',
        isVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    };

    const mockRedis = {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        ttl: jest.fn(),
    };

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    };

    const mockMailerService = {
        sendMail: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const configs = {
                API_URL: 'http://localhost:3000',
                FRONTEND_URL: 'http://localhost:4200',
            };
            return configs[key];
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: MailerService, useValue: mockMailerService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: 'REDIS_CLIENT', useValue: mockRedis },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        prisma = module.get<PrismaService>(PrismaService);
        mailer = module.get<MailerService>(MailerService);
        redis = module.get('REDIS_CLIENT');

        jest.clearAllMocks();
    });

    describe('getUserWithRole', () => {
        it('should return user with roles', async () => {
            const mockUserWithRole = {
                ...mockUser,
                userRoles: [
                    {
                        role: {
                            id: 'role_1',
                            name: 'User',
                        },
                    },
                ],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithRole);

            const result = await service.getUserWithRole('test@example.com');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                include: {
                    userRoles: {
                        include: { role: true },
                    },
                },
            });
            expect(result).toEqual(mockUserWithRole);
        });

        it('should return null if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            const result = await service.getUserWithRole('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('getUser', () => {
        it('should return user by email', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.getUser('test@example.com');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            const result = await service.getUser('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('getUserProfile', () => {
        it('should return user profile', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.getUserProfile('user_123');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user_123' },
            });
            expect(result).toBeDefined();
            expect(result.email).toBe(mockUser.email);
        });

        it('should throw NotFoundException if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.getUserProfile('invalid_id')).rejects.toThrow(NotFoundException);
            await expect(service.getUserProfile('invalid_id')).rejects.toThrow(
                "User doesn't exist",
            );
        });
    });

    describe('updateProfileInfo', () => {
        it('should update user profile', async () => {
            const updateDto = {
                fullName: 'Updated Name',
                phoneNumber: '9876543210',
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                ...updateDto,
            });

            const result = await service.updateProfileInfo('user_123', updateDto);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user_123' } });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user_123' },
                data: updateDto,
            });
            expect(result.fullName).toBe(updateDto.fullName);
        });

        it('should throw NotFoundException if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.updateProfileInfo('invalid_id', {})).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'newPassword123',
            };

            const hashedPassword = await bcrypt.hash('oldPassword123', 10);
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                passwordHash: hashedPassword,
            });
            mockPrismaService.user.update.mockResolvedValue(mockUser);

            await service.changePassword('user_123', changePasswordDto);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user_123' } });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user_123' },
                data: { passwordHash: expect.any(String) },
            });
        });

        it('should throw BadRequestException if new password equals old password', async () => {
            const changePasswordDto = {
                oldPassword: 'samePassword123',
                newPassword: 'samePassword123',
            };

            await expect(service.changePassword('user_123', changePasswordDto)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.changePassword('user_123', changePasswordDto)).rejects.toThrow(
                'New password must be different from old password',
            );
        });

        it('should throw BadRequestException if old password is incorrect', async () => {
            const changePasswordDto = {
                oldPassword: 'wrongPassword',
                newPassword: 'newPassword123',
            };

            const hashedPassword = await bcrypt.hash('correctPassword', 10);
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                passwordHash: hashedPassword,
            });

            await expect(service.changePassword('user_123', changePasswordDto)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.changePassword('user_123', changePasswordDto)).rejects.toThrow(
                "Old password doesn't match",
            );
        });

        it('should throw NotFoundException if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.changePassword('invalid_id', {
                    oldPassword: 'old',
                    newPassword: 'new',
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('requestVerificationEmail', () => {
        it('should send verification email', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                isVerified: false,
            });
            mockRedis.set.mockResolvedValue('OK');
            mockMailerService.sendMail.mockResolvedValue(true);

            await service.requestVerificationEmail('user_123', 'test@example.com');

            expect(mailer.sendMail).toHaveBeenCalled();
        });

        it('should throw BadRequestException if user is already verified', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                isVerified: true,
            });

            await expect(
                service.requestVerificationEmail('user_123', 'test@example.com'),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.requestVerificationEmail('user_123', 'test@example.com'),
            ).rejects.toThrow('User is already verified');
        });

        it('should throw BadRequestException if rate limited', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                isVerified: false,
            });
            mockRedis.set.mockResolvedValue(null);
            mockRedis.ttl.mockResolvedValue(45);

            await expect(
                service.requestVerificationEmail('user_123', 'test@example.com'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('verificationToken', () => {
        it('should verify account successfully', async () => {
            mockRedis.get.mockResolvedValue('user_123');
            mockRedis.del.mockResolvedValue(1);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                isVerified: true,
            });

            await service.verificationToken('valid-token');

            expect(redis.get).toHaveBeenCalledWith('verify-account:valid-token');
            expect(redis.del).toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user_123' },
                data: { isVerified: true },
            });
        });

        it('should throw BadRequestException for invalid token', async () => {
            mockRedis.get.mockResolvedValue(null);

            await expect(service.verificationToken('invalid-token')).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.verificationToken('invalid-token')).rejects.toThrow(
                'Invalid or expired verification token',
            );
        });
    });
});
