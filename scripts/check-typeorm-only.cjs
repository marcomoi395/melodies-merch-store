const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');

const root = resolve(process.argv[2] || process.cwd());
const ignored = new Set(['.git', 'coverage', 'dist', 'node_modules', 'redis_data']);
const trackerRoot = resolve(root, '.scratch');
const legacyOrm = ['pris', 'ma'].join('');
const forbidden = [
    new RegExp(`@${legacyOrm}/`, 'i'),
    new RegExp(`\\b${legacyOrm}(?:client|service|module|pg)?\\b`, 'i'),
    new RegExp(`generated[\\\\/]${legacyOrm}`, 'i'),
    new RegExp(`${legacyOrm}[\\\\/]`, 'i'),
    new RegExp(`${legacyOrm}(?:_|-)enabled`, 'i'),
];

function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (ignored.has(entry.name)) return [];
        const file = join(directory, entry.name);
        if (entry.isDirectory()) return files(file);
        if (!statSync(file).isFile()) return [];
        if (
            file.startsWith(`${trackerRoot}/`) &&
            /^Status:\s*resolved\b/im.test(readFileSync(file, 'utf8').slice(0, 1000))
        ) {
            return [];
        }
        return [file];
    });
}

const violations = files(root)
    .flatMap((file) => {
        const content = readFileSync(file, 'utf8');
        return forbidden.some((pattern) => pattern.test(content)) ? [relative(root, file)] : [];
    });

if (violations.length) {
    console.error(`Legacy ORM references found:\n${violations.join('\n')}`);
    process.exitCode = 1;
}
