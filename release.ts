import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

const getHash = (str: string) => {
    return crypto.createHash('sha256').update(str).digest('hex');
};
const type = os.type();
const asarPath = type === "Darwin"
    ? path.join('release', version, '/mac-arm64/ArSrNaUIESRGAN.app/Contents/Resources/app.asar')
    : path.join(__dirname, "release", version, "/win-unpacked/resources/app.asar");


const hash = getHash(asarPath);
console.log({ asarPath, hash });