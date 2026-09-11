import { readFile, readdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import type COS from "cos-nodejs-sdk-v5";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { valid } from "semver";

type Platform = "windows" | "macos" | "linux";
type Architecture = "x64" | "arm64" | "ia32" | "armv7l" | "universal";
type Environment = Record<string, string | undefined>;

interface UploadConfig {
  SecretId: string;
  SecretKey: string;
  SecurityToken?: string;
  Bucket: COS.Bucket;
  Region: COS.Region;
}

interface UploadPlanOptions {
  root?: string;
  platform?: string;
  arch?: string;
  prefix?: string;
}

interface UploadFile {
  filePath: string;
  size: number;
  arch: Architecture;
  key: COS.Key;
}

interface UploadPlan {
  version: string;
  platform: Platform;
  /** 仅在显式传入 --arch 时存在；自动识别模式下每个产物各自带 arch */
  arch?: Architecture;
  files: UploadFile[];
}

export interface UploadClient {
  uploadFile(params: COS.UploadFileParams, callback: (error: COS.CosError) => void): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`缺少环境变量：${name}`);
  return value;
}

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const platforms: Record<string, Platform | undefined> = { win32: "windows", windows: "windows", darwin: "macos", macos: "macos", linux: "linux" };
const extensions: Record<Platform, readonly string[]> = { windows: [".exe"], macos: [".dmg"], linux: [".AppImage", ".snap"] };
const architectures: Record<string, Architecture | undefined> = { x64: "x64", amd64: "x64", x86_64: "x64", arm64: "arm64", aarch64: "arm64", ia32: "ia32", i386: "ia32", armv7l: "armv7l", armhf: "armv7l", universal: "universal" };
const APP_RELEASE_BUCKET_KEY = "APP_RELEASE_BUCKET";
const APP_RELEASE_REGION_KEY = "APP_RELEASE_REGION";
const DEFAULT_PREFIX = "app-release/ArSrNaUI-ESRGAN";

export function readConfig(env: Environment): UploadConfig {
  return {
    SecretId: requiredString(env.SECRET_ID, "SECRET_ID"),
    SecretKey: requiredString(env.SECRET_KEY, "SECRET_KEY"),
    SecurityToken: env.SESSION_TOKEN || undefined,
    Bucket: requiredString(env.COS_BUCKET || env[APP_RELEASE_BUCKET_KEY], `COS_BUCKET / ${APP_RELEASE_BUCKET_KEY}`),
    Region: requiredString(env.COS_REGION || env[APP_RELEASE_REGION_KEY], `COS_REGION / ${APP_RELEASE_REGION_KEY}`),
  };
}

export async function createUploadPlan({ root = projectRoot, platform: inputPlatform = process.platform, arch: inputArch, prefix = DEFAULT_PREFIX }: UploadPlanOptions = {}): Promise<UploadPlan> {
  const platform = platforms[inputPlatform];
  // arch 为可选筛选条件：不传时扫描全部当前版本安装包，逐个按文件名识别架构。
  const arch = inputArch === undefined ? undefined : architectures[inputArch];
  if (!platform) throw new Error("平台必须是 windows、macos 或 linux");
  if (inputArch !== undefined && (!arch || arch === "universal" && platform !== "macos")) throw new Error("不支持的目标架构");
  if (typeof prefix !== "string" || !prefix || prefix.includes("\\") || prefix.split("/").some(p => !p || p === "." || p === "..")) {
    throw new Error(`COS_PREFIX 必须是无首尾斜杠的有效目录，例如 ${DEFAULT_PREFIX}`);
  }
  const pkg: unknown = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  if (!isRecord(pkg) || typeof pkg.version !== "string" || !valid(pkg.version)) throw new Error("package.json 的 version 必须是有效 semver");
  const builder: unknown = JSON.parse(await readFile(path.join(root, "electron-builder.json"), "utf8"));
  const output = isRecord(builder) && isRecord(builder.directories) ? builder.directories.output : undefined;
  if (typeof output !== "string" || !output.includes("${version}")) throw new Error("electron-builder 的 output 必须包含 ${version}");
  const outputDir = path.resolve(root, output.replaceAll("${version}", pkg.version));
  const relative = path.relative(root, outputDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || outputDir.includes("${")) throw new Error("无法解析项目内的 builder 输出目录");
  let entries: Dirent[];
  try { entries = await readdir(outputDir, { withFileTypes: true }); }
  catch (error) {
    if (isRecord(error) && error.code === "ENOENT") throw new Error(`没有构建产物目录：${outputDir}，请先构建`);
    throw error;
  }
  const files: UploadFile[] = [];
  // Builder omits x64 in default DMG/AppImage names; Windows names omit all architectures, so fall back to the requested or host arch there.
  const fallbackArch: Architecture = platform === "windows" ? arch ?? architectures[process.arch] ?? "x64" : "x64";
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    // Only top-level installers: never upload unpacked applications, symlinks or debug files.
    const extension = extensions[platform].find(ext => entry.name.endsWith(ext));
    if (!entry.isFile() || !extension) continue;
    let stem = entry.name.slice(0, -extension.length);
    const endsWithVersion = (name: string): boolean => name.endsWith(`-${pkg.version}`) || name.endsWith(`_${pkg.version}`);
    const match = endsWithVersion(stem) ? null : stem.match(/[-_](x86_64|aarch64|universal|armv7l|arm64|amd64|armhf|ia32|i386|x64)$/);
    if (match) stem = stem.slice(0, -match[0].length);
    if (!endsWithVersion(stem)) continue;
    let fileArch = fallbackArch;
    if (match) {
      const named = architectures[match[1]];
      if (!named) continue;
      fileArch = named;
    }
    if (arch && fileArch !== arch) continue;
    const filePath = path.join(outputDir, entry.name);
    const { size } = await stat(filePath);
    if (!size) throw new Error(`安装包为空：${entry.name}`);
    files.push({ filePath, size, arch: fileArch, key: `${prefix}/${pkg.version}/${platform}/${fileArch}/${entry.name}` });
  }
  const target = arch ? `${platform}/${arch}` : `${platform}（自动识别架构）`;
  if (!files.length) throw new Error(`未找到 ${target} 的 ${pkg.version} 安装包（${extensions[platform].join("、")}）`);
  return { version: pkg.version, platform, arch, files };
}

export async function uploadPlan(
  plan: UploadPlan,
  config: Pick<UploadConfig, "Bucket" | "Region">,
  client: UploadClient,
  log: (message: string) => void = console.log,
): Promise<void> {
  for (const file of plan.files) {
    log(`上传：${file.key}（${(file.size / 1024 / 1024).toFixed(1)} MiB）`);
    await new Promise<void>((resolve, reject) => {
      client.uploadFile({
        Bucket: config.Bucket,
        Region: config.Region,
        Key: file.key,
        FilePath: file.filePath,
        SliceSize: 8 * 1024 * 1024,
      }, (error) => {
        // Do not print the SDK error object: it may contain authorization headers.
        if (error) {
          const code = typeof error.code === "string" && /^[A-Za-z0-9_]+$/.test(error.code) ? error.code : "UploadError";
          reject(new Error(`上传失败：${file.key}（${code}）`));
        } else resolve();
      });
    });
  }
  log(`上传完成：${plan.files.length} 个安装包，版本 ${plan.version}`);
}

export async function main(args: string[] = process.argv.slice(2), env: Environment = process.env): Promise<void> {
  const { values } = parseArgs({
    args, options: {
      platform: { type: "string" }, arch: { type: "string" },
      "dry-run": { type: "boolean", default: false }, help: { type: "boolean", default: false },
    }
  });
  if (values.help) {
    console.log("bun run upload:cos [--platform windows|macos|linux] [--arch x64|arm64|ia32|armv7l|universal] [--dry-run]");
    console.log("默认使用当前运行平台；不传 --arch 时扫描构建目录，按产物文件名自动识别架构并上传该版本的全部安装包。");
    console.log("例如 macOS 上的 ArSrNaUIESRGAN-7.1.0-arm64.dmg 会识别为 arm64。预览不需要 COS 凭据。");
    return;
  }
  const plan = await createUploadPlan({ platform: values.platform, arch: values.arch, prefix: env.COS_PREFIX || DEFAULT_PREFIX });
  if (values["dry-run"]) {
    for (const file of plan.files) console.log(`${file.filePath} -> ${file.key}（${file.arch}）`);
    console.log(`预览完成：${plan.files.length} 个安装包（${[...new Set(plan.files.map(f => f.arch))].join("、")}），未发送上传请求`);
    return;
  }
  const config = readConfig(env);
  const { default: COS } = await import("cos-nodejs-sdk-v5");
  const client = new COS({ SecretId: config.SecretId, SecretKey: config.SecretKey, SecurityToken: config.SecurityToken, Protocol: "https:" });
  await uploadPlan(plan, config, client);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
