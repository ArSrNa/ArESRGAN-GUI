import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CheckUpdate } from "./utils";
import { checkUpdate } from "./lib/desktop";

vi.mock("./lib/desktop", () => ({ checkUpdate: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
const info = { skipped: false, currentVersion: "8.0.0", latestVersion: "8.0.1", hasUpdate: true,
  link: "https://www.arsrna.cn/app/esrgan/#download", content: null };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkUpdate).mockReset().mockResolvedValue(info);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe("原生更新检查展示", () => {
  it("原生层报告新版本时显示下载入口", async () => {
    await CheckUpdate();
    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("没有更新时显示当前版本", async () => {
    vi.mocked(checkUpdate).mockResolvedValue({ ...info, hasUpdate: false });
    await CheckUpdate();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("8.0.0"));
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("开发环境跳过检查", async () => {
    vi.mocked(checkUpdate).mockResolvedValue({ ...info, skipped: true });
    await CheckUpdate();
    expect(toast.warning).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it.each([null, "javascript:alert(1)", "http://example.com", "invalid"])("拒绝无效下载地址 %s", async link => {
    vi.mocked(checkUpdate).mockResolvedValue({ ...info, link });
    await CheckUpdate();
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it.each([new Error("offline"), "HTTP 503"])("展示原生请求错误 %s", async error => {
    vi.mocked(checkUpdate).mockRejectedValue(error);
    await CheckUpdate();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(error instanceof Error ? error.message : error));
  });
});
