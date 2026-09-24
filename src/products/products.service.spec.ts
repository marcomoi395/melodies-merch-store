import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
    it('rejects a missing product detail', async () => {
        const query = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
        };
        const products = { createQueryBuilder: jest.fn().mockReturnValue(query) };
        const service = new ProductsService(
            products as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
        await expect(service.getProductDetail('missing')).rejects.toThrow(NotFoundException);
    });
});
