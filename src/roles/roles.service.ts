import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { RolePermissionEntity } from 'src/database/entities/role-permission.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { UserRoleEntity } from 'src/database/entities/user-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { formatRoleResponse } from 'src/shared/helper/formatRoleResponse';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DataSource, In, IsNull, Repository } from 'typeorm';

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(RoleEntity) private roles: Repository<RoleEntity>,
        @InjectRepository(PermissionEntity) private permissions: Repository<PermissionEntity>,
        private dataSource: DataSource,
    ) {}

    async getRoles() {
        const roles = await this.roles.find({
            where: { deletedAt: IsNull() },
            relations: { rolePermissions: { permission: true } },
        });

        return roles.map((role) => formatRoleResponse(role));
    }

    async createNewRoleForAdmin(payload: CreateRoleDto) {
        const { name, description, permissionIds } = payload;
        const findRole = await this.roles.findOneBy({ name });

        if (findRole) {
            throw new ConflictException('Role with this name already exists');
        }

        const finalPermissionIds = permissionIds ? [...new Set(permissionIds)] : [];

        if (finalPermissionIds.length > 0) {
            const existingPermissions = await this.permissions.find({
                where: { id: In(finalPermissionIds) },
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

        const role = await this.dataSource.transaction(async (manager) => {
            const created = await manager.save(RoleEntity, { name, description });
            if (finalPermissionIds.length) {
                await manager.insert(
                    RolePermissionEntity,
                    finalPermissionIds.map((permissionId) => ({
                        roleId: created.id,
                        permissionId,
                    })),
                );
            }
            return manager.findOneOrFail(RoleEntity, {
                where: { id: created.id },
                relations: { rolePermissions: { permission: true } },
            });
        });

        return formatRoleResponse(role);
    }

    async updateRoleForAdmin(id: string, payload: UpdateRoleDto) {
        const { name, description, permissionIds } = payload;

        const existingRole = await this.roles.findOneBy({ id });
        if (!existingRole) {
            throw new NotFoundException('Role not found');
        }

        if (name && name !== existingRole.name) {
            const duplicateRole = await this.roles.findOneBy({ name });
            if (duplicateRole) {
                throw new ConflictException('Role with this name already exists');
            }
        }

        const finalPermissionIds = permissionIds ? [...new Set(permissionIds)] : [];

        if (finalPermissionIds.length > 0) {
            const existingPermissions = await this.permissions.find({
                where: { id: In(finalPermissionIds) },
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

        const updatedRole = await this.dataSource.transaction(async (manager) => {
            await manager.save(RoleEntity, {
                ...existingRole,
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
            });
            if (permissionIds !== undefined) {
                await manager.delete(RolePermissionEntity, { roleId: id });
                if (finalPermissionIds.length) {
                    await manager.insert(
                        RolePermissionEntity,
                        finalPermissionIds.map((permissionId) => ({ roleId: id, permissionId })),
                    );
                }
            }
            return manager.findOneOrFail(RoleEntity, {
                where: { id },
                relations: { rolePermissions: { permission: true } },
            });
        });

        return formatRoleResponse(updatedRole);
    }

    async deleteRoleForAdmin(id: string) {
        const existingRole = await this.roles.findOne({ where: { id, deletedAt: IsNull() } });

        if (!existingRole) {
            throw new NotFoundException('Role not found');
        }

        return this.dataSource.transaction(async (tx) => {
            // Hard delete records in the junction table (e.g., 'UserRole') to revoke access immediately
            await tx.delete(UserRoleEntity, { roleId: id });

            // Keep 'rolePermissions' intact to enable future restoration if needed
            return tx.save(RoleEntity, {
                ...existingRole,
                deletedAt: new Date(),
                name: `${existingRole.name}_deleted_${Date.now()}`,
            });
        });
    }
}
