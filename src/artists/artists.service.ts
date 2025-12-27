import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetArtistsDto } from './dto/get-artists.dto';

@Injectable()
export class ArtistsService {
    constructor(private prisma: PrismaService) {}

    async getArtists(query: GetArtistsDto) {
        const { limit = 20, page = 1 } = query;

        const [total, artists] = await Promise.all([
            this.prisma.artist.count(),
            this.prisma.artist.findMany({
                take: limit,
                skip: (page - 1) * limit,
                include: {
                    productArtists: {
                        include: {
                            product: {
                                include: {
                                    category: true,
                                    productVariants: true,
                                },
                            },
                        },
                    },
                },
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

    async getArtistDetail(id: string) {
        const result = await this.prisma.artist.findUnique({
            where: { id },
            include: {
                productArtists: {
                    include: {
                        product: {
                            include: {
                                category: true,
                                productVariants: true,
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
}
