#!/usr/bin/env node
/**
 * 把 public/realsgan 下的推理二进制、模型与 DLL 准备到 src-tauri 的打包目录。
 *
 * - src-tauri/binaries/  Tauri sidecar，文件名必须带目标 triple 后缀
 * - src-tauri/resources/ Tauri 附加资源，运行时随安装包分发
 *
 * 模型和 DLL 在目标文件大小一致时跳过复制；macOS sidecar 提取为纯 arm64。
 * 产物目录被 .gitignore 忽略，仓库内的唯一真源仍是 public/realsgan。
 */
import { cp, chmod, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "public", "realsgan");
const binariesDir = join(root, "src-tauri", "binaries");
const resourcesDir = join(root, "src-tauri", "resources");

/** @type {{platform: string, from: string, to: string, executable?: boolean}[]} */
const binaries = [
  {
    platform: "darwin",
    from: "macos_realesrgan-ncnn-vulkan",
    to: "realesrgan-ncnn-vulkan-aarch64-apple-darwin",
    executable: true,
  },
  {
    platform: "win32",
    from: "realesrgan-ncnn-vulkan.exe",
    to: "realesrgan-ncnn-vulkan-x86_64-pc-windows-msvc.exe",
  },
];

const dlls = ["vcomp140.dll", "vcomp140d.dll"];

/** 目标文件已存在且大小相同时视为已准备完成 */
async function sameFileSize(src, dest) {
  try {
    const [a, b] = await Promise.all([stat(src), stat(dest)]);
    return a.size === b.size;
  } catch {
    return false;
  }
}

async function copyIfNeeded(src, dest, executable = false) {
  if (await sameFileSize(src, dest)) return false;
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, { force: true });
  if (executable) await chmod(dest, 0o755);
  return true;
}

async function main() {
  if (!existsSync(sourceDir)) {
    throw new Error(`找不到推理资源目录：${sourceDir}`);
  }

  let copied = 0;
  let skipped = 0;

  const selected = binaries.filter(binary => binary.platform === process.platform);
  if (selected.length === 0) {
    throw new Error("仅支持 macOS Apple Silicon 和 Windows x64 的资源准备");
  }

  // 清理旧版本生成的 Intel sidecar，防止开发目录继续保留该目标。
  await rm(join(binariesDir, "realesrgan-ncnn-vulkan-x86_64-apple-darwin"), { force: true });

  for (const binary of selected) {
    const src = join(sourceDir, binary.from);
    if (!existsSync(src)) {
      throw new Error(`缺少推理二进制：${src}`);
    }
    const dest = join(binariesDir, binary.to);
    if (binary.platform === "darwin") {
      const archs = execFileSync("lipo", ["-archs", src], { encoding: "utf8" }).trim().split(/\s+/);
      if (!archs.includes("arm64")) throw new Error("内置 macOS 推理程序缺少 arm64 架构");
      if (archs.length > 1) {
        await mkdir(binariesDir, { recursive: true });
        const temporary = `${dest}.tmp`;
        execFileSync("lipo", [src, "-thin", "arm64", "-output", temporary]);
        await chmod(temporary, 0o755);
        await rename(temporary, dest);
        copied += 1;
        continue;
      }
    }
    if (await copyIfNeeded(src, dest, binary.executable)) copied += 1;
    else skipped += 1;
  }

  for (const dll of dlls) {
    const src = join(sourceDir, dll);
    if (!existsSync(src)) {
      throw new Error(`缺少运行库：${src}`);
    }
    if (await copyIfNeeded(src, join(resourcesDir, dll))) copied += 1;
    else skipped += 1;
  }

  const modelSrc = join(sourceDir, "models");
  if (!existsSync(modelSrc)) {
    throw new Error(`缺少模型目录：${modelSrc}`);
  }
  const modelDest = join(resourcesDir, "models");
  await mkdir(modelDest, { recursive: true });
  for (const entry of await readdir(modelSrc, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (await copyIfNeeded(join(modelSrc, entry.name), join(modelDest, entry.name))) {
      copied += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(
    `[prepare-tauri-assets] 资源已就绪：复制 ${copied} 个文件，跳过 ${skipped} 个未变更文件`
  );
}

main().catch((error) => {
  console.error(`[prepare-tauri-assets] ${error.message}`);
  process.exit(1);
});
