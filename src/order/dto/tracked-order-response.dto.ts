import { Expose } from 'class-transformer';
import { OrderResponseDto } from './order-response.dto';

export class TrackedOrderResponseDto extends OrderResponseDto {
    @Expose()
    trackingCode: string | null;

    @Expose()
    currency: string;

    @Expose()
    updatedAt: Date;
}
