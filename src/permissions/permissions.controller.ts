import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get('')
    async getPermissions() {
        const result = await this.permissionsService.getPermisisons();

        return {
            statusCode: 200,
            message: 'Permissions fetched successfully',
            data: result,
        };
    }
}
