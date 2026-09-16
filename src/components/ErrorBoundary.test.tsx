// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): React.ReactNode {
  throw new Error("渲染失败");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => { });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("正常渲染子节点", () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("正常内容")).toBeTruthy();
    expect(screen.queryByText("应用遇到了错误")).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("捕获子树错误并展示兜底界面", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("应用遇到了错误")).toBeTruthy();
    expect(screen.getByText("刷新页面")).toBeTruthy();
    expect(console.error).toHaveBeenCalledWith("Error Boundary caught an error:", expect.any(Error), expect.anything());
  });

  it("刷新按钮可点击（jsdom 不支持真实导航）", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(() => fireEvent.click(screen.getByRole("button", { name: "刷新页面" }))).not.toThrow();
  });

  it("仅开发模式展示错误详情", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("错误详情 (开发模式)")).toBeTruthy();
    expect(screen.getByText(/渲染失败/)).toBeTruthy();

    cleanup();
    vi.unstubAllEnvs();
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.queryByText("错误详情 (开发模式)")).toBeNull();
  });
});
