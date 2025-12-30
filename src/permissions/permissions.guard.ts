import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtPayload } from 'src/auth/auth.interface';
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
        const request: Request & { user: IJwtPayload } = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.sub) {
            throw new UnauthorizedException('Token is invalid or expired');
        }

        const permissionsData = await this.prisma.permission.findMany({
            where: {
                rolePermissions: {
                    some: {
                        role: {
                            userRoles: {
                                some: {
                                    userId: user.sub,
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
