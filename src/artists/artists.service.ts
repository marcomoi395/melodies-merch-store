import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetArtistsDto } from './dto/get-artists.dto';
import { CreateArtistDto } from './dto/create-artist.dto';
import slugify from 'slugify';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistsService {
    constructor(private prisma: PrismaService) {}

    async getArtists(query: GetArtistsDto) {
        const { limit = 20, page = 1 } = query;

        const [total, artists] = await Promise.all([
            this.prisma.artist.count(),
            this.prisma.artist.findMany({
                where: {
                    deletedAt: null,
                },
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
        const result = await this.prisma.artist.findUnique({
            where: { slug, deletedAt: null },
            include: {
                productArtists: {
                    include: {
                        product: {
                            include: {
                                category: true,
                                productVariants: {
                                    include: {
                                        attributes: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!result) {
            throw new NotFoundException('Artist not found');
        }

        return result;
    }

    async createArtistForAdmin(payload: CreateArtistDto) {
        const slug = slugify(payload.stageName, {
            lower: true,
            strict: true,
            locale: 'vi',
            trim: true,
        });

        try {
            return await this.prisma.artist.create({
                data: {
                    ...payload,
                    slug,
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Artist with this stage name already exists');
            }
            throw error;
        }
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

        try {
            return await this.prisma.artist.update({
                where: { id },
                data: {
                    ...payload,
                    ...(slug ? { slug } : {}),
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Artist with this stage name already exists');
            }
            throw error;
        }
    }

    async deleteArtistForAdmin(id: string) {
        const findArtist = await this.prisma.artist.findUnique({ where: { id } });
        if (!findArtist) {
            throw new NotFoundException('Artist not found');
        }

        const isUsedInOrders = await this.prisma.orderItem.findFirst({
            where: {
                product: {
                    productArtists: {
                        some: {
                            artistId: id,
                        },
                    },
                },
            },
        });

        if (isUsedInOrders) {
            return await this.prisma.artist.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    status: 'deleted',
                },
            });
        }

        return await this.prisma.artist.delete({ where: { id } });
    }
}
