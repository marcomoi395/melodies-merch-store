import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('TypeORM-only guard', () => {
    it('accepts the active project tree', () => {
        const result = spawnSync(process.execPath, ['scripts/check-typeorm-only.cjs'], {
            cwd: join(__dirname, '../..'),
            encoding: 'utf8',
        });

        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
    });

    it('rejects legacy packages, imports, commands, generated paths, and runtime flags', () => {
        const fixture = mkdtempSync(join(tmpdir(), 'typeorm-guard-'));
        const legacyOrm = ['pris', 'ma'].join('');

        try {
            writeFileSync(
                join(fixture, 'active.ts'),
                [
                    `import client from '@${legacyOrm}/client';`,
                    `${legacyOrm} generate`,
                    `generated/${legacyOrm}/client`,
                    `${legacyOrm}_enabled=true`,
                ].join('\n'),
            );
            const result = spawnSync(
                process.execPath,
                ['scripts/check-typeorm-only.cjs', fixture],
                {
                    cwd: join(__dirname, '../..'),
                    encoding: 'utf8',
                },
            );

            expect(result.status).toBe(1);
            expect(result.stderr).toContain('active.ts');
        } finally {
            rmSync(fixture, { force: true, recursive: true });
        }
    });
});
