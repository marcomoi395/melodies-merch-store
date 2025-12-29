import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { formatRoleResponse } from 'src/shared/helper/formatRoleResponse';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) {}

    async getRoles() {
        const roles = await this.prisma.role.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        return roles.map((role) => formatRoleResponse(role));
    }

    async createNewRoleForAdmin(payload: CreateRoleDto) {
        const { name, description, permissionIds } = payload;
        const findRole = await this.prisma.role.findUnique({ where: { name } });

        if (findRole) {
            throw new ConflictException('Role with this name already exists');
        }

        const finalPermissionIds = permissionIds ? [...new Set(permissionIds)] : [];

        if (finalPermissionIds.length > 0) {
            const existingPermissions = await this.prisma.permission.findMany({
                where: {
                    id: { in: finalPermissionIds },
                },
                select: { id: true },
            });

            const existingIds = existingPermissions.map((p) => p.id);
            const missingIds = finalPermissionIds.filter((id) => !existingIds.includes(id));

            if (missingIds.length > 0) {
                throw new BadRequestException(
                    `Some permissions do not exist: ${missingIds.join(', ')}`,
                );
            }
        }

        const role = await this.prisma.role.create({
            data: {
                name,
                description,
                rolePermissions: {
                    create: finalPermissionIds.map((permissionId) => ({
                        permission: {
                            connect: { id: permissionId },
                        },
                    })),
                },
            },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        return formatRoleResponse(role);
    }

    async updateRoleForAdmin(id: string, payload: UpdateRoleDto) {
        const { name, description, permissionIds } = payload;

        const existingRole = await this.prisma.role.findUnique({ where: { id } });
        if (!existingRole) {
            throw new NotFoundException('Role not found');
        }

        if (name && name !== existingRole.name) {
            const duplicateRole = await this.prisma.role.findUnique({ where: { name } });
            if (duplicateRole) {
                throw new ConflictException('Role with this name already exists');
            }
        }

        const finalPermissionIds = permissionIds ? [...new Set(permissionIds)] : [];

        if (finalPermissionIds.length > 0) {
            const existingPermissions = await this.prisma.permission.findMany({
                where: { id: { in: finalPermissionIds } },
                select: { id: true },
            });

            const existingIds = existingPermissions.map((p) => p.id);
            const missingIds = finalPermissionIds.filter((id) => !existingIds.includes(id));

            if (missingIds.length > 0) {
                throw new BadRequestException(
                    `Some permissions do not exist: ${missingIds.join(', ')}`,
                );
            }
        }

        const updatedRole = await this.prisma.role.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(permissionIds !== undefined && {
                    rolePermissions: {
                        deleteMany: {},
                        create: finalPermissionIds.map((permissionId) => ({
                            permission: {
                                connect: { id: permissionId },
                            },
                        })),
                    },
                }),
            },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        return formatRoleResponse(updatedRole);
    }

    async deleteRoleForAdmin(id: string) {
        const existingRole = await this.prisma.role.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!existingRole) {
            throw new NotFoundException('Role not found');
        }

        return await this.prisma.$transaction(async (tx) => {
            // Hard delete records in the junction table (e.g., 'UserRole') to revoke access immediately
            await tx.userRole.deleteMany({
                where: { roleId: id },
            });

            // Keep 'rolePermissions' intact to enable future restoration if needed
            return await tx.role.update({
                where: { id },
                data: {
                    deletedAt: new Date(),

                    name: `${existingRole.name}_deleted_${Date.now()}`,
                    // No changes to rolePermissions
                },
            });
        });
    }
}
