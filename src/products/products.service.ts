import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductsDto } from './dto/get-products.dto';
import { Prisma, Product, ProductVariant } from 'generated/prisma/browser';
import { CategoryService } from 'src/category/category.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        private prisma: PrismaService,
        private categoryService: CategoryService,
    ) {}

    async getProducts(query: GetProductsDto, status?: string) {
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
            this.prisma.product.count({
                where: {
                    ...where,
                    ...(status && { status }),
                },
            }),
            this.prisma.product.findMany({
                where: {
                    ...where,
                    ...(status && { status }),
                },
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

    async getProductDetail(slug: string, status?: string) {
        const result = await this.prisma.product.findFirst({
            where: { slug, ...(status && { status }) },
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

    async createNewProductForAdmin(payload: CreateProductDto) {
        const { categoryId, artistIds, variants, ...productData } = payload;

        if (categoryId) {
            const categoryExists = await this.categoryService.isCategoryExists({
                id: categoryId,
            });

            if (!categoryExists) {
                throw new NotFoundException(`Category with ID ${categoryId} not found`);
            }
        }

        const skus = variants.map((v) => v.sku);
        const existingSku = await this.prisma.productVariant.findFirst({
            where: { sku: { in: skus } },
        });

        if (existingSku) {
            throw new BadRequestException(`SKU '${existingSku.sku}' already exists`);
        }

        // Use Transaction
        return await this.prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    ...productData,
                    ...(categoryId
                        ? {
                              category: { connect: { id: categoryId } },
                          }
                        : {}),

                    ...(artistIds && artistIds.length > 0
                        ? {
                              productArtists: {
                                  create: artistIds.map((id: string) => ({
                                      artist: { connect: { id: id } },
                                  })),
                              },
                          }
                        : {}),

                    productVariants: {
                        create: variants.map((variant) => ({
                            sku: variant.sku,
                            name: variant.name,
                            originalPrice: variant.originalPrice,
                            discountPercent: variant.discountPercent || 0,
                            stockQuantity: variant.stockQuantity,
                            isPreorder: variant.isPreorder || false,
                            ...(variant.attributes && variant.attributes.length > 0
                                ? {
                                      attributes: {
                                          create: variant.attributes.map((attr) => ({
                                              key: attr.key,
                                              value: attr.value,
                                          })),
                                      },
                                  }
                                : {}),
                        })),
                    },
                },
                include: {
                    productVariants: {
                        include: {
                            attributes: true,
                        },
                    },
                    productArtists: true,
                    category: true,
                },
            });

            return newProduct;
        });
    }
}
