import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductsByCategoryDto } from './dto/get-products-by-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import slugify from 'slugify';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
    constructor(private prisma: PrismaService) {}

    async isCategoryExists(payload: { id?: string; slug?: string }) {
        const { id, slug } = payload;

        if (!id && !slug) {
            return false;
        }

        const category = await this.prisma.category.findFirst({
            where: {
                OR: [...(id ? [{ id }] : []), ...(slug ? [{ slug }] : [])],
            },
            select: { id: true },
        });

        return !!category;
    }

    async getCategoryTree() {
        return await this.prisma.category.findMany();
    }

    async getProductsByCategory(query: GetProductsByCategoryDto, slug: string) {
        const { limit = 20, page = 1 } = query;

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where: {
                    category: {
                        slug: slug,
                    },
                    status: 'published',
                },
                take: limit,
                skip: (page - 1) * limit,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    shortDescription: true,
                    productType: true,
                    status: true,
                    minPrice: true,
                    mediaGallery: true,
                    category: {
                        select: {
                            name: true,
                            slug: true,
                        },
                    },

                    productArtists: {
                        where: {
                            artist: {
                                deletedAt: null,
                            },
                        },
                        select: {
                            artist: {
                                select: {
                                    id: true,
                                    stageName: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },

                    productVariants: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            name: true,
                            originalPrice: true,
                            discountPercent: true,
                            isPreorder: true,
                            stockQuantity: true,
                            attributes: {
                                select: {
                                    key: true,
                                    value: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.product.count({
                where: {
                    category: {
                        slug: slug,
                    },
                    status: 'published',
                },
            }),
        ]);

        if (total === 0) {
            throw new NotFoundException('Products not found for this category');
        }

        // Calculate maxPrice for each product
        const mappedData = products.map((p) => {
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

    async createCategory(data: CreateCategoryDto) {
        if (data.parentId) {
            const findParent = await this.prisma.category.findUnique({
                where: { id: data.parentId },
            });

            if (!findParent) {
                throw new NotFoundException('Parent category not found');
            }
        }

        const slug = slugify(data.name, {
            lower: true,
            strict: true,
            locale: 'vi',
            trim: true,
        });

        try {
            return await this.prisma.category.create({
                data: {
                    slug,
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Category with this name already exists');
            }

            throw error;
        }
    }

    async updateCategory(id: string, data: UpdateCategoryDto) {
        if (data.parentId && data.parentId === id) {
            throw new BadRequestException('Category cannot be its own parent');
        }

        if (data.parentId) {
            const findParent = await this.prisma.category.findUnique({
                where: { id: data.parentId },
            });

            if (!findParent) {
                throw new NotFoundException('Parent category not found');
            }

            let currentParentId: string | null = data.parentId;

            while (currentParentId) {
                if (currentParentId === id) {
                    throw new BadRequestException('Circular category hierarchy is not allowed');
                }

                const parentCategory = (await this.prisma.category.findUnique({
                    where: { id: currentParentId },
                    select: { parentId: true },
                })) as { parentId: string | null } | null;

                currentParentId = parentCategory?.parentId || null;
            }
        }

        let slug: string | null = null;
        if (data.name) {
            slug = slugify(data.name, {
                lower: true,
                strict: true,
                locale: 'vi',
                trim: true,
            });
        }

        try {
            return await this.prisma.category.update({
                where: { id },
                data: {
                    ...data,
                    ...(slug ? { slug } : {}),
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Category with this name/slug already exists');
                }

                if (error.code === 'P2025') {
                    throw new NotFoundException('Category not found');
                }
            }
            throw error;
        }
    }

    async deleteCategoryForAdmin(id: string) {
        const countChild = await this.prisma.category.count({
            where: { parentId: id },
        });

        if (countChild > 0) {
            throw new BadRequestException(
                'Cannot delete category containing sub-categories. Please remove or move them first.',
            );
        }

        try {
            return await this.prisma.category.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException('Category not found');
                }
            }

            throw error;
        }
    }
}
