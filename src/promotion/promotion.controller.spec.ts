import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../permissions/permissions.guard';
import { DiscountType } from './dto/create-promotion.dto';

describe('PromotionController', () => {
    let controller: PromotionController;
    let service: PromotionService;

    const mockPromotion = {
        id: 'promo_123',
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
    };

    const mockPromotionService = {
        getAllPromotionCodes: jest.fn(),
        createNewPromotionCode: jest.fn(),
        updatePromotionCode: jest.fn(),
        removePromotionCode: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PromotionController],
            providers: [
                {
                    provide: PromotionService,
                    useValue: mockPromotionService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<PromotionController>(PromotionController);
        service = module.get<PromotionService>(PromotionService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllPromotionCodes', () => {
        it('should return all promotion codes', async () => {
            const mockPromotions = [mockPromotion];
            mockPromotionService.getAllPromotionCodes.mockResolvedValue(mockPromotions);

            const result = await controller.getAllPromotionCodes();

            expect(service.getAllPromotionCodes).toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 200,
                message: 'Promotions fetched successfully',
                data: expect.any(Array),
            });
        });

        it('should propagate errors from service', async () => {
            mockPromotionService.getAllPromotionCodes.mockRejectedValue(
                new Error('Database error'),
            );
            await expect(controller.getAllPromotionCodes()).rejects.toThrow('Database error');
        });
    });

    describe('createNewPromotionCode', () => {
        it('should create a new promotion code', async () => {
            const createDto = {
                code: 'NEWSALE',
                type: DiscountType.PERCENTAGE,
                value: 15,
            };

            mockPromotionService.createNewPromotionCode.mockResolvedValue(mockPromotion);

            const result = await controller.createNewPromotionCode(createDto);

            expect(service.createNewPromotionCode).toHaveBeenCalledWith(createDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Promotion created successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockPromotionService.createNewPromotionCode.mockRejectedValue(
                new Error('Promotion code already exists'),
            );
            await expect(
                controller.createNewPromotionCode({
                    code: 'EXISTING',
                    type: DiscountType.PERCENTAGE,
                    value: 10,
                }),
            ).rejects.toThrow('Promotion code already exists');
        });
    });

    describe('updatePromotionCode', () => {
        it('should update a promotion code', async () => {
            const updateDto = { value: 20 };
            const updatedPromotion = { ...mockPromotion, value: 20 };

            mockPromotionService.updatePromotionCode.mockResolvedValue(updatedPromotion);

            const result = await controller.updatePromotionCode(updateDto, 'promo_123');

            expect(service.updatePromotionCode).toHaveBeenCalledWith('promo_123', updateDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Promotion updated successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockPromotionService.updatePromotionCode.mockRejectedValue(
                new Error('Promotion not found'),
            );
            await expect(controller.updatePromotionCode({}, 'invalid_id')).rejects.toThrow(
                'Promotion not found',
            );
        });
    });

    describe('removePromotionCode', () => {
        it('should delete a promotion code', async () => {
            mockPromotionService.removePromotionCode.mockResolvedValue(undefined);

            const result = await controller.removePromotionCode('promo_123');

            expect(service.removePromotionCode).toHaveBeenCalledWith('promo_123');
            expect(result).toEqual({
                statusCode: 204,
                message: 'Promotion deleted successfully',
            });
        });

        it('should propagate errors from service', async () => {
            mockPromotionService.removePromotionCode.mockRejectedValue(
                new Error('Promotion not found'),
            );
            await expect(controller.removePromotionCode('invalid_id')).rejects.toThrow(
                'Promotion not found',
            );
        });
    });
});
