import fs from "fs-extra";
import crypto from 'crypto';

export function getHash(filePath: string) {
    // 读取文件内容
    const fileData = fs.readFileSync(filePath);
    // 计算文件哈希值
    const hash = crypto.createHash('sha256').update(fileData).digest('hex');
    return hash;
}