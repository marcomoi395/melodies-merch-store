import { NotFoundException } from '@nestjs/common';
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
});
