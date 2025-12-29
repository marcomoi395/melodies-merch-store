import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from 'generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.get<{ resource: string; action: string }>(
            'permission',
            context.getHandler(),
        );

        if (!requiredPermission) {
            return true;
        }

        // Get userId from decoded token (req.user)
        const request: Request & { user: User } = context.switchToHttp().getRequest();
        const user: User = request.user;

        if (!user || !user.id) {
            throw new UnauthorizedException('Token is invalid or expired');
        }

        const permissionsData = await this.prisma.permission.findMany({
            where: {
                rolePermissions: {
                    some: {
                        role: {
                            userRoles: {
                                some: {
                                    userId: user.id,
                                },
                            },
                        },
                    },
                },
            },
            select: {
                name: true,
            },
        });

        const userPermissions = permissionsData.map((p) => p.name.toLowerCase());

        const targetPermission =
            `${requiredPermission.action}_${requiredPermission.resource}`.toLowerCase();

        const hasPermission = userPermissions.includes(targetPermission);

        if (!hasPermission) {
            throw new ForbiddenException(
                'User does not have the required permission to access this resource',
            );
        }

        return true;
    }
}
