import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductsByCategoryDto } from './dto/get-products-by-category.dto';

@Injectable()
export class CategoryService {
    constructor(private prisma: PrismaService) {}

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
                    status: 'active',
                },
                take: limit,
                skip: (page - 1) * limit,
                include: {
                    productVariants: true,
                    productArtists: true,
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
                    status: 'active',
                },
            }),
        ]);

        if (total === 0) {
            throw new NotFoundException('Products not found for this category');
        }

        return {
            data: products,
            meta: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                totalItems: total,
            },
        };
    }
}
