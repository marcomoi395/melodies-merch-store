import { getMetadataArgsStorage } from 'typeorm';
import { CartEntity } from '../../src/database/entities/cart.entity';
import { CartItemEntity } from '../../src/database/entities/cart-item.entity';
import { OrderEntity } from '../../src/database/entities/order.entity';
import { OrderItemEntity } from '../../src/database/entities/order-item.entity';

describe('cart and order entity metadata', () => {
    it('preserves cart columns and composite uniqueness', () => {
        const columns = getMetadataArgsStorage().columns;
        const cart = columns.filter((column) => column.target === CartEntity);
        expect(
            getMetadataArgsStorage().tables.find((table) => table.target === CartEntity)?.name,
        ).toBe('carts');
        expect(cart.find((column) => column.propertyName === 'userId')?.options).toEqual(
            expect.objectContaining({ name: 'user_id', nullable: true }),
        );
        expect(cart.find((column) => column.propertyName === 'updatedAt')?.options).toEqual(
            expect.objectContaining({ name: 'updated_at', precision: 3 }),
        );
        expect(getMetadataArgsStorage().uniques).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: CartItemEntity,
                    columns: ['cartId', 'productId', 'productVariantId'],
                }),
            ]),
        );
    });

    it('preserves order monetary metadata and history delete actions', () => {
        const columns = getMetadataArgsStorage().columns;
        const order = columns.filter((column) => column.target === OrderEntity);
        const shippingAddress = order.find((column) => column.propertyName === 'shippingAddress');
        const discountAmount = order.find((column) => column.propertyName === 'discountAmount');
        expect({
            ...shippingAddress?.options,
            nullable: shippingAddress?.options.nullable ?? false,
        }).toEqual(
            expect.objectContaining({ name: 'shipping_address', type: 'jsonb', nullable: false }),
        );
        expect(discountAmount?.options).toEqual(
            expect.objectContaining({ name: 'discount_amount', type: 'decimal', nullable: true }),
        );
        expect(getMetadataArgsStorage().relations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: OrderItemEntity,
                    propertyName: 'product',
                    options: expect.objectContaining({ onDelete: 'SET NULL' }),
                }),
                expect.objectContaining({
                    target: OrderItemEntity,
                    propertyName: 'productVariant',
                    options: expect.objectContaining({ onDelete: 'SET NULL' }),
                }),
                expect.objectContaining({
                    target: OrderItemEntity,
                    propertyName: 'order',
                    options: expect.objectContaining({ onDelete: 'CASCADE' }),
                }),
            ]),
        );
    });
});
