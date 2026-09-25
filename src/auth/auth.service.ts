import { MailerService } from '@nestjs-modules/mailer';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity as UserRecord } from 'src/database/entities/user.entity';
import { generateRandomToken } from 'src/shared/helper/generateRandomToken';
import { revokeAllTokens } from 'src/shared/helper/revokeAllTokens';
import { UserEntity as UserResponse } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { v4 } from 'uuid';
import { Repository } from 'typeorm';
import { IJwtPayload, IRegisterUser } from './auth.interface';

@Injectable()
export class AuthService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        @InjectRepository(UserRecord) private users: Repository<UserRecord>,
        private user: UserService,
        private jwt: JwtService,
        private config: ConfigService,
        private mailer: MailerService,
    ) {}

    async registerUserForClient(payload: IRegisterUser): Promise<UserResponse> {
        const findUser = await this.user.getUser(payload.email);
        if (findUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashPassword = await bcrypt.hash(payload.password, 10);

        const { password, ...userData } = payload;

        const newUser = await this.users.save(
            this.users.create({ ...userData, passwordHash: hashPassword }),
        );

        return new UserResponse(newUser);
    }

    async validateUser(email: string, password: string): Promise<UserRecord | null> {
        const findUser = await this.user.getUserWithRole(email);
        if (!findUser || !findUser.passwordHash || !findUser.userRoles?.length) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, findUser.passwordHash);

        if (isPasswordValid) {
            const { passwordHash, ...userData } = findUser;
            return userData as UserRecord;
        }

        return null;
    }

    async login(user: UserRecord) {
        const tokenId = v4();
        const token = this.generateToken(user.id, user.email, tokenId);

        // Save the refresh token to redis
        const key = `whitelist:${user.id}:${tokenId}`;
        const ttl = 7 * 24 * 60 * 60;

        await this.redis.set(key, token.refreshToken, 'EX', ttl);

        return {
            ...token,
            user,
        };
    }

    async logout(refreshToken: string, userId: string) {
        try {
            const decode: IJwtPayload = this.jwt.verify(refreshToken);

            if (userId !== decode.sub) {
                throw new BadRequestException('Invalid token for user');
            }

            const key = `whitelist:${decode.sub}:${decode.jti}`;
            await this.redis.del(key);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Invalid refresh token');
        }
    }

    generateToken(userId: string, email: string, tokenId: string) {
        const payload: IJwtPayload = {
            sub: userId,
            email,
            jti: tokenId,
        };

        const accessToken = this.jwt.sign(payload, {
            expiresIn: '15m',
        });
        const refreshToken = this.jwt.sign(payload, {
            expiresIn: '7d',
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    async revokeAllTokens(userId: string): Promise<void> {
        await revokeAllTokens(this.redis, userId);
    }

    async refreshTokens(refreshToken: string) {
        try {
            const decode: IJwtPayload = this.jwt.verify(refreshToken);

            const key = `whitelist:${decode.sub}:${decode.jti}`;
            const findToken = await this.redis.get(key);

            if (!findToken) {
                throw new ForbiddenException('Refresh token expired or invalid');
            }

            // Because refresh tokens are one-time use, revoke all tokens if the provided token has been used
            if (refreshToken !== findToken) {
                await this.revokeAllTokens(decode.sub);
                throw new ForbiddenException('Access Denied');
            }
            const tokenId = v4();
            const token = this.generateToken(decode.sub, decode.email, tokenId);

            // Remove old refreshToken and save new refreshToken to redis
            await this.redis.del(key);
            const newKey = `whitelist:${decode.sub}:${tokenId}`;
            const ttl = 7 * 24 * 60 * 60;

            await this.redis.set(newKey, token.refreshToken, 'EX', ttl);

            return token;
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException('Invalid refresh token');
        }
    }

    async requestPasswordReset(email: string) {
        const user = await this.user.getUser(email);

        if (!user) {
            return;
        }

        const token = generateRandomToken();
        const key = `reset_password:${token}`;

        const limitKey = `reset_password_limit:${user.id}`;
        const isAllowed = await this.redis.set(limitKey, '1', 'EX', 60, 'NX');

        if (!isAllowed) {
            const ttl = await this.redis.ttl(limitKey);
            throw new BadRequestException(
                `You can request another password reset email in ${ttl} seconds`,
            );
        }

        const url = new URL('reset-password', `${this.config.get<string>('CUSTOMER_APP_URL')}/`);
        url.searchParams.set('token', token);

        // Save token to Redis with expiration (15 minutes)
        await this.redis.set(key, user.id, 'EX', 15 * 60);

        await this.mailer.sendMail({
            to: email,
            subject: 'Đặt lại mật khẩu Melodies Merch Store',
            template: './reset-password',
            context: {
                url: url.toString(),
            },
        });
    }

    async resetPassword(token: string, newPassword: string) {
        const key = `reset_password:${token}`;

        const userId = await this.redis.get(key);

        if (!userId) {
            throw new BadRequestException('Invalid or expired password reset token');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Remove the key from Redis after successful verification
        await this.redis.del(key);

        await this.users.update(userId, { passwordHash });
        await revokeAllTokens(this.redis, userId);
    }
}
