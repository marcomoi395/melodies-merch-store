import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from 'generated/prisma/browser';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { v4 } from 'uuid';
import { IJwtPayload, IRegisterUser } from './auth.interface';

@Injectable()
export class AuthService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        private prisma: PrismaService,
        private user: UserService,
        private jwt: JwtService,
    ) {}

    async registerUserForClient(payload: IRegisterUser): Promise<User> {
        const findUser = await this.user.findOneByEmail(payload.email);
        if (findUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashPassword = await bcrypt.hash(payload.password, 10);

        const { password, ...userData } = payload;

        const newUser = await this.prisma.user.create({
            data: {
                ...userData,
                passwordHash: hashPassword,
            },
        });

        return new UserEntity(newUser);
    }

    async validateUser(email: string, password: string): Promise<User | null> {
        const findUser = await this.user.findOneByEmail(email);
        if (!findUser || !findUser.passwordHash) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, findUser.passwordHash);

        if (isPasswordValid) {
            const { passwordHash, ...userData } = findUser;
            return userData as User;
        }

        return null;
    }

    async login(user: User) {
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
        const pattern = `whitelist:${userId}:*`;
        const stream = this.redis.scanStream({
            match: pattern,
            count: 100,
        });

        for await (const chunk of stream) {
            const keys = chunk as string[];

            if (keys.length > 0) {
                const pipeline = this.redis.pipeline();
                keys.forEach((key) => {
                    pipeline.unlink(key);
                });

                await pipeline.exec();
            }
        }
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
}
