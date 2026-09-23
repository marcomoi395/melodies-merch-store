import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from 'src/database/entities/role.entity';
import { UserRoleEntity } from 'src/database/entities/user-role.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcryptjs';
import { formatPermission } from 'src/shared/helper/formatUserResponse';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { DataSource, In, IsNull, Repository } from 'typeorm';

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(UserEntity) private users: Repository<UserEntity>,
        @InjectRepository(RoleEntity) private roles: Repository<RoleEntity>,
        private dataSource: DataSource,
    ) {}

    async getAllStaff() {
        const staff = await this.users
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.userRoles', 'userRole')
            .leftJoinAndSelect('userRole.role', 'role')
            .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
            .leftJoinAndSelect('rolePermission.permission', 'permission')
            .where('user.status != :status', { status: 'deleted' })
            .andWhere('userRole.userId IS NOT NULL')
            .getMany();

        return staff.map((user) => formatPermission(user));
    }

    async registerStaffForAdmin(payload: RegisterStaffDto) {
        const { roleIds, email, password, ...userData } = payload;
        const findUser = await this.users.findOneBy({ email });

        if (findUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Check role existence
        const uniqueRoleIds = [...new Set(roleIds)];

        if (uniqueRoleIds.length > 0) {
            const existingRole = await this.roles.find({
                where: { id: In(uniqueRoleIds) },
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

        const newStaff = await this.dataSource.transaction(async (manager) => {
            const staff = await manager.save(UserEntity, {
                ...userData,
                passwordHash: hashPassword,
                email,
            });
            if (uniqueRoleIds.length) {
                await manager.insert(
                    UserRoleEntity,
                    uniqueRoleIds.map((roleId) => ({ userId: staff.id, roleId })),
                );
            }
            return manager.findOneOrFail(UserEntity, {
                where: { id: staff.id },
                relations: { userRoles: { role: { rolePermissions: { permission: true } } } },
            });
        });

        return formatPermission(newStaff);
    }

    async updateStaffForAdmin(id: string, payload: UpdateStaffDto) {
        const { roleIds, password, ...userData } = payload;

        const existingUser = await this.users.findOne({ where: { id, deletedAt: IsNull() } });
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
                const existingRole = await this.roles.find({
                    where: { id: In(uniqueRoleIds) },
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
        const updatedStaff = await this.dataSource.transaction(async (manager) => {
            await manager.save(UserEntity, {
                ...existingUser,
                ...userData,
                ...(hashPassword && { passwordHash: hashPassword }),
            });
            if (roleIds) {
                await manager.delete(UserRoleEntity, { userId: id });
                if (uniqueRoleIds.length) {
                    await manager.insert(
                        UserRoleEntity,
                        uniqueRoleIds.map((roleId) => ({ userId: id, roleId })),
                    );
                }
            }
            return manager.findOneOrFail(UserEntity, {
                where: { id },
                relations: { userRoles: { role: { rolePermissions: { permission: true } } } },
            });
        });

        return formatPermission(updatedStaff);
    }

    async deleteAccountForAdmin(id: string) {
        const user = await this.users.findOne({ where: { id, deletedAt: IsNull() } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.users.save({
            ...user,
            status: 'deleted',
            email: `deleted_${user.email}`,
            deletedAt: new Date(),
        });
    }
}
