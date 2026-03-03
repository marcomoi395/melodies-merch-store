import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthGuard } from '@nestjs/passport';

describe('CartController', () => {
    let controller: CartController;
    let service: CartService;

    const mockCart = {
        id: 'cart_123',
        userId: 'user_123',
        cartItems: [],
    };

    const mockCartService = {
        getCart: jest.fn(),
        addItemToCart: jest.fn(),
        updateCartItemQuantity: jest.fn(),
        removeCartItem: jest.fn(),
    };

    const mockUser = {
        sub: 'user_123',
        email: 'test@example.com',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CartController],
            providers: [
                {
                    provide: CartService,
                    useValue: mockCartService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CartController>(CartController);
        service = module.get<CartService>(CartService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getCart', () => {
        it('should return user cart', async () => {
            mockCartService.getCart.mockResolvedValue(mockCart);

            const result = await controller.getCart({ user: mockUser } as any);

            expect(service.getCart).toHaveBeenCalledWith('user_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Cart fetched successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockCartService.getCart.mockRejectedValue(new Error('Database error'));
            await expect(controller.getCart({ user: mockUser } as any)).rejects.toThrow(
                'Database error',
            );
        });
    });

    describe('addItemToCart', () => {
        it('should add item to cart', async () => {
            const addToCartDto = {
                productId: 'prod_123',
                productVariantId: 'var_123',
                quantity: 2,
            };

            mockCartService.addItemToCart.mockResolvedValue(mockCart);

            const result = await controller.addToCart({ user: mockUser } as any, addToCartDto);

            expect(service.addItemToCart).toHaveBeenCalledWith('user_123', addToCartDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Item added to cart successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockCartService.addItemToCart.mockRejectedValue(new Error('Product variant not found'));
            await expect(
                controller.addToCart(
                    { user: mockUser } as any,
                    { productVariantId: 'bad', quantity: 1 } as any,
                ),
            ).rejects.toThrow('Product variant not found');
        });
    });

    describe('updateCartItemQuantity', () => {
        it('should update cart item quantity', async () => {
            mockCartService.updateCartItemQuantity.mockResolvedValue(mockCart);

            const result = await controller.updateCartItemQuantity(
                { user: mockUser } as any,
                'item_123',
                5,
            );

            expect(service.updateCartItemQuantity).toHaveBeenCalledWith('user_123', 'item_123', 5);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Cart item quantity updated successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockCartService.updateCartItemQuantity.mockRejectedValue(
                new Error('Cart item not found'),
            );
            await expect(
                controller.updateCartItemQuantity({ user: mockUser } as any, 'invalid_id', 5),
            ).rejects.toThrow('Cart item not found');
        });
    });

    describe('removeCartItem', () => {
        it('should remove cart item', async () => {
            mockCartService.removeCartItem.mockResolvedValue(mockCart);

            const result = await controller.removeCartItem({ user: mockUser } as any, 'item_123');

            expect(service.removeCartItem).toHaveBeenCalledWith('user_123', 'item_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Cart item removed successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockCartService.removeCartItem.mockRejectedValue(new Error('Cart item not found'));
            await expect(
                controller.removeCartItem({ user: mockUser } as any, 'invalid_id'),
            ).rejects.toThrow('Cart item not found');
        });
    });
});
