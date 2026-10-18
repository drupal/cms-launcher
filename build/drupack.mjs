// Downloads the Drupack engine, which serves Drupal CMS with FrankenPHP, into ../bin.
// Each file must match the SHA-256 the release's checksums.txt lists for it. macOS gets
// both architectures, since the app is universal, and picks one at run time.
// @see https://www.drupal.org/project/drupack

import { createHash } from 'node:crypto';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const version = '1.0.0-beta6';
const release = `https://github.com/tresbientech/drupack/releases/download/${version}`;
const platform = { darwin: 'macos', linux: 'linux', win32: 'windows' }[process.platform];
const architectures = { x64: 'amd64', arm64: 'arm64' };
const suffix = process.platform === 'win32' ? '.exe' : '';

async function download (url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Cannot download ${url}: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

const checksums = new Map(
    (await download(`${release}/checksums.txt`)).toString().trim().split('\n')
        .map(line => line.trim().split(/\s+/).reverse()),
);
const bin = join(import.meta.dirname, '..', 'bin');
await mkdir(bin, { recursive: true });

for (const arch of process.platform === 'darwin' ? ['x64', 'arm64'] : [process.arch]) {
    const name = `drupack-${version}-${platform}-${architectures[arch]}${suffix}`;
    const data = await download(`${release}/${name}`);
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest !== checksums.get(name)) {
        throw new Error(`${name} does not match the SHA-256 that checksums.txt lists for it.`);
    }
    const file = join(bin, `drupack-${arch}${suffix}`);
    await writeFile(file, data);
    await chmod(file, 0o755);
    console.log(`Downloaded ${name} to ${file}`);
}
