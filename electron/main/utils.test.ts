import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { getHash } from "./utils";

const sha256 = (data: crypto.BinaryLike) =>
  crypto.createHash("sha256").update(data).digest("hex");

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "esrgan-hash-test-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("文件哈希", () => {
  it("返回文件内容的 sha256 十六进制摘要", async () => {
    const filePath = path.join(root, "app.asar");
    await writeFile(filePath, "asar-content");
    expect(getHash(filePath)).toBe(sha256("asar-content"));
    expect(getHash(filePath)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("二进制内容按字节计算", async () => {
    const filePath = path.join(root, "image.bin");
    const data = Buffer.from([0x00, 0xff, 0x10, 0x80]);
    await writeFile(filePath, data);
    expect(getHash(filePath)).toBe(sha256(data));
  });
  it("内容不同则摘要不同", async () => {
    const a = path.join(root, "a.bin");
    const b = path.join(root, "b.bin");
    await writeFile(a, "content-a");
    await writeFile(b, "content-b");
    expect(getHash(a)).not.toBe(getHash(b));
  });
  it("空文件同样有稳定的摘要", async () => {
    const filePath = path.join(root, "empty.bin");
    await writeFile(filePath, "");
    expect(getHash(filePath)).toBe(sha256(""));
  });
  it("文件不存在时抛出错误", () => {
    expect(() => getHash(path.join(root, "missing.asar"))).toThrow();
  });
});
