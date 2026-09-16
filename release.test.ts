import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const packageVersion = vi.hoisted(() => ({ value: "7.1.0" }));
vi.mock("./package.json", () => ({ get version() { return packageVersion.value; } }));

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => { });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("release:metadata 脚本", () => {
  it("输出 package.json 中的版本号", async () => {
    packageVersion.value = "7.1.0";
    await import("./release");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"version": "7.1.0"'));
  });
  it("输出发布提示，提醒同步更新接口", async () => {
    await import("./release");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("api-gz.arsrna.cn"));
  });
  it("支持预发布版本", async () => {
    packageVersion.value = "7.2.0-beta.1+build.2";
    await import("./release");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("7.2.0-beta.1+build.2"));
  });
  it.each(["", "7.0", "not-a-version", "7.1.0.1"])("版本 %j 非法时抛出错误", async (version) => {
    packageVersion.value = version;
    await expect(import("./release")).rejects.toThrow("semver");
  });
});
