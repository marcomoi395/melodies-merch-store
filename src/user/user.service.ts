import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
    constructor(
        private prisma: PrismaService,
        private mailer: MailerService,
        private config: ConfigService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) {}

    async findOneByEmail(email: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where: { email: email },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
    }

    async getUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException("User doesn't exist");
        }

        return new UserEntity(user);
    }

    async updateProfileInfo(userId: string, payload: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException("User doesn't exist");
        }

        return await this.prisma.user.update({ where: { id: userId }, data: payload });
    }

    async changePassword(userId: string, payload: ChangePasswordDto) {
        if (payload.newPassword === payload.oldPassword) {
            throw new BadRequestException('New password must be different from old password');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.passwordHash) {
            throw new NotFoundException('User not found or invalid account state');
        }

        const isPasswordValid = await bcrypt.compare(payload.oldPassword, user.passwordHash);

        if (!isPasswordValid) {
            throw new BadRequestException("Old password doesn't match");
        }

        const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);

        return await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
    }

    async requestVerificationEmail(userId: string, email: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isVerified: true },
        });

        if (user && user.isVerified) {
            throw new BadRequestException('User is already verified');
        }

        const key = `verify-account:${userId}`;

        const ttl = await this.redis.ttl(key);

        if (ttl > 13 * 60) {
            throw new BadRequestException(
                "You can't request another verification email yet. Please try again later.",
            );
        }

        const token = this.generateRandomToken();
        const host = this.config.get<string>('API_URL');
        const url = `${host}/api/user/verify-account?userId=${userId}&token=${token}`;

        // Save token to Redis with expiration (15 minutes)
        await this.redis.set(key, token, 'EX', 15 * 60);

        await this.mailer.sendMail({
            to: email,
            subject: 'Xác thực tài khoản Melodies Merch Store',
            template: './verify-account',
            context: {
                url,
            },
        });
    }

    async verificationToken(userId: string, token: string) {
        const tokenKey = `verify-account:${userId}`;

        const savedToken = await this.redis.get(tokenKey);

        if (!savedToken || savedToken !== token) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        // Remove the key from Redis after successful verification
        await this.redis.del(tokenKey);

        await this.prisma.user.update({
            where: { id: userId },
            data: { isVerified: true },
        });
    }

    private generateRandomToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
