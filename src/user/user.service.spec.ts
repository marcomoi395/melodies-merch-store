import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserService } from './user.service';

describe('UserService', () => {
    it('reads a user through the injected repository', async () => {
        const user = { id: 'u1', email: 'a@example.com' };
        const users = { findOneBy: jest.fn().mockResolvedValue(user) };
        await expect(
            new UserService(users as any, {} as any, {} as any, {} as any).getUser(user.email),
        ).resolves.toBe(user);
    });

    it('translates missing profiles to NotFoundException', async () => {
        const service = new UserService(
            { findOneBy: jest.fn().mockResolvedValue(null) } as any,
            {} as any,
            {} as any,
            {} as any,
        );
        await expect(service.getUserProfile('missing')).rejects.toThrow(NotFoundException);
    });

    it('sends verification links to the customer application', async () => {
        const mailer = { sendMail: jest.fn() };
        const redis = {
            set: jest.fn().mockResolvedValue('OK'),
            ttl: jest.fn(),
        };
        const service = new UserService(
            {
                findOne: jest.fn().mockResolvedValue({ isVerified: false }),
            } as any,
            mailer as any,
            { get: jest.fn().mockReturnValue('https://shop.example.test') } as any,
            redis as any,
        );

        await service.requestVerificationEmail('u1', 'user@example.com');
        const context = mailer.sendMail.mock.calls[0][0].context;
        const verificationUrl = new URL(context.url);

        expect(verificationUrl.origin).toBe('https://shop.example.test');
        expect(verificationUrl.pathname).toBe('/verify-account');
        expect(verificationUrl.searchParams.get('token')).toBeTruthy();
    });

    it('revokes refresh sessions after a password change', async () => {
        const passwordHash = await bcrypt.hash('old-password', 4);
        const pipeline = { unlink: jest.fn(), exec: jest.fn().mockResolvedValue([]) };
        const redis = {
            scanStream: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                    yield ['whitelist:u1:session'];
                },
            }),
            pipeline: jest.fn().mockReturnValue(pipeline),
        };
        const users = {
            findOneBy: jest.fn().mockResolvedValue({ id: 'u1', passwordHash }),
            update: jest.fn().mockResolvedValue(undefined),
        };
        const service = new UserService(users as any, {} as any, {} as any, redis as any);

        await service.changePassword('u1', {
            oldPassword: 'old-password',
            newPassword: 'new-password',
        });

        expect(users.update).toHaveBeenCalledWith('u1', { passwordHash: expect.any(String) });
        expect(pipeline.unlink).toHaveBeenCalledWith('whitelist:u1:session');
    });
});
