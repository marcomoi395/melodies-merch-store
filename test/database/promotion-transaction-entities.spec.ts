import { getMetadataArgsStorage } from 'typeorm';
import { DiscountEntity } from '../../src/database/entities/discount.entity';
import { DiscountUsageEntity } from '../../src/database/entities/discount-usage.entity';
import { TransactionEntity } from '../../src/database/entities/transaction.entity';

describe('promotion and transaction entity metadata', () => {
    it('preserves discount defaults and mapped fields', () => {
        const columns = getMetadataArgsStorage().columns.filter(
            (column) => column.target === DiscountEntity,
        );
        const code = columns.find((column) => column.propertyName === 'code');
        expect(
            getMetadataArgsStorage().tables.find((table) => table.target === DiscountEntity)?.name,
        ).toBe('discounts');
        expect({ ...code?.options, name: code?.options.name ?? code?.propertyName }).toEqual(
            expect.objectContaining({ name: 'code', length: 50, unique: true, nullable: true }),
        );
        expect(columns.find((column) => column.propertyName === 'usedCount')?.options.default).toBe(
            0,
        );
        expect(columns.find((column) => column.propertyName === 'isActive')?.options.default).toBe(
            true,
        );
        expect(columns.find((column) => column.propertyName === 'appliesTo')?.options.default).toBe(
            'all',
        );
    });

    it('preserves usage and transaction relation actions', () => {
        expect(getMetadataArgsStorage().relations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: DiscountUsageEntity,
                    propertyName: 'discount',
                    options: expect.objectContaining({ onDelete: 'SET NULL' }),
                }),
                expect.objectContaining({
                    target: DiscountUsageEntity,
                    propertyName: 'user',
                    options: expect.objectContaining({ onDelete: 'CASCADE' }),
                }),
                expect.objectContaining({
                    target: DiscountUsageEntity,
                    propertyName: 'order',
                    options: expect.objectContaining({ onDelete: 'CASCADE' }),
                }),
                expect.objectContaining({
                    target: TransactionEntity,
                    propertyName: 'order',
                    options: expect.objectContaining({ onDelete: 'CASCADE' }),
                }),
            ]),
        );
        expect(
            getMetadataArgsStorage().columns.find(
                (column) =>
                    column.target === TransactionEntity && column.propertyName === 'rawResponse',
            )?.options,
        ).toEqual(expect.objectContaining({ name: 'raw_response', type: 'jsonb', nullable: true }));
    });
});
