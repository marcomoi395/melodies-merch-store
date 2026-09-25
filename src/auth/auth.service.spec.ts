import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    const config = {
        get: jest.fn((key: string) =>
            key === 'CUSTOMER_APP_URL' ? 'https://shop.example.test' : 'test-secret',
        ),
    };
    const mailer = { sendMail: jest.fn() };

    it('validates passwords through UserService and strips the hash', async () => {
        const user = {
            id: 'u1',
            email: 'a@example.com',
            passwordHash: await bcrypt.hash('password', 4),
        };
        const users = {
            getUserWithRole: jest
                .fn()
                .mockResolvedValue({ ...user, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] }),
        };
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

    it('rejects users without an admin or staff role', async () => {
        const users = {
            getUserWithRole: jest.fn().mockResolvedValue({
                id: 'u1',
                email: 'customer@example.com',
                passwordHash: await bcrypt.hash('password', 4),
                userRoles: [],
            }),
        };
        const service = new AuthService(
            {} as any,
            {} as any,
            users as any,
            {} as JwtService,
            config as any,
            mailer as any,
        );
        await expect(service.validateUser('customer@example.com', 'password')).resolves.toBeNull();
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

    it('returns successfully without side effects for an unknown reset email', async () => {
        const redis = { set: jest.fn(), get: jest.fn(), ttl: jest.fn() };
        const user = { getUser: jest.fn().mockResolvedValue(null) };
        const service = new AuthService(
            redis as any,
            {} as any,
            user as any,
            {} as JwtService,
            config as any,
            mailer as any,
        );

        await expect(service.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
        expect(redis.set).not.toHaveBeenCalled();
        expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('sends reset links to the customer application and revokes sessions', async () => {
        const pipeline = { unlink: jest.fn(), exec: jest.fn().mockResolvedValue([]) };
        const redis = {
            set: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue('u1'),
            del: jest.fn().mockResolvedValue(1),
            scanStream: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                    yield ['whitelist:u1:session'];
                },
            }),
            pipeline: jest.fn().mockReturnValue(pipeline),
        };
        const users = { update: jest.fn().mockResolvedValue(undefined) };
        const user = { getUser: jest.fn().mockResolvedValue({ id: 'u1' }) };
        const service = new AuthService(
            redis as any,
            users as any,
            user as any,
            {} as JwtService,
            config as any,
            mailer as any,
        );

        await expect(service.requestPasswordReset('known@example.com')).resolves.toBeUndefined();
        const context = mailer.sendMail.mock.calls.at(-1)[0].context;
        const resetUrl = new URL(context.url);
        const token = resetUrl.searchParams.get('token');

        expect(resetUrl.origin).toBe('https://shop.example.test');
        expect(resetUrl.pathname).toBe('/reset-password');
        expect(token).toBeTruthy();

        await service.resetPassword(token!, 'new-password');
        expect(users.update).toHaveBeenCalledWith(
            'u1',
            expect.objectContaining({ passwordHash: expect.any(String) }),
        );
        expect(pipeline.unlink).toHaveBeenCalledWith('whitelist:u1:session');
    });
});
