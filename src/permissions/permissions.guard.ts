import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { IJwtPayload } from 'src/auth/auth.interface';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRepository(PermissionEntity)
        private permissions: Repository<PermissionEntity>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<{
            resource: string;
            action: string;
        }>('permission', [context.getHandler(), context.getClass()]);

        if (!requiredPermission) {
            return true;
        }

        // Get userId from decoded token (req.user)
        const request: Request & { user: IJwtPayload } = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.sub) {
            throw new UnauthorizedException('Token is invalid or expired');
        }

        const permissionsData = await this.permissions
            .createQueryBuilder('permission')
            .innerJoin('permission.rolePermissions', 'rolePermission')
            .innerJoin('rolePermission.role', 'role')
            .innerJoin('role.userRoles', 'userRole', 'userRole.userId = :userId', {
                userId: user.sub,
            })
            .select('permission.name', 'name')
            .getRawMany<{ name: string }>();

        const userPermissions = permissionsData.map((p) => p.name.toLowerCase());

        const targetPermission =
            `${requiredPermission.resource}_${requiredPermission.action}`.toLowerCase();

        const hasPermission = userPermissions.includes(targetPermission);

        if (!hasPermission) {
            throw new ForbiddenException(
                'User does not have the required permission to access this resource',
            );
        }

        return true;
    }
}
