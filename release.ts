import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

/** 与 electron/main/index.ts 的 getAsarHash 保持一致：对 app.asar 文件内容求 sha256 */
const getHash = (file: string) =>
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const asarPaths = {
    macos: path.join('release', version, 'mac-arm64', 'ArSrNaUIESRGAN.app', 'Contents', 'Resources', 'app.asar'),
    windows: path.join('release', version, 'win-unpacked', 'resources', 'app.asar'),
};

const hash: Record<string, string> = {};
for (const [type, asarPath] of Object.entries(asarPaths)) {
    if (!fs.existsSync(asarPath)) {
        console.warn(`跳过 ${type}：未找到 ${asarPath}`);
        continue;
    }
    hash[type] = getHash(asarPath);
}

console.log({ hash });
console.log('请将以上 hash 按平台写入更新接口（api-gz.arsrna.cn）的 hash 字段');
