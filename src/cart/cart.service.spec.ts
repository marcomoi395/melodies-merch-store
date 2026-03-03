import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
    let service: CartService;
    let prisma: PrismaService;

    const mockCart = {
        id: 'cart_123',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockCartItem = {
        id: 'item_123',
        cartId: 'cart_123',
        productId: 'prod_123',
        productVariantId: 'var_123',
        quantity: 2,
    };

    const mockPrismaService = {
        cart: {
            findFirst: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
        },
        cartItem: {
            findFirst: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        productVariant: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CartService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<CartService>(CartService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getCart', () => {
        it('should return existing cart', async () => {
            const mockCartWithItems = {
                ...mockCart,
                cartItems: [],
            };

            mockPrismaService.cart.findFirst.mockResolvedValue(mockCartWithItems);

            const result = await service.getCart('user_123');

            expect(prisma.cart.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user_123' },
                }),
            );
            expect(result).toEqual(mockCartWithItems);
        });

        it('should create new cart if not exists', async () => {
            mockPrismaService.cart.findFirst.mockResolvedValue(null);
            mockPrismaService.cart.create.mockResolvedValue(mockCart);

            const result = await service.getCart('user_123');

            expect(prisma.cart.findFirst).toHaveBeenCalled();
            expect(prisma.cart.create).toHaveBeenCalledWith({
                data: { userId: 'user_123' },
            });
            expect(result).toEqual(mockCart);
        });
    });

    describe('addItemToCart', () => {
        const addToCartDto = {
            productId: 'prod_123',
            productVariantId: 'var_123',
            quantity: 2,
        };

        it('should add item to cart', async () => {
            const mockCartWithItems = { ...mockCart, cartItems: [] };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cart: {
                        upsert: jest.fn().mockResolvedValue(mockCart),
                    },
                    productVariant: {
                        findUnique: jest.fn().mockResolvedValue({ stockQuantity: 10 }),
                    },
                    cartItem: {
                        findFirst: jest.fn().mockResolvedValue(null),
                        upsert: jest.fn().mockResolvedValue(mockCartItem),
                    },
                };
                return callback(tx);
            });

            mockPrismaService.cart.findFirst.mockResolvedValue(mockCartWithItems);

            const result = await service.addItemToCart('user_123', addToCartDto);

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(result).toEqual(mockCartWithItems);
        });

        it('should throw NotFoundException if product variant not found', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cart: {
                        upsert: jest.fn().mockResolvedValue(mockCart),
                    },
                    productVariant: {
                        findUnique: jest.fn().mockResolvedValue(null),
                    },
                    cartItem: {
                        findFirst: jest.fn(),
                        upsert: jest.fn(),
                    },
                };
                return callback(tx);
            });

            await expect(service.addItemToCart('user_123', addToCartDto)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw BadRequestException if quantity exceeds stock', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cart: {
                        upsert: jest.fn().mockResolvedValue(mockCart),
                    },
                    productVariant: {
                        findUnique: jest.fn().mockResolvedValue({ stockQuantity: 1 }),
                    },
                    cartItem: {
                        findFirst: jest.fn().mockResolvedValue(null),
                        upsert: jest.fn(),
                    },
                };
                return callback(tx);
            });

            await expect(
                service.addItemToCart('user_123', { ...addToCartDto, quantity: 5 }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateCartItemQuantity', () => {
        it('should update cart item quantity', async () => {
            const mockCartWithItems = { ...mockCart, cartItems: [] };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cartItem: {
                        findFirst: jest.fn().mockResolvedValue({
                            ...mockCartItem,
                            cart: mockCart,
                            productVariant: { stockQuantity: 10 },
                        }),
                        update: jest.fn().mockResolvedValue(mockCartItem),
                    },
                };
                return callback(tx);
            });

            mockPrismaService.cart.findFirst.mockResolvedValue(mockCartWithItems);

            const result = await service.updateCartItemQuantity('user_123', 'item_123', 5);

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(result).toEqual(mockCartWithItems);
        });

        it('should delete cart item if quantity is 0', async () => {
            const mockCartWithItems = { ...mockCart, cartItems: [] };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cartItem: {
                        findFirst: jest.fn().mockResolvedValue({
                            ...mockCartItem,
                            cart: mockCart,
                            productVariant: { stockQuantity: 10 },
                        }),
                        delete: jest.fn().mockResolvedValue(mockCartItem),
                    },
                };
                return callback(tx);
            });

            mockPrismaService.cart.findFirst.mockResolvedValue(mockCartWithItems);

            const result = await service.updateCartItemQuantity('user_123', 'item_123', 0);

            expect(result).toEqual(mockCartWithItems);
        });

        it('should throw NotFoundException if cart item not found', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cartItem: {
                        findFirst: jest.fn().mockResolvedValue(null),
                    },
                };
                return callback(tx);
            });

            await expect(
                service.updateCartItemQuantity('user_123', 'invalid_id', 5),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if quantity exceeds stock', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    cartItem: {
                        findFirst: jest.fn().mockResolvedValue({
                            ...mockCartItem,
                            cart: mockCart,
                            productVariant: { stockQuantity: 3 },
                        }),
                    },
                };
                return callback(tx);
            });

            await expect(
                service.updateCartItemQuantity('user_123', 'item_123', 10),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('removeCartItem', () => {
        it('should remove cart item', async () => {
            const mockCartWithItems = { ...mockCart, cartItems: [] };

            mockPrismaService.cartItem.findFirst.mockResolvedValue(mockCartItem);
            mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);
            mockPrismaService.cart.findFirst.mockResolvedValue(mockCartWithItems);

            const result = await service.removeCartItem('user_123', 'item_123');

            expect(prisma.cartItem.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: 'item_123',
                        cart: { userId: 'user_123' },
                    }),
                }),
            );
            expect(prisma.cartItem.delete).toHaveBeenCalledWith({
                where: { id: 'item_123' },
            });
            expect(result).toEqual(mockCartWithItems);
        });

        it('should throw NotFoundException if cart item not found', async () => {
            mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

            await expect(service.removeCartItem('user_123', 'invalid_id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
