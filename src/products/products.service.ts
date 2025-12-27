import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductsDto } from './dto/get-products.dto';
import { Prisma, Product, ProductVariant } from 'generated/prisma/browser';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) {}

    async getProducts(query: GetProductsDto) {
        const {
            artistId,
            keyword,
            limit = 20,
            page = 1,
            price_min,
            price_max,
            sort,
            stock_status,
            type,
        } = query;

        const where: Prisma.ProductWhereInput = {
            // Filter by Artist
            ...(artistId &&
                artistId.length > 0 && {
                    artistId: { in: artistId },
                }),

            // Filter by Type
            ...(type &&
                type.length > 0 && {
                    productType: { in: type },
                }),

            // Search by Keyword
            ...(keyword && {
                OR: [
                    { name: { contains: keyword, mode: 'insensitive' } },
                    { description: { contains: keyword, mode: 'insensitive' } },
                ],
            }),

            // Filter by Price Range
            ...((price_min || price_max) && {
                variants: {
                    some: {
                        price: {
                            gte: price_min,
                            lte: price_max,
                        },
                    },
                },
            }),

            ...(stock_status && {
                variants: {
                    some: { stock: { gt: 0 } },
                },
            }),
        };

        let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

        if (sort) {
            switch (sort) {
                case 'price_asc':
                    orderBy = { minPrice: 'asc' };
                    break;
                case 'price_desc':
                    orderBy = { minPrice: 'desc' };
                    break;
                case 'newest':
                    orderBy = { createdAt: 'desc' };
                    break;
                case 'oldest':
                    orderBy = { createdAt: 'asc' };
                    break;
                default:
                    orderBy = { createdAt: 'desc' };
            }
        }

        const [total, products] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy,
                include: {
                    productVariants: true,
                    category: true,
                    productArtists: true,
                },
            }),
        ]);

        // Map Response
        const mappedData = products.map((p: Product & { productVariants: ProductVariant[] }) => {
            const variantPrices = p.productVariants.map((v) =>
                v.discountPercent
                    ? Number(v.originalPrice) * (1 - Number(v.discountPercent))
                    : Number(v.originalPrice),
            );
            const maxPrice = variantPrices.length ? Math.max(...variantPrices) : p.minPrice;

            return {
                ...p,
                maxPrice: maxPrice,
            };
        });

        return {
            data: mappedData,
            meta: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                totalItems: total,
            },
        };
    }

    async getProductDetail(id: string) {
        const result = await this.prisma.product.findUnique({
            where: { id },
            include: {
                productVariants: true,
                category: true,
                productArtists: true,
            },
        });

        if (!result) {
            throw new NotFoundException('Product not found');
        }

        return result;
    }
}
