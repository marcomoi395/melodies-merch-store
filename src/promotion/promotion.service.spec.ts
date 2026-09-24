import { PromotionService } from './promotion.service';

describe('PromotionService', () => {
    it('lists promotion codes from the injected repository', async () => {
        const discounts = { find: jest.fn().mockResolvedValue([{ code: 'SAVE10' }]) };
        await expect(
            new PromotionService(discounts as any).getAllPromotionCodes(),
        ).resolves.toEqual([{ code: 'SAVE10' }]);
    });
});
