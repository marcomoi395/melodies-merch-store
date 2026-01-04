import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcryptjs';
import { formatPermission } from 'src/shared/helper/formatUserResponse';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
    constructor(private prisma: PrismaService) {}

    async getAllStaff() {
        const staff = await this.prisma.user.findMany({
            where: {
                status: { not: 'deleted' },
                userRoles: {
                    some: {},
                },
            },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return staff.map((user) => formatPermission(user));
    }

    async registerStaffForAdmin(payload: RegisterStaffDto) {
        const { roleIds, email, password, ...userData } = payload;
        const findUser = await this.prisma.user.findUnique({ where: { email } });

        if (findUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Check role existence
        const uniqueRoleIds = [...new Set(roleIds)];

        if (uniqueRoleIds.length > 0) {
            const existingRole = await this.prisma.role.findMany({
                where: {
                    id: { in: uniqueRoleIds },
                },
                select: { id: true },
            });

            const existingRoleIds = existingRole.map((a) => a.id);

            const missingRoleIds = uniqueRoleIds.filter((id) => !existingRoleIds.includes(id));

            if (missingRoleIds.length > 0) {
                throw new BadRequestException(
                    'Some roles do not exist: ' + missingRoleIds.join(', '),
                );
            }
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const newStaff = await this.prisma.user.create({
            data: {
                ...userData,
                passwordHash: hashPassword,
                email,
                userRoles: {
                    create: uniqueRoleIds.map((roleId) => ({
                        role: {
                            connect: { id: roleId },
                        },
                    })),
                },
            },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return formatPermission(newStaff);
    }

    async updateStaffForAdmin(id: string, payload: UpdateStaffDto) {
        const { roleIds, password, ...userData } = payload;

        const existingUser = await this.prisma.user.findUnique({ where: { id, deletedAt: null } });
        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        // Handle roles
        let uniqueRoleIds: string[] = [];
        if (roleIds) {
            uniqueRoleIds = [...new Set(roleIds)];
            if (uniqueRoleIds.length !== roleIds.length) {
                throw new BadRequestException('Duplicate role IDs are not allowed');
            }

            if (uniqueRoleIds.length > 0) {
                const existingRole = await this.prisma.role.findMany({
                    where: {
                        id: { in: uniqueRoleIds },
                    },
                    select: { id: true },
                });

                const existingRoleIds = existingRole.map((a) => a.id);
                const missingRoleIds = uniqueRoleIds.filter((id) => !existingRoleIds.includes(id));

                if (missingRoleIds.length > 0) {
                    throw new BadRequestException(
                        'Some roles do not exist: ' + missingRoleIds.join(', '),
                    );
                }
            }
        }

        let hashPassword: string = '';
        if (password) {
            hashPassword = await bcrypt.hash(password, 10);
        }

        // 5. Update data
        const updatedStaff = await this.prisma.user.update({
            where: { id, deletedAt: null },
            data: {
                ...userData,
                ...(hashPassword && { passwordHash: hashPassword }),
                ...(roleIds && {
                    userRoles: {
                        deleteMany: {},
                        create: uniqueRoleIds.map((roleId) => ({
                            role: {
                                connect: { id: roleId },
                            },
                        })),
                    },
                }),
            },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return formatPermission(updatedStaff);
    }

    async deleteAccountForAdmin(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id, deletedAt: null } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.user.update({
            where: { id },
            data: {
                status: 'deleted',
                email: `deleted_${user.email}`,
                deletedAt: new Date(),
            },
        });
    }
}
