import { CartService } from './cart.service';

describe('CartService', () => {
    it('returns an existing cart with explicitly loaded relations', async () => {
        const cart = { id: 'c1', userId: 'u1', cartItems: [] };
        const carts = { findOne: jest.fn().mockResolvedValue(cart) };
        const dataSource = {
            transaction: jest.fn((callback) => callback({ findOne: carts.findOne })),
        };
        const service = new CartService(carts as any, {} as any, dataSource as any);
        await expect(service.getCart('u1')).resolves.toBe(cart);
        expect(carts.findOne).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ relations: expect.any(Object) }),
        );
    });
});
