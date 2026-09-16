// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const checkUpdate = vi.hoisted(() => vi.fn());
vi.mock("./utils", () => ({ CheckUpdate: checkUpdate }));

/** App / Navbar1 在模块顶层读取 window.ipcRenderer，必须在导入前注入 */
vi.hoisted(() => {
  const invoke = vi.fn(async (channel: string) => {
    if (channel === "getModels") return { success: true, data: ["realesrgan-x4plus-anime.param"] };
    return { type: "exit", code: 0 };
  });
  Object.assign(window, {
    ipcRenderer: { invoke, on: vi.fn(), off: vi.fn(), send: vi.fn(), once: vi.fn() },
    webUtils: { getPathForFile: vi.fn(async (file: File) => `/files/${file.name}`) },
  });
});

import App from "./App";
import ErrorPage from "./error";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => { });
  vi.spyOn(console, "warn").mockImplementation(() => { });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("应用外壳", () => {
  it("启动时检查更新并渲染首页", async () => {
    render(<App />);
    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("ArSrNa 图像超分")).toBeTruthy();
    expect(await screen.findByText("暂无图片")).toBeTruthy();
    expect(screen.getByText(/Powered by Ar-Sr-Na/)).toBeTruthy();
  });

  it("可从导航栏跳转到开源许可页面", async () => {
    render(<App />);
    await screen.findByText("暂无图片");

    fireEvent.click(screen.getByText("开源许可"));
    expect(await screen.findByText("Real ESRGAN")).toBeTruthy();
    expect(screen.getByText("本软件")).toBeTruthy();
  });

  it("未匹配的路径展示错误页与请求路径", () => {
    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <ErrorPage />
      </MemoryRouter>
    );
    expect(screen.getByText("前面的区域，以后再来探索吧？")).toBeTruthy();
    expect(screen.getByText("请求路径：/missing")).toBeTruthy();
  });
});
