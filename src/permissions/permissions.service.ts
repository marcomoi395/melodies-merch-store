import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(private readonly prisma: PrismaService) {}

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
