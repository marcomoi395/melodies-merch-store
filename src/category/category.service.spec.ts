import { CategoryService } from './category.service';

describe('CategoryService', () => {
    it('returns the category tree from the repository', async () => {
        const categories = { find: jest.fn().mockResolvedValue([{ id: 'c1' }]) };
        await expect(
            new CategoryService(categories as any, {} as any).getCategoryTree(),
        ).resolves.toEqual([{ id: 'c1' }]);
    });
});
