// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { BatchSnapshot } from "./types";
import * as desktop from "./test/desktopMock";

vi.mock("./lib/desktop", () => import("./test/desktopMock"));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
import Home from "./Home";

const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const models = ["realesrgan-x4plus", "realesrgan-x4plus-anime"];
const running = (): BatchSnapshot => ({
  id: "batch-1", seq: 1, status: "running", model: models[1], currentTaskId: "task-1",
  tasks: [{ id: "task-1", input: "/files/a.png", name: "a.png", output: "/files/a.png_opt.png", status: "running", progress: 0, error: null }],
});
beforeEach(() => desktop.resetDesktop());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function renderHome() {
  render(<Provider store={createStore()}><Home /></Provider>);
  await waitFor(() => expect(desktop.listModels).toHaveBeenCalled());
  await waitFor(() => expect(desktop.getBatchState).toHaveBeenCalled());
}
async function addFiles(...names: string[]) {
  await act(async () => { await desktop.emitDrop(names.map(name => `/files/${name}`)); });
  await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(names.length));
}

describe("Tauri 首页", () => {
  it("读取原生模型列表", async () => {
    await renderHome();
    fireEvent.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option");
    expect(options.map(option => option.textContent)).toEqual(models);
  });
  it("模型加载失败时反馈原生错误", async () => {
    desktop.listModels.mockRejectedValue("找不到模型目录");
    await renderHome();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("找不到模型目录"));
    expect(button(/开始/).disabled).toBe(true);
  });
  it("原生拖入后可以预览、整条点击删除和清空", async () => {
    await renderHome();
    expect(button(/开始/).disabled).toBe(true);
    await addFiles("a.png", "b.png");
    expect(screen.getByAltText("a.png").getAttribute("src")).toBe("asset://localhost/files/a.png");
    const preview = screen.getByAltText("a.png").parentElement!;
    fireEvent.click(preview.querySelector('[class~="cursor-pointer"]')!);
    expect(screen.queryByAltText("a.png")).toBeNull();
    expect(screen.getByAltText("b.png")).toBeTruthy();
    fireEvent.click(button(/清空/));
    expect(screen.getByText("暂无图片")).toBeTruthy();
  });
  it("原生选择对话框取消不清空已有图片", async () => {
    await renderHome();
    await addFiles("a.png");
    fireEvent.click(screen.getByText("点击此处或拖入文件以上传"));
    await waitFor(() => expect(desktop.pickImages).toHaveBeenCalled());
    expect(screen.getByAltText("a.png")).toBeTruthy();
  });
  it("一次提交整个批次及固定表单参数", async () => {
    await renderHome();
    await addFiles("a.png", "b.png");
    fireEvent.click(button(/开始/));
    await waitFor(() => expect(desktop.startBatch).toHaveBeenCalledWith({
      inputs: ["/files/a.png", "/files/b.png"], model: models[1], output: { mode: "current", path: "" },
    }));
    expect(desktop.startBatch).toHaveBeenCalledTimes(1);
  });
  it("展示原生进度，停止中禁止重启，终态后恢复", async () => {
    await renderHome();
    await addFiles("a.png");
    const batch = running();
    await act(async () => desktop.emitBatch(batch));
    expect(screen.getByText("处理中 0%")).toBeTruthy();
    await act(async () => desktop.emitBatch({ ...batch, seq: 2, tasks: [{ ...batch.tasks[0], progress: 42 }] }));
    expect(screen.getByText("处理中 42%")).toBeTruthy();
    fireEvent.click(button(/^停止$/));
    await waitFor(() => expect(desktop.stopBatch).toHaveBeenCalledWith("batch-1"));
    await act(async () => desktop.emitBatch({ ...batch, seq: 3, status: "cancelling" }));
    expect(button(/正在停止/).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /开始/ })).toBeNull();
    await act(async () => desktop.emitBatch({ ...batch, seq: 4, status: "finished", currentTaskId: null,
      tasks: [{ ...batch.tasks[0], status: "cancelled" }] }));
    expect(button(/开始/).disabled).toBe(false);
  });
  it("忽略同一批次的过期状态事件", async () => {
    await renderHome();
    await addFiles("a.png");
    const batch = running();
    await act(async () => desktop.emitBatch({ ...batch, seq: 3, tasks: [{ ...batch.tasks[0], progress: 80 }] }));
    await act(async () => desktop.emitBatch({ ...batch, seq: 2, tasks: [{ ...batch.tasks[0], progress: 20 }] }));
    expect(screen.getByText("处理中 80%")).toBeTruthy();
  });
  it("卸载时解除批次和原生拖放监听", async () => {
    await renderHome();
    cleanup();
    expect(desktop.unlistenBatch).toHaveBeenCalledTimes(1);
    expect(desktop.unlistenDrop).toHaveBeenCalledTimes(1);
  });
  it("原生目录选择结果随批次提交", async () => {
    await renderHome();
    fireEvent.click(screen.getByLabelText("自定义路径"));
    fireEvent.click(await screen.findByPlaceholderText("点击选择输出路径"));
    await waitFor(() => expect((screen.getByPlaceholderText("点击选择输出路径") as HTMLInputElement).value).toBe("/output/dir"));
    await addFiles("a.png");
    fireEvent.click(button(/开始/));
    await waitFor(() => expect(desktop.startBatch).toHaveBeenCalledWith({
      inputs: ["/files/a.png"], model: models[1], output: { mode: "custom", path: "/output/dir" },
    }));
  });
});
