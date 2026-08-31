import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runbook = readFileSync(join(__dirname, '../../tasks/typeorm-adoption.md'), 'utf8');

describe('TypeORM adoption procedure', () => {
    it('documents non-destructive preflight and baseline safeguards', () => {
        expect(runbook).toContain('Abort on any drift');
        expect(runbook).toContain('Do not execute its `up()` method');
        expect(runbook).toContain('posts.is_pulished');
        expect(runbook).toContain('all 20 expected tables');
        expect(runbook).toContain('never reset or drop a shared or production database');
    });
});
