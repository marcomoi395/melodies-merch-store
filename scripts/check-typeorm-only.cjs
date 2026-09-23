const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');

const root = resolve(process.argv[2] || process.cwd());
const ignored = new Set(['.git', '.scratch', 'coverage', 'dist', 'node_modules']);
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
        return entry.isDirectory() ? files(file) : statSync(file).isFile() ? [file] : [];
    });
}

const violations = files(root)
    .filter((file) => !file.endsWith('.lock'))
    .flatMap((file) => {
        const content = readFileSync(file, 'utf8');
        return forbidden.some((pattern) => pattern.test(content)) ? [relative(root, file)] : [];
    });

if (violations.length) {
    console.error(`Legacy ORM references found:\n${violations.join('\n')}`);
    process.exitCode = 1;
}
