import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/database/entities/category.entity';
import { ProductEntity } from 'src/database/entities/product.entity';
import { GetProductsByCategoryDto } from './dto/get-products-by-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import slugify from 'slugify';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(CategoryEntity) private categories: Repository<CategoryEntity>,
        @InjectRepository(ProductEntity) private products: Repository<ProductEntity>,
    ) {}

    async isCategoryExists(payload: { id?: string; slug?: string }) {
        const { id, slug } = payload;

        if (!id && !slug) {
            return false;
        }

        const category = await this.categories
            .createQueryBuilder('category')
            .where(id ? 'category.id = :id' : 'false', { id })
            .orWhere(slug ? 'category.slug = :slug' : 'false', { slug })
            .select('category.id')
            .getOne();

        return !!category;
    }

    async getCategoryTree() {
        return this.categories.find();
    }

    async getProductsByCategory(query: GetProductsByCategoryDto, slug: string) {
        const { limit = 20, page = 1 } = query;

        const [products, total] = await Promise.all([
            this.products.find({
                where: { category: { slug }, status: 'published' },
                relations: {
                    category: true,
                    productArtists: { artist: true },
                    productVariants: { attributes: true },
                },
                take: limit,
                skip: (page - 1) * limit,
                order: { createdAt: 'DESC' },
            }),
            this.products.count({ where: { category: { slug }, status: 'published' } }),
        ]);

        if (total === 0) {
            throw new NotFoundException('Products not found for this category');
        }

        // Calculate maxPrice for each product
        const mappedData = products.map((p) => {
            const variantPrices = p.productVariants
                .filter((v) => !v.deletedAt)
                .map((v) =>
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
            const findParent = await this.categories.findOneBy({ id: data.parentId });

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

        if (await this.categories.findOneBy({ slug })) {
            throw new ConflictException('Category with this name already exists');
        }
        return this.categories.save(this.categories.create({ slug, ...data }));
    }

    async updateCategory(id: string, data: UpdateCategoryDto) {
        if (data.parentId && data.parentId === id) {
            throw new BadRequestException('Category cannot be its own parent');
        }

        if (data.parentId) {
            const findParent = await this.categories.findOneBy({ id: data.parentId });

            if (!findParent) {
                throw new NotFoundException('Parent category not found');
            }

            let currentParentId: string | null = data.parentId;

            while (currentParentId) {
                if (currentParentId === id) {
                    throw new BadRequestException('Circular category hierarchy is not allowed');
                }

                const parentCategory = await this.categories.findOne({
                    where: { id: currentParentId },
                    select: { parentId: true },
                });

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

        const category = await this.categories.findOneBy({ id });
        if (!category) {
            throw new NotFoundException('Category not found');
        }
        if (slug && (await this.categories.findOne({ where: { slug } }))?.id !== id) {
            throw new ConflictException('Category with this name/slug already exists');
        }
        return this.categories.save({ ...category, ...data, ...(slug && { slug }) });
    }

    async deleteCategoryForAdmin(id: string) {
        const countChild = await this.categories.count({ where: { parentId: id } });

        if (countChild > 0) {
            throw new BadRequestException(
                'Cannot delete category containing sub-categories. Please remove or move them first.',
            );
        }

        const category = await this.categories.findOneBy({ id });
        if (!category) {
            throw new NotFoundException('Category not found');
        }
        await this.categories.remove(category);
        return category;
    }
}
