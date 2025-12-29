import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcryptjs';
import { formatUserResponse } from 'src/shared/helper/formatUserResponse';

@Injectable()
export class StaffService {
    constructor(private prisma: PrismaService) {}

    async getAllStaff() {
        const staff = await this.prisma.user.findMany({
            where: {
                isDeleted: false,
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

        return staff.map((user) => formatUserResponse(user));
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

        return formatUserResponse(newStaff);
    }
}
