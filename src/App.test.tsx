// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { resetDesktop } from "./test/desktopMock";

const checkUpdate = vi.hoisted(() => vi.fn());
vi.mock("./utils", () => ({ CheckUpdate: checkUpdate }));

vi.mock("./lib/desktop", () => import("./test/desktopMock"));

import App from "./App";
import ErrorPage from "./error";

beforeEach(() => {
  resetDesktop();
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
