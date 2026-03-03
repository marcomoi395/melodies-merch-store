import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';

describe('UserController', () => {
    let controller: UserController;
    let service: UserService;

    const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
    };

    const mockUserService = {
        getUserProfile: jest.fn(),
        updateProfileInfo: jest.fn(),
        changePassword: jest.fn(),
        requestVerificationEmail: jest.fn(),
        verificationToken: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<UserController>(UserController);
        service = module.get<UserService>(UserService);

        jest.clearAllMocks();
    });

    describe('getUserProfile', () => {
        it('should return user profile', async () => {
            const mockRequest = {
                user: { sub: 'user_123', email: 'test@example.com' },
            } as any;

            mockUserService.getUserProfile.mockResolvedValue(mockUser);

            const result = await controller.getUserProfile(mockRequest);

            expect(service.getUserProfile).toHaveBeenCalledWith('user_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'User profile fetched successfully',
                data: mockUser,
            });
        });

        it('should propagate errors from service', async () => {
            const mockRequest = { user: { sub: 'user_123', email: 'test@example.com' } } as any;
            mockUserService.getUserProfile.mockRejectedValue(new Error("User doesn't exist"));
            await expect(controller.getUserProfile(mockRequest)).rejects.toThrow(
                "User doesn't exist",
            );
        });
    });

    describe('updateProfileInfo', () => {
        it('should update user profile', async () => {
            const mockRequest = {
                user: { sub: 'user_123', email: 'test@example.com' },
            } as any;

            const updateDto = {
                fullName: 'Updated Name',
                phoneNumber: '9876543210',
            };

            const updatedUser = {
                ...mockUser,
                ...updateDto,
            };

            mockUserService.updateProfileInfo.mockResolvedValue(updatedUser);

            const result = await controller.updateProfileInfo(mockRequest, updateDto);

            expect(service.updateProfileInfo).toHaveBeenCalledWith('user_123', updateDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Update profile info successfully',
                data: updatedUser,
            });
        });

        it('should propagate errors from service', async () => {
            const mockRequest = { user: { sub: 'user_123', email: 'test@example.com' } } as any;
            mockUserService.updateProfileInfo.mockRejectedValue(new Error("User doesn't exist"));
            await expect(controller.updateProfileInfo(mockRequest, {})).rejects.toThrow(
                "User doesn't exist",
            );
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const mockRequest = {
                user: { sub: 'user_123', email: 'test@example.com' },
            } as any;

            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'newPassword123',
            };

            mockUserService.changePassword.mockResolvedValue(undefined);

            const result = await controller.changePassword(mockRequest, changePasswordDto);

            expect(service.changePassword).toHaveBeenCalledWith('user_123', changePasswordDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Password changed successfully',
            });
        });

        it('should propagate errors from service', async () => {
            const mockRequest = { user: { sub: 'user_123', email: 'test@example.com' } } as any;
            mockUserService.changePassword.mockRejectedValue(
                new Error("Old password doesn't match"),
            );
            await expect(
                controller.changePassword(mockRequest, {
                    oldPassword: 'wrong',
                    newPassword: 'new',
                }),
            ).rejects.toThrow("Old password doesn't match");
        });
    });

    describe('requestVerificationEmail', () => {
        it('should send verification email', async () => {
            const mockRequest = {
                user: { sub: 'user_123', email: 'test@example.com' },
            } as any;

            mockUserService.requestVerificationEmail.mockResolvedValue(undefined);

            const result = await controller.requestVerificationEmail(mockRequest);

            expect(service.requestVerificationEmail).toHaveBeenCalledWith(
                'user_123',
                'test@example.com',
            );
            expect(result).toEqual({
                statusCode: 200,
                message: 'Verification email sent successfully',
            });
        });

        it('should propagate errors from service', async () => {
            const mockRequest = { user: { sub: 'user_123', email: 'test@example.com' } } as any;
            mockUserService.requestVerificationEmail.mockRejectedValue(
                new Error('User is already verified'),
            );
            await expect(controller.requestVerificationEmail(mockRequest)).rejects.toThrow(
                'User is already verified',
            );
        });
    });

    describe('verificationToken', () => {
        it('should verify account successfully', async () => {
            const verificationDto = {
                token: 'verification-token',
            };

            mockUserService.verificationToken.mockResolvedValue(undefined);

            const result = await controller.verificationToken(verificationDto);

            expect(service.verificationToken).toHaveBeenCalledWith(verificationDto.token);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Account verified successfully',
            });
        });

        it('should propagate errors from service', async () => {
            mockUserService.verificationToken.mockRejectedValue(
                new Error('Invalid or expired verification token'),
            );
            await expect(controller.verificationToken({ token: 'bad-token' })).rejects.toThrow(
                'Invalid or expired verification token',
            );
        });
    });
});
