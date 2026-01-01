import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductsDto } from './dto/get-products.dto';
import { Prisma, Product, ProductVariant } from 'generated/prisma/browser';
import { CategoryService } from 'src/category/category.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import slugify from 'slugify';

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

        const validArtistIds = artistId?.filter((id) => id) || [];
        const validTypes = type?.filter((t) => t) || [];

        const where: Prisma.ProductWhereInput = {
            ...(validArtistIds.length > 0 && {
                artistId: { in: validArtistIds },
            }),

            // Filter by Type
            ...(validTypes.length > 0 && {
                productType: { in: validTypes },
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
                productVariants: {
                    some: {
                        originalPrice: {
                            gte: price_min,
                            lte: price_max,
                        },
                    },
                },
            }),

            ...(stock_status && {
                productVariants: {
                    some: { stockQuantity: { gt: 0 } },
                },
            }),
            deletedAt: null,
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
                    productVariants: {
                        include: {
                            attributes: true,
                        },
                    },
                    category: true,
                    productArtists: {
                        include: {
                            artist: true,
                        },
                    },
                },
            }),
        ]);

        // Map Response
        const mappedData = products.map((p: Product & { productVariants: ProductVariant[] }) => {
            const variantPrices = p.productVariants.map((v) =>
                v.discountPercent
                    ? Number(v.originalPrice) * (1 - Number(v.discountPercent) / 100)
                    : Number(v.originalPrice),
            );

            const maxPrice = Math.max(...variantPrices);

            return {
                ...p,
                maxPrice: Number(maxPrice),
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
                productVariants: {
                    include: {
                        attributes: true,
                    },
                },
                category: true,
                productArtists: {
                    include: {
                        artist: true,
                    },
                },
            },
        });
        if (!result) {
            throw new NotFoundException('Product not found');
        }

        const variantPrices = result.productVariants.map((v) =>
            v.discountPercent
                ? Number(v.originalPrice) * (1 - Number(v.discountPercent) / 100)
                : Number(v.originalPrice),
        );
        const maxPrice = Math.max(...variantPrices);

        return {
            ...result,
            maxPrice,
        };
    }

    async createNewProductForAdmin(payload: CreateProductDto) {
        const { categoryId, artistIds, variants, name, ...productData } = payload;

        if (categoryId) {
            const categoryExists = await this.categoryService.isCategoryExists({
                id: categoryId,
            });

            if (!categoryExists) {
                throw new NotFoundException(`Category with ID ${categoryId} not found`);
            }
        }

        if (artistIds && artistIds.length > 0) {
            const uniqueArtistIds = [...new Set(artistIds)];

            const existingArtists = await this.prisma.artist.findMany({
                where: {
                    id: { in: uniqueArtistIds },
                },
                select: { id: true },
            });

            const existingArtistIds = existingArtists.map((a) => a.id);

            const missingArtistIds = uniqueArtistIds.filter(
                (id) => !existingArtistIds.includes(id),
            );

            if (missingArtistIds.length > 0) {
                throw new BadRequestException(
                    `Artist IDs not found: ${missingArtistIds.join(', ')}`,
                );
            }
        }

        // Calculate lowest price from variants
        const prices = variants.map((variant) =>
            variant.discountPercent
                ? variant.originalPrice * ((100 - variant.discountPercent) / 100)
                : variant.originalPrice,
        );

        const minPrice = Math.min(...prices);

        const skus = variants.map((v) => v.sku);
        const existingSku = await this.prisma.productVariant.findFirst({
            where: { sku: { in: skus } },
        });

        if (existingSku) {
            throw new BadRequestException(`SKU '${existingSku.sku}' already exists`);
        }

        let slug = slugify(name, {
            lower: true,
            strict: true,
            locale: 'vi',
            trim: true,
        });

        const existingSlug = await this.prisma.product.findUnique({
            where: { slug: slug },
        });

        if (existingSlug) {
            const randomString = Math.random().toString(36).substring(2, 7);
            slug = `${slug}-${randomString}`;
        }

        // Use Transaction
        return await this.prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name,
                    slug,
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
                    minPrice,
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
                    productArtists: {
                        include: {
                            artist: true,
                        },
                    },
                    category: true,
                },
            });

            return newProduct;
        });
    }

    async updateProductForAdmin(id: string, payload: UpdateProductDto) {
        const { categoryId, artistIds, variants, ...productData } = payload;

        const existingProduct = await this.prisma.product.findUnique({
            where: { id },
            include: { productVariants: true },
        });

        if (!existingProduct) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        // Change slug if name is updated

        if (categoryId) {
            const categoryExists = await this.categoryService.isCategoryExists({
                id: categoryId,
            });
            if (!categoryExists) {
                throw new NotFoundException(`Category with ID ${categoryId} not found`);
            }
        }

        //  Validate Unique SKU
        if (variants && variants.length > 0) {
            const skuSet = new Set(variants.map((v) => v.sku));
            if (skuSet.size !== variants.length) {
                throw new BadRequestException('Variant SKUs must be unique within the product.');
            }

            const skus = variants.map((v) => v.sku).filter((sku) => sku !== undefined);

            const existingVariants = await this.prisma.productVariant.findMany({
                where: {
                    sku: { in: skus },
                },
                select: { id: true, sku: true, productId: true },
            });

            for (const inputVariant of variants) {
                const matchInDb = existingVariants.find((v) => v.sku === inputVariant.sku);

                if (matchInDb) {
                    if (matchInDb.productId !== id) {
                        throw new BadRequestException(
                            `SKU '${inputVariant.sku}' has already been used in another product.`,
                        );
                    }

                    if (inputVariant.id && matchInDb.id !== inputVariant.id) {
                        throw new BadRequestException(
                            `SKU '${inputVariant.sku}' has already been used in another variant of this product.`,
                        );
                    }

                    if (!inputVariant.id) {
                        throw new BadRequestException(
                            `SKU '${inputVariant.sku}' has already been used in another variant of this product.`,
                        );
                    }
                }
            }
        }

        // Transaction Update
        return await this.prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: { id },
                data: {
                    ...productData,
                    ...(categoryId
                        ? {
                              category: { connect: { id: categoryId } },
                          }
                        : {}),
                    ...(artistIds
                        ? {
                              productArtists: {
                                  deleteMany: {},
                                  create: artistIds.map((artistId) => ({
                                      artist: { connect: { id: artistId } },
                                  })),
                              },
                          }
                        : {}),
                },
            });

            // Handle Variants
            // Review each item in the submitted list:
            // - If a variant matching the SKU for this product is found -> Update
            // - If not found -> Create
            if (variants) {
                const incomingIds = variants.map((v) => v.id).filter((x) => x !== undefined);

                // Identify variants to be removed
                const variantsToRemove = await tx.productVariant.findMany({
                    where: {
                        productId: id,
                        id: { notIn: incomingIds },
                        deletedAt: null,
                    },
                    include: {
                        _count: {
                            select: { orderItems: true },
                        },
                    },
                });

                for (const variant of variantsToRemove) {
                    if (variant._count.orderItems > 0) {
                        // Soft delete if already referenced in orders
                        await tx.productVariant.update({
                            where: { id: variant.id },
                            data: { deletedAt: null },
                        });
                    } else {
                        // Hard delete if not referenced
                        await tx.productVariant.delete({
                            where: { id: variant.id },
                        });
                    }
                }

                for (const variant of variants) {
                    if (variant.id) {
                        await tx.productVariant.update({
                            where: { id: variant.id, productId: id },
                            data: {
                                sku: variant.sku,
                                name: variant.name,
                                originalPrice: variant.originalPrice,
                                discountPercent: variant.discountPercent || 0,
                                stockQuantity: variant.stockQuantity,
                                isPreorder: variant.isPreorder,
                                deletedAt: null,
                                attributes: {
                                    deleteMany: {},
                                    create: variant.attributes?.map((attr) => ({
                                        key: attr.key,
                                        value: attr.value,
                                    })),
                                },
                            },
                        });
                    } else {
                        await tx.productVariant.create({
                            data: {
                                productId: id,
                                sku: variant.sku,
                                name: variant.name,
                                originalPrice: variant.originalPrice,
                                discountPercent: variant.discountPercent || 0,
                                stockQuantity: variant.stockQuantity,
                                isPreorder: variant.isPreorder || false,
                                attributes: {
                                    create: variant.attributes?.map((attr) => ({
                                        key: attr.key,
                                        value: attr.value,
                                    })),
                                },
                            },
                        });
                    }
                }
            }

            return await tx.product.findUnique({
                where: { id },
                include: {
                    productVariants: {
                        where: { deletedAt: null },
                        include: { attributes: true },
                    },
                    productArtists: {
                        include: {
                            artist: true,
                        },
                    },
                    category: true,
                },
            });
        });
    }

    async removeProductForAdmin(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { orderItems: true },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.orderItems.length === 0) {
            return this.prisma.product.delete({ where: { id } });
        }

        return this.prisma.product.update({
            where: { id },
            data: {
                status: 'deleted',
                deletedAt: new Date(),
                slug: `${product.slug}-deleted-${Date.now()}`,
            },
        });
    }
}
