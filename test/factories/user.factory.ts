/**
 * Factory functions for generating test data
 */

export class UserFactory {
    static create(overrides: Partial<any> = {}) {
        return {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            email: `test.${Date.now()}@example.com`,
            fullName: 'Test User',
            phoneNumber: '1234567890',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }

    static createAdmin(overrides: Partial<any> = {}) {
        return this.create({
            email: `admin.${Date.now()}@melodies.com`,
            fullName: 'Admin User',
            ...overrides,
        });
    }
}

export class ProductFactory {
    static create(overrides: Partial<any> = {}) {
        return {
            id: 'prod_' + Math.random().toString(36).substr(2, 9),
            name: 'Test Product',
            slug: 'test-product-' + Date.now(),
            description: 'Test product description',
            shortDescription: 'Short description',
            categoryId: 'cat_123',
            productType: 'MERCH',
            status: 'PUBLISHED',
            mediaGallery: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            productVariants: [],
            ...overrides,
        };
    }
}

export class CategoryFactory {
    static create(overrides: Partial<any> = {}) {
        return {
            id: 'cat_' + Math.random().toString(36).substr(2, 9),
            name: 'Test Category',
            slug: 'test-category-' + Date.now(),
            description: 'Test category description',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }
}

export class OrderFactory {
    static create(overrides: Partial<any> = {}) {
        return {
            id: 'order_' + Math.random().toString(36).substr(2, 9),
            userId: 'user_123',
            status: 'PENDING',
            totalAmount: 100000,
            shippingAddress: '123 Test St',
            paymentMethod: 'COD',
            createdAt: new Date(),
            updatedAt: new Date(),
            orderItems: [],
            ...overrides,
        };
    }
}

export class ArtistFactory {
    static create(overrides: Partial<any> = {}) {
        return {
            id: 'artist_' + Math.random().toString(36).substr(2, 9),
            name: 'Test Artist',
            slug: 'test-artist-' + Date.now(),
            bio: 'Test artist bio',
            avatarUrl: 'https://example.com/avatar.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }
}
