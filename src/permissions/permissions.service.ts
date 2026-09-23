import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(
        @InjectRepository(PermissionEntity)
        private readonly permissions: Repository<PermissionEntity>,
    ) {}

    async getPermisisons() {
        const permissions = await this.permissions.find({ order: { resource: 'ASC' } });

        if (permissions.length === 0) {
            throw new NotFoundException('No permissions found');
        }

        return permissions;
    }
}
