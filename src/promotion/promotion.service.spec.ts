import { Test, TestingModule } from '@nestjs/testing';
import { PromotionService } from './promotion.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DiscountType } from './dto/create-promotion.dto';

describe('PromotionService', () => {
    let service: PromotionService;
    let prisma: PrismaService;

    const mockPromotion = {
        id: 'promo_123',
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockPrismaService = {
        discount: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PromotionService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PromotionService>(PromotionService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllPromotionCodes', () => {
        it('should return all promotion codes', async () => {
            const mockPromotions = [mockPromotion];
            mockPrismaService.discount.findMany.mockResolvedValue(mockPromotions);

            const result = await service.getAllPromotionCodes();

            expect(prisma.discount.findMany).toHaveBeenCalled();
            expect(result).toEqual(mockPromotions);
        });
    });

    describe('createNewPromotionCode', () => {
        it('should create a new promotion code', async () => {
            const createDto = {
                code: 'NEWSALE',
                type: DiscountType.PERCENTAGE,
                value: 15,
                startDate: new Date(),
                endDate: new Date(),
            };

            mockPrismaService.discount.findUnique.mockResolvedValue(null);
            mockPrismaService.discount.create.mockResolvedValue({
                ...mockPromotion,
                code: createDto.code,
            });

            const result = await service.createNewPromotionCode(createDto);

            expect(prisma.discount.findUnique).toHaveBeenCalledWith({
                where: { code: createDto.code },
            });
            expect(prisma.discount.create).toHaveBeenCalled();
            expect(result.code).toBe(createDto.code);
        });

        it('should throw ConflictException if code already exists', async () => {
            const createDto = {
                code: 'EXISTING',
                type: DiscountType.PERCENTAGE,
                value: 10,
            };

            mockPrismaService.discount.findUnique.mockResolvedValue(mockPromotion);

            await expect(service.createNewPromotionCode(createDto)).rejects.toThrow(
                ConflictException,
            );
        });

        it('should throw BadRequestException if percentage value is invalid', async () => {
            const createDto = {
                code: 'INVALID',
                type: DiscountType.PERCENTAGE,
                value: 150,
            };

            mockPrismaService.discount.findUnique.mockResolvedValue(null);

            await expect(service.createNewPromotionCode(createDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('updatePromotionCode', () => {
        it('should update a promotion code', async () => {
            const updateDto = {
                value: 20,
            };

            mockPrismaService.discount.findUnique.mockResolvedValue(mockPromotion);
            mockPrismaService.discount.update.mockResolvedValue({
                ...mockPromotion,
                value: 20,
            });

            const result = await service.updatePromotionCode('promo_123', updateDto);

            expect(prisma.discount.findUnique).toHaveBeenCalledWith({
                where: { id: 'promo_123' },
            });
            expect(prisma.discount.update).toHaveBeenCalled();
            expect(result.value).toBe(20);
        });

        it('should throw NotFoundException if promotion not found', async () => {
            mockPrismaService.discount.findUnique.mockResolvedValue(null);

            await expect(service.updatePromotionCode('invalid_id', {})).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw BadRequestException if percentage value is invalid', async () => {
            const updateDto = {
                type: 'percentage' as any,
                value: 150,
            };

            mockPrismaService.discount.findUnique.mockResolvedValue(mockPromotion);

            await expect(service.updatePromotionCode('promo_123', updateDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('removePromotionCode', () => {
        it('should delete a promotion code', async () => {
            mockPrismaService.discount.findUnique.mockResolvedValue(mockPromotion);
            mockPrismaService.discount.delete.mockResolvedValue(mockPromotion);

            const result = await service.removePromotionCode('promo_123');

            expect(prisma.discount.findUnique).toHaveBeenCalledWith({
                where: { id: 'promo_123' },
            });
            expect(prisma.discount.delete).toHaveBeenCalledWith({
                where: { id: 'promo_123' },
            });
            expect(result).toEqual(mockPromotion);
        });

        it('should throw NotFoundException if promotion not found', async () => {
            mockPrismaService.discount.findUnique.mockResolvedValue(null);

            await expect(service.removePromotionCode('invalid_id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
