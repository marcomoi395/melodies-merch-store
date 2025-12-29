import { SetMetadata } from '@nestjs/common';
export const RequiredPermission = (resource: string, action: string) =>
    SetMetadata('permission', { resource, action });
