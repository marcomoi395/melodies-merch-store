import { Global, Module } from '@nestjs/common';
import { PermissionGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/database/entities/permission.entity';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([PermissionEntity])],
    controllers: [PermissionsController],
    providers: [PermissionsService, PermissionGuard],
    exports: [PermissionGuard],
})
export class PermissionsModule {}
