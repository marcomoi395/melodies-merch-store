import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from 'src/permissions/permissions.guard';

describe('StaffController', () => {
    let controller: StaffController;
    let service: StaffService;

    const mockStaff = {
        id: 'staff_123',
        email: 'staff@example.com',
        fullName: 'Staff User',
        roles: ['Admin'],
        permissions: [
            {
                resource: 'PRODUCT',
                action: 'MANAGE',
            },
        ],
    };

    const mockStaffService = {
        getAllStaff: jest.fn(),
        registerStaffForAdmin: jest.fn(),
        updateStaffForAdmin: jest.fn(),
        deleteAccountForAdmin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffController],
            providers: [
                {
                    provide: StaffService,
                    useValue: mockStaffService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<StaffController>(StaffController);
        service = module.get<StaffService>(StaffService);

        jest.clearAllMocks();
    });

    describe('getAllStaff', () => {
        it('should return all staff members', async () => {
            const mockStaffList = [mockStaff];
            mockStaffService.getAllStaff.mockResolvedValue(mockStaffList);

            const result = await controller.getAllStaff();

            expect(service.getAllStaff).toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 200,
                message: 'Staff retrieved successfully',
                data: expect.any(Array),
            });
        });

        it('should propagate errors from service', async () => {
            mockStaffService.getAllStaff.mockRejectedValue(new Error('Database error'));
            await expect(controller.getAllStaff()).rejects.toThrow('Database error');
        });
    });

    describe('registerStaffForAdmin', () => {
        it('should register a new staff member', async () => {
            const registerDto = {
                email: 'newstaff@example.com',
                password: 'Password@123',
                fullName: 'New Staff',
                phoneNumber: '1234567890',
                roleIds: ['role_1'],
            };

            mockStaffService.registerStaffForAdmin.mockResolvedValue(mockStaff);

            const result = await controller.registerStaffForAdmin(registerDto);

            expect(service.registerStaffForAdmin).toHaveBeenCalledWith(registerDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Staff registered successfully',
                data: expect.anything(),
            });
        });

        it('should propagate errors from service', async () => {
            mockStaffService.registerStaffForAdmin.mockRejectedValue(
                new Error('User with this email already exists'),
            );
            await expect(
                controller.registerStaffForAdmin({
                    email: 'x@x.com',
                    password: 'p',
                    fullName: 'F',
                    roleIds: [],
                } as any),
            ).rejects.toThrow('User with this email already exists');
        });
    });

    describe('updateStaffForAdmin', () => {
        it('should update staff member', async () => {
            const updateDto = {
                fullName: 'Updated Name',
            };

            const updatedStaff = {
                ...mockStaff,
                fullName: updateDto.fullName,
            };

            mockStaffService.updateStaffForAdmin.mockResolvedValue(updatedStaff);

            const result = await controller.updateStaffForAdmin(updateDto, 'staff_123');

            expect(service.updateStaffForAdmin).toHaveBeenCalledWith('staff_123', updateDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Staff updated successfully',
                data: expect.anything(),
            });
        });

        it('should propagate errors from service', async () => {
            mockStaffService.updateStaffForAdmin.mockRejectedValue(new Error('Staff not found'));
            await expect(controller.updateStaffForAdmin({}, 'invalid_id')).rejects.toThrow(
                'Staff not found',
            );
        });
    });

    describe('deleteAccountForAdmin', () => {
        it('should delete staff account', async () => {
            mockStaffService.deleteAccountForAdmin.mockResolvedValue(undefined);

            const result = await controller.deleteAccountForAdmin('staff_123');

            expect(service.deleteAccountForAdmin).toHaveBeenCalledWith('staff_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Account deleted successfully',
            });
        });

        it('should propagate errors from service', async () => {
            mockStaffService.deleteAccountForAdmin.mockRejectedValue(new Error('Staff not found'));
            await expect(controller.deleteAccountForAdmin('invalid_id')).rejects.toThrow(
                'Staff not found',
            );
        });
    });
});
