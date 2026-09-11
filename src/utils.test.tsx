import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CheckUpdate } from "./utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
const packageVersion = vi.hoisted(() => ({ value: "7.0.0" }));
vi.mock("../package.json", () => ({ get version() { return packageVersion.value; } }));

beforeEach(() => {
  packageVersion.value = "7.0.0";
  vi.spyOn(console, "error").mockImplementation(() => { });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
function respond(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status === 200, status, json: async () => body,
  }));
}

describe("检查更新", () => {
  it.each([
    ["7.0.0", "7.0.1", true],
    ["7.9.0", "7.10.0", true],
    ["7.0.0", "7.0.0", false],
    ["7.0.0", "6.9.9", false],
    ["7.0.0-beta.2", "7.0.0-beta.10", true],
    ["7.0.0-beta.1", "7.0.0", true],
    ["7.0.0", "7.0.0-beta.1", false],
    ["7.0.0+local", "7.0.0+remote", false],
  ])("当前 %s，远端 %s，更新提示 %s", async (current, remote, update) => {
    packageVersion.value = current;
    respond({ version: remote, link: "https://www.arsrna.cn/app/esrgan/#download" });
    await CheckUpdate();
    expect(toast.success).toHaveBeenCalledTimes(update ? 1 : 0);
    expect(toast.info).toHaveBeenCalledTimes(update ? 0 : 1);
    expect(toast.error).not.toHaveBeenCalled();
  });
  it.each([null, {}, { version: 7 }, { version: "7.0" }, { version: "invalid" }])("拒绝非法接口版本 %j", async (body) => {
    respond(body);
    await CheckUpdate();
    expect(toast.error).toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
  it("拒绝缺失的本地版本", async () => {
    packageVersion.value = "";
    respond({ version: "7.0.1" });
    await CheckUpdate();
    expect(fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
  it("处理 HTTP 错误", async () => {
    respond({}, 503);
    await CheckUpdate();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("503"));
  });
  it("处理网络错误", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await CheckUpdate();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("offline"));
  });
  it("拒绝无效下载地址", async () => {
    respond({ version: "7.0.1", link: "javascript:alert(1)" });
    await CheckUpdate();
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
