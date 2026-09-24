import { randomUUID } from 'node:crypto';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';

@EventSubscriber()
export class UpdateTimestampSubscriber implements EntitySubscriberInterface {
    beforeInsert(event: InsertEvent<object>): void {
        this.setGeneratedUuid(event.entity, event.metadata.primaryColumns);
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

    private setGeneratedUuid(
        entity: object | undefined,
        primaryColumns: Array<{ propertyName: string; generationStrategy?: string }>,
    ): void {
        const generatedUuid = primaryColumns.find((column) => column.generationStrategy === 'uuid');
        if (!entity || !generatedUuid) {
            return;
        }

        const record = entity as Record<string, unknown>;
        if (record[generatedUuid.propertyName] === undefined) {
            record[generatedUuid.propertyName] = randomUUID();
        }
    }
}
