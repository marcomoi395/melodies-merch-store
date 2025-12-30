import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PERMISSIONS_METADATA } from './permissions';

@Injectable()
export class PermissionsService implements OnModuleInit {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async onModuleInit() {
        await this.syncPermissions();
        await this.syncSuperAdminRole();
    }

    private async syncPermissions() {
        this.logger.log('Starting permission synchronization...');

        for (const permission of PERMISSIONS_METADATA) {
            await this.prisma.permission.upsert({
                where: {
                    name: permission.name,
                },
                update: {
                    resource: permission.resource,
                    action: permission.action,
                },
                create: {
                    name: permission.name,
                    resource: permission.resource,
                    action: permission.action,
                },
            });
        }

        this.logger.log('Permission synchronization completed.');
    }
    private async syncSuperAdminRole() {
        const allPermissions = await this.getPermisisons();

        await this.prisma.role.upsert({
            where: {
                name: 'SUPER_ADMIN',
            },
            update: {
                rolePermissions: {
                    deleteMany: {},
                    create: allPermissions.map((permission) => ({
                        permission: {
                            connect: { id: permission.id },
                        },
                    })),
                },
            },
            create: {
                name: 'SUPER_ADMIN',
                description: 'System Administrator with full access',
                rolePermissions: {
                    create: allPermissions.map((permission) => ({
                        permission: {
                            connect: { id: permission.id },
                        },
                    })),
                },
            },
        });
    }

    async getPermisisons() {
        const permissions = await this.prisma.permission.findMany({
            orderBy: {
                resource: 'asc',
            },
        });

        if (!permissions || permissions.length === 0) {
            throw new NotFoundException('No permissions found');
        }

        return permissions;
    }
}
