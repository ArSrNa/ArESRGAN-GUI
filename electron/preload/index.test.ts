import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ipcRenderer = { on: vi.fn(), off: vi.fn(), send: vi.fn(), invoke: vi.fn(), once: vi.fn() };
  const exposed = new Map<string, any>();
  const getPathForFile = vi.fn((file: File) => `/real/${file.name}`);
  return { ipcRenderer, exposed, getPathForFile };
});

vi.mock("electron", () => ({
  ipcRenderer: mocks.ipcRenderer,
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => mocks.exposed.set(key, value),
  },
  webUtils: { getPathForFile: mocks.getPathForFile },
}));

import "./index";

const api = () => mocks.exposed.get("ipcRenderer");
const lastWrapper = () => mocks.ipcRenderer.on.mock.calls.at(-1)![1] as (...args: unknown[]) => void;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("preload 暴露的 API", () => {
  it("通过 contextBridge 暴露 ipcRenderer 与 webUtils", () => {
    expect([...mocks.exposed.keys()].sort()).toEqual(["ipcRenderer", "webUtils"]);
  });

  it("on 透传事件参数并转发给监听器", () => {
    const listener = vi.fn();
    api().on("esrgan:stdout", listener);
    expect(mocks.ipcRenderer.on).toHaveBeenCalledWith("esrgan:stdout", expect.any(Function));

    lastWrapper()({ sender: "renderer" }, { data: "42%" }, "extra");
    expect(listener).toHaveBeenCalledWith({ sender: "renderer" }, { data: "42%" }, "extra");
  });

  it("once 同样包装事件参数", () => {
    const listener = vi.fn();
    api().once("main-process-message", listener);
    expect(mocks.ipcRenderer.once).toHaveBeenCalledWith("main-process-message", expect.any(Function));

    (mocks.ipcRenderer.once.mock.calls.at(-1)![1] as (...args: unknown[]) => void)({ sender: "main" }, "time");
    expect(listener).toHaveBeenCalledWith({ sender: "main" }, "time");
  });

  it("off 透传通道与监听器", () => {
    const listener = vi.fn();
    api().off("esrgan:stdout", listener);
    expect(mocks.ipcRenderer.off).toHaveBeenCalledWith("esrgan:stdout", listener);
  });

  it("send / invoke 去掉事件参数后透传", () => {
    api().send("openDevTools", "arg");
    expect(mocks.ipcRenderer.send).toHaveBeenCalledWith("openDevTools", "arg");

    api().invoke("esrgan", { filepath: "/a.png" });
    expect(mocks.ipcRenderer.invoke).toHaveBeenCalledWith("esrgan", { filepath: "/a.png" });
  });

  it("webUtils.getPathForFile 委托给 Electron", () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    expect(mocks.exposed.get("webUtils").getPathForFile(file)).toBe("/real/a.png");
    expect(mocks.getPathForFile).toHaveBeenCalledWith(file);
  });
});
