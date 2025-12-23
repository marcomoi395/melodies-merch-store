import { User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity {
    id: string;
    email: string;

    @Exclude()
    passwordHash: string | null;
    fullName: string | null;
    phone: string | null;
    provider: string | null;
    isVerified: boolean | null;
    status: string | null;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }

    canLogin(): boolean {
        if (this.status === 'active') {
            return true;
        } else {
            return false;
        }
    }
}
