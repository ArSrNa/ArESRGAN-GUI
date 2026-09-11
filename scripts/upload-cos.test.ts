import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createUploadPlan, readConfig, uploadPlan } from "./upload-cos";

let root: string;
let output: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "esrgan-upload-test-"));
  output = path.join(root, "release", "7.1.0");
  await mkdir(output, { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "7.1.0" }));
  await writeFile(path.join(root, "electron-builder.json"), JSON.stringify({ directories: { output: "release/${version}" } }));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
async function artifact(name: string, contents = "installer") { await writeFile(path.join(output, name), contents); }

describe("COS 安装包选择", () => {
  it("只选择当前版本的 Windows 安装包，跳过目录、符号链接和辅助文件", async () => {
    await artifact("ArSrNaUIESRGAN_7.1.0.exe");
    await artifact("ArSrNaUIESRGAN_7.0.0.exe");
    await artifact("ArSrNaUIESRGAN_17.1.0.exe");
    await artifact("ArSrNaUIESRGAN_7.1.0-beta.1.exe");
    await artifact("ArSrNaUIESRGAN_7.1.0.exe.blockmap");
    await artifact("latest.yml");
    await mkdir(path.join(output, "directory_7.1.0.exe"));
    await mkdir(path.join(output, "win-unpacked"));
    await writeFile(path.join(output, "win-unpacked", "application.exe"), "app");
    await symlink(path.join(output, "ArSrNaUIESRGAN_7.1.0.exe"), path.join(output, "link_7.1.0.exe"));
    const plan = await createUploadPlan({ root, platform: "win32", arch: "x64" });
    expect(plan.files.map(f => f.key)).toEqual(["ArSrNaUI-ESRGAN/7.1.0/windows/x64/ArSrNaUIESRGAN_7.1.0.exe"]);
  });
  it("区分 macOS arm64、x64 和 universal", async () => {
    for (const suffix of ["", "-arm64", "-universal"]) await artifact(`ArSrNaUIESRGAN-7.1.0${suffix}.dmg`);
    for (const arch of ["x64", "arm64", "universal"]) {
      const plan = await createUploadPlan({ root, platform: "darwin", arch });
      expect(plan.files).toHaveLength(1);
      expect(plan.files[0].key).toContain(`/macos/${arch}/`);
    }
  });
  it("选择 Linux AppImage 和 Snap，识别 amd64，跳过其他架构", async () => {
    for (const name of ["ArSrNaUIESRGAN-7.1.0.AppImage", "esrganui_7.1.0_amd64.snap", "ArSrNaUIESRGAN-7.1.0-arm64.AppImage", "ArSrNaUIESRGAN_7.1.0.exe"]) await artifact(name);
    const plan = await createUploadPlan({ root, platform: "linux", arch: "x64" });
    expect(plan.files).toHaveLength(2);
    expect(plan.files.every(f => f.key.includes("/linux/x64/"))).toBe(true);
  });
  it("使用 builder 配置的输出目录及预发布版本", async () => {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "7.2.0-beta.1+build.2" }));
    await writeFile(path.join(root, "electron-builder.json"), JSON.stringify({ directories: { output: "artifacts/${version}" } }));
    const dir = path.join(root, "artifacts", "7.2.0-beta.1+build.2");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "App_7.2.0-beta.1+build.2.exe"), "installer");
    const plan = await createUploadPlan({ root, platform: "windows", arch: "x64", prefix: "releases/app" });
    expect(plan.files[0].key).toBe("releases/app/7.2.0-beta.1+build.2/windows/x64/App_7.2.0-beta.1+build.2.exe");
  });
  it("找不到安装包时失败", async () => {
    await expect(createUploadPlan({ root, platform: "windows", arch: "x64" })).rejects.toThrow("未找到");
  });
  it("缺少构建目录时失败", async () => {
    await rm(output, { recursive: true });
    await expect(createUploadPlan({ root })).rejects.toThrow("请先构建");
  });
  it("空安装包时失败", async () => {
    await artifact("App_7.1.0.exe", "");
    await expect(createUploadPlan({ root, platform: "windows", arch: "x64" })).rejects.toThrow("安装包为空");
  });
  it("拒绝非法版本", async () => {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "../escape" }));
    await expect(createUploadPlan({ root })).rejects.toThrow("semver");
  });
});

describe("COS 配置和 SDK 调用", () => {
  const credentials = { SECRET_ID: "test-id", SECRET_KEY: "test-key" };
  it.each([
    { COS_BUCKET: "test-123", COS_REGION: "ap-guangzhou" },
    { "APP_RELEASE.BUCKET": "test-123", "APP_RELEASE.REGION": "ap-guangzhou" },
    { APP_RELEASE: JSON.stringify({ BUCKET: "test-123", REGION: "ap-guangzhou" }) },
  ])("读取配置 %j", env => {
    expect(readConfig({ ...credentials, ...env })).toMatchObject({ Bucket: "test-123", Region: "ap-guangzhou" });
  });
  it("缺少配置时只报告变量名", () => {
    expect(() => readConfig(credentials)).toThrow("COS_BUCKET");
  });
  it("独立配置优先于 APP_RELEASE", () => {
    expect(readConfig({ ...credentials, COS_BUCKET: "test-123", COS_REGION: "ap-guangzhou", APP_RELEASE: "unused" })).toMatchObject({ Bucket: "test-123", Region: "ap-guangzhou" });
  });
  it("按计划传递分块上传参数", async () => {
    await artifact("App_7.1.0.exe");
    const plan = await createUploadPlan({ root, platform: "windows", arch: "x64" });
    const client = { uploadFile: vi.fn((_params, callback) => callback(null, {})) };
    await uploadPlan(plan, { Bucket: "test-123", Region: "ap-guangzhou" }, client, vi.fn());
    expect(client.uploadFile.mock.calls[0][0]).toMatchObject({ Bucket: "test-123", Region: "ap-guangzhou", Key: plan.files[0].key, FilePath: path.join(output, "App_7.1.0.exe"), SliceSize: 8388608 });
  });
  it("上传失败后停止，不输出 SDK 中的凭据", async () => {
    for (const name of ["App_7.1.0.exe", "Other_7.1.0.exe"]) await artifact(name);
    const plan = await createUploadPlan({ root, platform: "windows", arch: "x64" });
    const client = { uploadFile: vi.fn((_params, callback) => callback({ code: "AccessDenied", message: "SECRET", headers: { Authorization: "SECRET" } })) };
    await expect(uploadPlan(plan, { Bucket: "test-123", Region: "ap-guangzhou" }, client, vi.fn())).rejects.toThrow(/AccessDenied/);
    expect(client.uploadFile).toHaveBeenCalledTimes(1);
  });
});
