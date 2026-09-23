import { NotFoundException } from '@nestjs/common';
import { StaffService } from './staff.service';

describe('StaffService', () => {
    it('rejects deletion of an unknown staff member', async () => {
        const service = new StaffService(
            { findOne: jest.fn().mockResolvedValue(null) } as any,
            {} as any,
            {} as any,
        );
        await expect(service.deleteAccountForAdmin('missing')).rejects.toThrow(NotFoundException);
    });
});
