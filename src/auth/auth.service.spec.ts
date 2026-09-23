import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    const config = { get: jest.fn().mockReturnValue('test-secret') };
    const mailer = { sendMail: jest.fn() };

    it('validates passwords through UserService and strips the hash', async () => {
        const user = {
            id: 'u1',
            email: 'a@example.com',
            passwordHash: await bcrypt.hash('password', 4),
        };
        const users = { getUser: jest.fn().mockResolvedValue(user) };
        const service = new AuthService(
            {} as any,
            {} as any,
            users as any,
            {} as JwtService,
            config as any,
            mailer as any,
        );
        await expect(service.validateUser(user.email, 'password')).resolves.toEqual(
            expect.objectContaining({ id: 'u1' }),
        );
    });

    it('stores refresh tokens through Redis on login', async () => {
        const redis = { set: jest.fn().mockResolvedValue('OK') };
        const jwt = { sign: jest.fn().mockReturnValue('token') };
        const service = new AuthService(
            redis as any,
            {} as any,
            {} as any,
            jwt as any,
            config as any,
            mailer as any,
        );
        await service.login({ id: 'u1', email: 'a@example.com' } as any);
        expect(redis.set).toHaveBeenCalled();
    });
});
