import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArtistEntity } from 'src/database/entities/artist.entity';
import { OrderItemEntity } from 'src/database/entities/order-item.entity';
import { GetArtistsDto } from './dto/get-artists.dto';
import { CreateArtistDto } from './dto/create-artist.dto';
import slugify from 'slugify';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class ArtistsService {
    constructor(
        @InjectRepository(ArtistEntity) private artists: Repository<ArtistEntity>,
        @InjectRepository(OrderItemEntity) private orderItems: Repository<OrderItemEntity>,
    ) {}

    async getArtists(query: GetArtistsDto) {
        const { limit = 20, page = 1 } = query;

        const [total, artists] = await Promise.all([
            this.artists.count({ where: { deletedAt: IsNull() } }),
            this.artists.find({
                where: { deletedAt: IsNull() },
                take: limit,
                skip: (page - 1) * limit,
            }),
        ]);

        return {
            data: artists,
            meta: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                totalItems: total,
            },
        };
    }

    async getArtistDetail(slug: string) {
        const result = await this.artists.findOne({
            where: { slug, deletedAt: IsNull() },
            relations: {
                productArtists: {
                    product: {
                        category: true,
                        productArtists: { artist: true },
                        productVariants: { attributes: true },
                    },
                },
            },
        });

        if (!result) {
            throw new NotFoundException('Artist not found');
        }

        const { productArtists, ...restData } = result;

        // Calculate maxPrice for each product
        const mappedData = productArtists
            .filter((p) => p.product && !p.product.deletedAt && p.product.status === 'published')
            .map((p) => {
                const variants = p.product.productVariants.filter((variant) => !variant.deletedAt);
                const maxPrice = Math.max(
                    ...variants.map((variant) =>
                        variant.discountPercent
                            ? Number(variant.originalPrice) *
                              (1 - Number(variant.discountPercent) / 100)
                            : Number(variant.originalPrice),
                    ),
                );
                p.product['maxPrice'] = maxPrice;
                return p;
            });

        return {
            ...restData,
            productArtists: mappedData,
        };
    }

    async createArtistForAdmin(payload: CreateArtistDto) {
        const slug = slugify(payload.stageName, {
            lower: true,
            strict: true,
            locale: 'vi',
            trim: true,
        });

        if (await this.artists.findOneBy({ slug })) {
            throw new ConflictException('Artist with this stage name already exists');
        }
        return this.artists.save(this.artists.create({ ...payload, slug }));
    }

    async updateArtistForAdmin(id: string, payload: UpdateArtistDto) {
        let slug: string | undefined = undefined;
        if (payload.stageName) {
            slug = slugify(payload.stageName, {
                lower: true,
                strict: true,
                locale: 'vi',
                trim: true,
            });
        }

        const artist = await this.artists.findOneBy({ id });
        if (!artist) {
            throw new NotFoundException(`Artist with ID ${id} not found`);
        }
        if (slug && (await this.artists.findOneBy({ slug }))?.id !== id) {
            throw new ConflictException('Artist with this stage name already exists');
        }
        return this.artists.save({ ...artist, ...payload, ...(slug && { slug }) });
    }

    async deleteArtistForAdmin(id: string) {
        const findArtist = await this.artists.findOneBy({ id });
        if (!findArtist) {
            throw new NotFoundException('Artist not found');
        }

        const isUsedInOrders = await this.orderItems
            .createQueryBuilder('orderItem')
            .innerJoin('orderItem.product', 'product')
            .innerJoin('product.productArtists', 'productArtist', 'productArtist.artistId = :id', {
                id,
            })
            .getOne();

        if (isUsedInOrders) {
            return this.artists.save({ ...findArtist, deletedAt: new Date(), status: 'deleted' });
        }

        await this.artists.remove(findArtist);
        return findArtist;
    }
}
