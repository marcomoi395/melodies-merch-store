import { Expose, Type } from 'class-transformer';

export class StaffRoleResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    permissions: string[];
}

export class StaffResponseDto {
    @Expose()
    id: string;

    @Expose()
    email: string;

    @Expose()
    fullName: string;

    @Expose()
    phone: string;

    @Expose()
    avatarUrl: string;

    @Expose()
    status: string;

    @Expose()
    createdAt: Date;

    @Expose()
    @Type(() => StaffRoleResponseDto)
    roles: StaffRoleResponseDto[];
}
