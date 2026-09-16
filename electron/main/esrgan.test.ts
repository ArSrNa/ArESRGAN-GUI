import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import os from "node:os";
import path from "node:path";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

type Handler = (event: unknown, data?: unknown) => unknown;

/** 记录 ipcMain 注册的处理器，供测试直接调用 */
const handlers = vi.hoisted(() => new Map<string, Handler>());
const send = vi.hoisted(() => vi.fn());
const setProgressBar = vi.hoisted(() => vi.fn());
const spawnMock = vi.hoisted(() => vi.fn());
const getAssetPath = vi.hoisted(() =>
  vi.fn((...parts: string[]) => "/assets/" + parts.map((p) => p.replace(/^\.\//, "")).join("/"))
);

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
  },
}));
vi.mock("./index", () => ({
  getAssetPath,
  mainWindow: { setProgressBar, webContents: { send } },
}));
vi.mock("child_process", () => ({ spawn: spawnMock }));

import "./esrgan";

/** 可手动触发 stderr / error / exit 的假子进程 */
function fakeChild() {
  const child = new EventEmitter() as unknown as ChildProcessWithoutNullStreams;
  child.stderr = new EventEmitter() as ChildProcessWithoutNullStreams["stderr"];
  child.kill = vi.fn(() => true) as unknown as ChildProcessWithoutNullStreams["kill"];
  return child;
}

const modelPath = "/assets/realsgan/models";
const executablePath =
  os.type() === "Darwin"
    ? "/assets/realsgan/macos_realesrgan-ncnn-vulkan"
    : "/assets/realsgan/realesrgan-ncnn-vulkan.exe";

let root: string;
let input: string;
let child: ChildProcessWithoutNullStreams;

function invoke(data: unknown) {
  return handlers.get("esrgan")!({ sender: "test" }, data) as Promise<any>;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "esrgan-main-test-"));
  input = path.join(root, "photo.png");
  await writeFile(input, "image");
  child = fakeChild();
  spawnMock.mockReturnValue(child);
  vi.spyOn(console, "log").mockImplementation(() => { });
  vi.spyOn(console, "error").mockImplementation(() => { });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("主进程 esrgan IPC", () => {
  it("注册 esrgan 与 kill-esrgan 处理器", () => {
    expect(handlers.has("esrgan")).toBe(true);
    expect(handlers.has("kill-esrgan")).toBe(true);
  });

  it("输入文件不存在时拒绝且不启动子进程", async () => {
    const missing = path.join(root, "missing.png");
    await expect(invoke({ filepath: missing, model: "realesrgan-x4plus", output: { mode: "current" } })).rejects.toThrow(
      `文件不存在：${missing}`
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("原文件模式输出到源文件同级的 _opt.png", async () => {
    const promise = invoke({ filepath: input, model: "realesrgan-x4plus-anime", output: { mode: "current" } });
    expect(spawnMock).toHaveBeenCalledWith(executablePath, [
      "-i",
      input,
      "-o",
      `${input}_opt.png`,
      "-m",
      modelPath,
      "-n",
      "realesrgan-x4plus-anime",
    ]);
    child.emit("exit", 0, null);
    await expect(promise).resolves.toMatchObject({ type: "exit", code: 0, output: `${input}_opt.png` });
  });

  it("自定义模式写入所选目录并自动创建缺失目录", async () => {
    const outputDir = path.join(root, "results", "nested");
    const promise = invoke({ filepath: input, model: "realesrgan-x4plus", output: { mode: "custom", path: outputDir } });
    const outputPath = path.join(outputDir, "photo_opt.png");
    expect(spawnMock.mock.calls[0][1]).toEqual(["-i", input, "-o", outputPath, "-m", modelPath, "-n", "realesrgan-x4plus"]);
    child.emit("exit", 0, null);
    await expect(promise).resolves.toMatchObject({ output: outputPath });
  });

  it("子进程退出码原样返回", async () => {
    const promise = invoke({ filepath: input, model: "m", output: { mode: "current" } });
    child.emit("exit", 3, "SIGTERM");
    await expect(promise).resolves.toEqual({
      type: "exit",
      code: 3,
      signal: "SIGTERM",
      output: `${input}_opt.png`,
    });
    expect(setProgressBar).toHaveBeenLastCalledWith(-1);
    expect(send).toHaveBeenLastCalledWith("esrgan:stderr", { type: "exit", data: 3 });
  });

  it("转发 stderr 日志并将百分比换算为进度", async () => {
    const promise = invoke({ filepath: input, model: "m", output: { mode: "current" } });
    child.stderr.emit("data", Buffer.from("50.00%\n"));
    expect(setProgressBar).toHaveBeenCalledWith(0.5);
    expect(send).toHaveBeenCalledWith("esrgan:stdout", {
      type: "log",
      data: "50.00%\n",
      progress: 0.5,
    });
    child.emit("exit", 0, null);
    await promise;
  });

  it("子进程错误时上报并拒绝", async () => {
    const promise = invoke({ filepath: input, model: "m", output: { mode: "current" } });
    const error = new Error("ENOENT: 找不到可执行文件");
    child.emit("error", error);
    await expect(promise).rejects.toThrow("ENOENT");
    expect(setProgressBar).toHaveBeenLastCalledWith(-1);
    expect(send).toHaveBeenCalledWith("esrgan:stderr", {
      type: "error",
      data: `Process error: ${error.message}`,
    });
  });

  it("kill-esrgan 终止子进程并重置进度条", async () => {
    invoke({ filepath: input, model: "m", output: { mode: "current" } });
    expect(handlers.get("kill-esrgan")!({}, undefined)).toBeUndefined();
    expect(child.kill).toHaveBeenCalledWith("SIGINT");
    expect(setProgressBar).toHaveBeenLastCalledWith(-1);
    // 子进程已被清空，重复调用不会报错
    expect(() => handlers.get("kill-esrgan")!({}, undefined)).not.toThrow();
    expect(child.kill).toHaveBeenCalledTimes(1);
  });
});
