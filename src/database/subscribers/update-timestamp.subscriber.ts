import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';

@EventSubscriber()
export class UpdateTimestampSubscriber implements EntitySubscriberInterface {
    beforeInsert(event: InsertEvent<object>): void {
        this.setUpdatedAt(event.entity, event.metadata.updateDateColumn?.propertyName);
    }

    beforeUpdate(event: UpdateEvent<object>): void {
        this.setUpdatedAt(event.entity, event.metadata.updateDateColumn?.propertyName, true);
    }

    private setUpdatedAt(
        entity: object | undefined,
        propertyName: string | undefined,
        replace = false,
    ): void {
        if (!entity || !propertyName) {
            return;
        }

        const record = entity as Record<string, unknown>;
        if (replace || record[propertyName] === undefined) {
            record[propertyName] = new Date();
        }
    }
}
