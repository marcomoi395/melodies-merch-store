import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArtistEntity } from 'src/database/entities/artist.entity';
import { ProductArtistEntity } from 'src/database/entities/product-artist.entity';
import { ProductEntity } from 'src/database/entities/product.entity';
import { ProductVariantEntity } from 'src/database/entities/product-variant.entity';
import { VariantAttributeEntity } from 'src/database/entities/variant-attribute.entity';
import { OrderItemEntity } from 'src/database/entities/order-item.entity';
import { CategoryService } from 'src/category/category.service';
import slugify from 'slugify';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(ProductEntity) private products: Repository<ProductEntity>,
        @InjectRepository(ArtistEntity) private artists: Repository<ArtistEntity>,
        @InjectRepository(ProductVariantEntity) private variants: Repository<ProductVariantEntity>,
        @InjectRepository(OrderItemEntity) private orderItems: Repository<OrderItemEntity>,
        private categoryService: CategoryService,
        private dataSource: DataSource,
    ) {}

    private queryWithRelations() {
        return this.products
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.productArtists', 'productArtist')
            .leftJoinAndSelect('productArtist.artist', 'artist')
            .leftJoinAndSelect('product.productVariants', 'variant', 'variant.deletedAt IS NULL')
            .leftJoinAndSelect('variant.attributes', 'attribute');
    }

    private cleanProduct(product: ProductEntity) {
        return {
            ...product,
            productArtists: product.productArtists.filter((item) => !item.artist.deletedAt),
            productVariants: product.productVariants.filter((item) => !item.deletedAt),
        };
    }

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
        const artistIds = artistId?.filter(Boolean) ?? [];
        const types = type?.filter(Boolean) ?? [];
        const build = () => {
            const qb = this.products
                .createQueryBuilder('product')
                .where('product.deletedAt IS NULL');
            if (status) {
                qb.andWhere('product.status = :status', { status });
            }
            if (types.length) {
                qb.andWhere('product.productType IN (:...types)', { types });
            }
            if (artistIds.length) {
                qb.innerJoin(
                    'product.productArtists',
                    'artistFilter',
                    'artistFilter.artistId IN (:...artistIds)',
                    { artistIds },
                );
            }
            if (keyword) {
                qb.andWhere(
                    new Brackets((where) =>
                        where
                            .where('product.name ILIKE :keyword', { keyword: `%${keyword}%` })
                            .orWhere('product.description ILIKE :keyword', {
                                keyword: `%${keyword}%`,
                            }),
                    ),
                );
            }
            if (price_min !== undefined || price_max !== undefined) {
                qb.innerJoin(
                    'product.productVariants',
                    'priceVariant',
                    'priceVariant.deletedAt IS NULL',
                )
                    .andWhere(
                        'priceVariant.originalPrice >= COALESCE(:priceMin, priceVariant.originalPrice)',
                        { priceMin: price_min },
                    )
                    .andWhere(
                        'priceVariant.originalPrice <= COALESCE(:priceMax, priceVariant.originalPrice)',
                        { priceMax: price_max },
                    );
            }
            if (stock_status) {
                qb.innerJoin(
                    'product.productVariants',
                    'stockVariant',
                    'stockVariant.stockQuantity > 0 AND stockVariant.deletedAt IS NULL',
                );
            }
            return qb;
        };
        const direction = sort === 'price_asc' || sort === 'oldest' ? 'ASC' : 'DESC';
        const column = sort?.startsWith('price') ? 'product.minPrice' : 'product.createdAt';
        const [total, products] = await Promise.all([
            build().distinct(true).getCount(),
            this.queryWithRelations()
                .where(`product.id IN (${build().select('product.id').distinct(true).getQuery()})`)
                .setParameters(build().getParameters())
                .orderBy(column, direction)
                .take(limit)
                .skip((page - 1) * limit)
                .getMany(),
        ]);
        return {
            data: products.map((product) => {
                const clean = this.cleanProduct(product);
                const maxPrice = Math.max(
                    ...clean.productVariants.map((variant) =>
                        variant.discountPercent
                            ? Number(variant.originalPrice) *
                              (1 - Number(variant.discountPercent) / 100)
                            : Number(variant.originalPrice),
                    ),
                );
                return { ...clean, maxPrice };
            }),
            meta: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                totalItems: total,
            },
        };
    }

    async getProductDetail(slug: string, status?: string) {
        const product = await this.queryWithRelations()
            .where('product.slug = :slug', { slug })
            .andWhere(status ? 'product.status = :status' : 'true', { status })
            .getOne();
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        const clean = this.cleanProduct(product);
        const maxPrice = Math.max(
            ...clean.productVariants.map((variant) =>
                variant.discountPercent
                    ? Number(variant.originalPrice) * (1 - Number(variant.discountPercent) / 100)
                    : Number(variant.originalPrice),
            ),
        );
        return { ...clean, maxPrice };
    }

    async createNewProductForAdmin(payload: CreateProductDto) {
        const { categoryId, artistIds, variants, name, ...productData } = payload;
        if (categoryId && !(await this.categoryService.isCategoryExists({ id: categoryId }))) {
            throw new NotFoundException(`Category with ID ${categoryId} not found`);
        }
        const uniqueArtistIds = [...new Set(artistIds ?? [])];
        if (uniqueArtistIds.length) {
            const found = await this.artists.find({
                where: { id: In(uniqueArtistIds) },
                select: { id: true },
            });
            const missing = uniqueArtistIds.filter(
                (id) => !found.some((artist) => artist.id === id),
            );
            if (missing.length) {
                throw new BadRequestException(`Artist IDs not found: ${missing.join(', ')}`);
            }
        }
        const skus = variants.map((variant) => variant.sku);
        const existingSku = await this.variants.findOne({ where: { sku: In(skus) } });
        if (existingSku) {
            throw new BadRequestException(`SKU '${existingSku.sku}' already exists`);
        }
        let slug = slugify(name, { lower: true, strict: true, locale: 'vi', trim: true });
        if (await this.products.findOneBy({ slug })) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
        }
        const minPrice = Math.min(
            ...variants.map((variant) =>
                variant.discountPercent
                    ? variant.originalPrice * ((100 - variant.discountPercent) / 100)
                    : variant.originalPrice,
            ),
        );
        const product = await this.dataSource.transaction(async (manager) => {
            const created = await manager.save(ProductEntity, {
                ...productData,
                name,
                slug,
                categoryId: categoryId ?? null,
                minPrice: String(minPrice),
            });
            if (uniqueArtistIds.length) {
                await manager.insert(
                    ProductArtistEntity,
                    uniqueArtistIds.map((artistId) => ({ productId: created.id, artistId })),
                );
            }
            for (const input of variants) {
                const variant = await manager.save(ProductVariantEntity, {
                    productId: created.id,
                    sku: input.sku,
                    name: input.name,
                    originalPrice: String(input.originalPrice),
                    discountPercent: String(input.discountPercent ?? 0),
                    stockQuantity: input.stockQuantity,
                    isPreorder: input.isPreorder ?? false,
                });
                if (input.attributes?.length) {
                    await manager.insert(
                        VariantAttributeEntity,
                        input.attributes.map((attribute) => ({
                            variantId: variant.id,
                            key: attribute.key,
                            value: attribute.value,
                        })),
                    );
                }
            }
            return created;
        });
        return this.getProductDetail(slug);
    }

    async updateProductForAdmin(id: string, payload: UpdateProductDto) {
        const { categoryId, artistIds, variants, ...productData } = payload;
        const product = await this.products.findOne({
            where: { id },
            relations: { productVariants: true },
        });
        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }
        if (categoryId && !(await this.categoryService.isCategoryExists({ id: categoryId }))) {
            throw new NotFoundException(`Category with ID ${categoryId} not found`);
        }
        if (variants?.length) {
            const skus = variants.map((variant) => variant.sku);
            if (new Set(skus).size !== skus.length) {
                throw new BadRequestException('Variant SKUs must be unique within the product.');
            }
            const existing = await this.variants.find({ where: { sku: In(skus) } });
            for (const variant of variants) {
                const conflict = existing.find(
                    (item) => item.sku === variant.sku && item.id !== variant.id,
                );
                if (conflict) {
                    throw new BadRequestException(
                        `SKU '${variant.sku}' has already been used in another variant of this product.`,
                    );
                }
            }
        }
        await this.dataSource.transaction(async (manager) => {
            await manager.save(ProductEntity, {
                ...product,
                ...productData,
                ...(categoryId && { categoryId }),
            });
            if (artistIds) {
                await manager.delete(ProductArtistEntity, { productId: id });
                if (artistIds.length) {
                    await manager.insert(
                        ProductArtistEntity,
                        artistIds.map((artistId) => ({ productId: id, artistId })),
                    );
                }
            }
            if (variants) {
                const incoming = variants.map((variant) => variant.id).filter(Boolean);
                const removed = product.productVariants.filter(
                    (variant) => !incoming.includes(variant.id) && !variant.deletedAt,
                );
                for (const variant of removed) {
                    if (await manager.existsBy(OrderItemEntity, { productVariantId: variant.id })) {
                        await manager.update(ProductVariantEntity, variant.id, {
                            deletedAt: new Date(),
                        });
                    } else {
                        await manager.delete(ProductVariantEntity, variant.id);
                    }
                }
                for (const input of variants) {
                    const variant = input.id
                        ? await manager.preload(ProductVariantEntity, {
                              id: input.id,
                              productId: id,
                          })
                        : manager.create(ProductVariantEntity, { productId: id });
                    if (!variant) {
                        throw new NotFoundException(
                            `Product variant with ID ${input.id} not found`,
                        );
                    }
                    await manager.save(ProductVariantEntity, {
                        ...variant,
                        sku: input.sku,
                        name: input.name,
                        originalPrice: String(input.originalPrice),
                        discountPercent: String(input.discountPercent ?? 0),
                        stockQuantity: input.stockQuantity,
                        isPreorder: input.isPreorder ?? false,
                        deletedAt: null,
                    });
                    await manager.delete(VariantAttributeEntity, { variantId: variant.id });
                    if (input.attributes?.length) {
                        await manager.insert(
                            VariantAttributeEntity,
                            input.attributes.map((attribute) => ({
                                variantId: variant.id,
                                key: attribute.key,
                                value: attribute.value,
                            })),
                        );
                    }
                }
            }
        });
        return this.getProductDetail(product.slug!);
    }

    async removeProductForAdmin(id: string) {
        const product = await this.products.findOneBy({ id });
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        if (!(await this.orderItems.existsBy({ productId: id }))) {
            await this.products.remove(product);
            return product;
        }
        await this.products.save({
            ...product,
            status: 'deleted',
            deletedAt: new Date(),
            slug: `${product.slug}-deleted-${Date.now()}`,
        });
    }
}
