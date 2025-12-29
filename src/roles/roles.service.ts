import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) {}

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

        return await this.prisma.role.create({
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
    }
}
