import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity as UserRecord } from 'src/database/entities/user.entity';
import { generateRandomToken } from 'src/shared/helper/generateRandomToken';
import { revokeAllTokens } from 'src/shared/helper/revokeAllTokens';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserRecord) private users: Repository<UserRecord>,
        private mailer: MailerService,
        private config: ConfigService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) {}

    async getUserWithRole(email: string): Promise<UserRecord | null> {
        return this.users.findOne({ where: { email }, relations: { userRoles: { role: true } } });
    }

    async getUser(email: string) {
        return this.users.findOneBy({ email });
    }

    async getUserProfile(userId: string) {
        const user = await this.users.findOneBy({ id: userId });

        if (!user) {
            throw new NotFoundException("User doesn't exist");
        }

        return new UserEntity(user);
    }

    async updateProfileInfo(userId: string, payload: UpdateUserDto) {
        const user = await this.users.findOneBy({ id: userId });

        if (!user) {
            throw new NotFoundException("User doesn't exist");
        }

        const result = await this.users.save({ ...user, ...payload });
        return new UserEntity(result);
    }

    async changePassword(userId: string, payload: ChangePasswordDto) {
        if (payload.newPassword === payload.oldPassword) {
            throw new BadRequestException('New password must be different from old password');
        }

        const user = await this.users.findOneBy({ id: userId });

        if (!user || !user.passwordHash) {
            throw new NotFoundException('User not found or invalid account state');
        }

        const isPasswordValid = await bcrypt.compare(payload.oldPassword, user.passwordHash);

        if (!isPasswordValid) {
            throw new BadRequestException("Old password doesn't match");
        }

        const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);

        await this.users.update(userId, { passwordHash: newPasswordHash });
        await revokeAllTokens(this.redis, userId);
    }

    async requestVerificationEmail(userId: string, email: string) {
        const user = await this.users.findOne({
            where: { id: userId },
            select: { isVerified: true },
        });

        if (user && user.isVerified) {
            throw new BadRequestException('User is already verified');
        }

        const limitKey = `verify-account_limit:${userId}`;
        const isAllowed = await this.redis.set(limitKey, '1', 'EX', 60, 'NX');

        if (!isAllowed) {
            const ttl = await this.redis.ttl(limitKey);
            throw new BadRequestException(
                'You can request a new verification email in ' + ttl + ' seconds',
            );
        }

        const token = generateRandomToken();
        const key = `verify-account:${token}`;
        const url = new URL('verify-account', `${this.config.get<string>('CUSTOMER_APP_URL')}/`);
        url.searchParams.set('token', token);

        // Save token to Redis with expiration (15 minutes)
        await this.redis.set(key, userId, 'EX', 15 * 60);

        await this.mailer.sendMail({
            to: email,
            subject: 'Xác thực tài khoản Melodies Merch Store',
            template: './verify-account',
            context: {
                url: url.toString(),
            },
        });
    }

    async verificationToken(token: string) {
        const key = `verify-account:${token}`;

        const userId = await this.redis.get(key);

        if (!userId) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        // Remove the key from Redis after successful verification
        await this.redis.del(key);

        await this.users.update(userId, { isVerified: true });
    }
}
