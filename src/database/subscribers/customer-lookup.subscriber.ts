import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';
import { customerLookup } from '../customer-encryption';

@EventSubscriber()
export class CustomerLookupSubscriber implements EntitySubscriberInterface<OrderEntity> {
    listenTo() {
        return OrderEntity;
    }

    beforeInsert(event: InsertEvent<OrderEntity>): void {
        this.updateLookups(event.entity);
    }
    beforeUpdate(event: UpdateEvent<OrderEntity>): void {
        this.updateLookups(event.entity);
    }

    private updateLookups(entity: Partial<OrderEntity> | undefined): void {
        if (!entity) {
            return;
        }
        if (entity.email !== undefined) {
            entity.emailLookup = customerLookup('email', entity.email);
        }
        if (entity.phone !== undefined) {
            entity.phoneLookup = customerLookup('phone', entity.phone);
        }
    }
}
