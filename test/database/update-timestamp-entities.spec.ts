import { getMetadataArgsStorage } from 'typeorm';
import { AuditLogEntity } from '../../src/database/entities/audit-log.entity';
import { CartEntity } from '../../src/database/entities/cart.entity';
import { DiscountEntity } from '../../src/database/entities/discount.entity';
import { OrderEntity } from '../../src/database/entities/order.entity';
import { PostEntity } from '../../src/database/entities/post.entity';
import { ProductVariantEntity } from '../../src/database/entities/product-variant.entity';
import { ProductEntity } from '../../src/database/entities/product.entity';
import { RoleEntity } from '../../src/database/entities/role.entity';
import { TransactionEntity } from '../../src/database/entities/transaction.entity';
import { UserEntity } from '../../src/database/entities/user.entity';

describe('TypeORM update timestamp entity metadata', () => {
    it.each([
        [UserEntity, true, undefined],
        [RoleEntity, true, undefined],
        [ProductEntity, false, 3],
        [ProductVariantEntity, false, 3],
        [CartEntity, false, 3],
        [OrderEntity, false, 3],
        [DiscountEntity, false, 3],
        [TransactionEntity, false, 3],
        [PostEntity, false, 3],
        [AuditLogEntity, false, 3],
    ])('%p keeps application update timestamp semantics', (entity, nullable, precision) => {
        const column = getMetadataArgsStorage().columns.find(
            (candidate) => candidate.target === entity && candidate.propertyName === 'updatedAt',
        );

        expect(column?.mode).toBe('updateDate');
        expect(column?.options).toEqual(
            expect.objectContaining({ name: 'updated_at', type: 'timestamp' }),
        );
        expect(column?.options.nullable ?? false).toBe(nullable);
        expect(column?.options.precision).toBe(precision);
    });
});
