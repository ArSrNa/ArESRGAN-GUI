// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import Home from "./Home";

type Listener = (event: unknown, data: unknown) => void;

/** Home 在模块顶层读取 window.ipcRenderer / window.webUtils，必须在导入前注入 */
const mocks = vi.hoisted(() => {
  const listeners = new Map<string, Listener[]>();
  const invoke = vi.fn();
  const on = vi.fn((channel: string, listener: Listener) => {
    listeners.set(channel, [...(listeners.get(channel) ?? []), listener]);
  });
  const off = vi.fn((channel: string, listener: Listener) => {
    listeners.set(channel, (listeners.get(channel) ?? []).filter((item) => item !== listener));
  });
  const getPathForFile = vi.fn(async (file: File) => `/files/${file.name}`);
  Object.assign(window, {
    ipcRenderer: { invoke, on, off, send: vi.fn(), once: vi.fn() },
    webUtils: { getPathForFile },
  });
  return { listeners, invoke, on, off, getPathForFile };
});

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const MODEL_LIST = ["realesrgan-x4plus", "realesrgan-x4plus-anime"];

const emit = (channel: string, data: unknown) => {
  for (const listener of mocks.listeners.get(channel) ?? []) listener({}, data);
};
const image = (name: string) => new File(["x"], name, { type: "image/png" });
const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const dropZone = () => (document.querySelector("input[type=file]") as HTMLInputElement).parentElement as HTMLElement;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => { });
  mocks.listeners.clear();
  mocks.on.mockClear();
  mocks.off.mockClear();
  mocks.getPathForFile.mockClear();
  toast.error.mockReset();
  mocks.invoke.mockReset();
  mocks.invoke.mockImplementation(async (channel: string) => {
    if (channel === "getModels") return { success: true, data: MODEL_LIST.map((model) => `${model}.param`) };
    if (channel === "selectFolder") return "/output/dir";
    return { type: "exit", code: 0 };
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** 渲染首页并等待模型列表请求完成 */
async function renderHome() {
  render(
    <Provider store={createStore()}>
      <Home />
    </Provider>
  );
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("getModels"));
}

/** 拖入图片并等待预览生成 */
async function addFiles(...files: File[]) {
  await act(async () => {
    fireEvent.drop(dropZone(), { dataTransfer: { files } });
  });
  await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(files.length));
}

describe("首页", () => {
  it("启动时读取模型列表并去掉 .param 后缀", async () => {
    await renderHome();
    await act(async () => {
      fireEvent.click(screen.getAllByRole("combobox")[0]);
    });
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(MODEL_LIST);
  });

  it("模型列表加载失败时提示错误", async () => {
    mocks.invoke.mockImplementation(async (channel: string) =>
      channel === "getModels" ? { success: false, data: "找不到模型目录" } : { type: "exit", code: 0 }
    );
    render(
      <Provider store={createStore()}>
        <Home />
      </Provider>
    );
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("找不到模型目录"));
  });

  it("拖入图片展示预览，并可单张删除或整体清空", async () => {
    await renderHome();
    expect(screen.getByText("暂无图片")).toBeTruthy();
    expect(button(/开始/).disabled).toBe(true);

    await addFiles(image("a.png"), image("b.png"));
    expect(mocks.getPathForFile).toHaveBeenCalledTimes(2);
    expect(screen.getByAltText("/files/a.png")).toBeTruthy();
    expect(button(/开始/).disabled).toBe(false);

    const preview = screen.getByAltText("/files/a.png").parentElement as HTMLElement;
    await act(async () => {
      fireEvent.click(preview.querySelector('[class~="cursor-pointer"]') as HTMLElement);
    });
    expect(screen.queryByAltText("/files/a.png")).toBeNull();
    expect(screen.getByAltText("/files/b.png")).toBeTruthy();

    await act(async () => {
      fireEvent.click(button(/清空/));
    });
    await waitFor(() => expect(screen.getByText("暂无图片")).toBeTruthy());
    expect(screen.queryByAltText("/files/b.png")).toBeNull();
    expect(button(/开始/).disabled).toBe(true);
  });

  it("点击开始后携带表单内容逐个调用 esrgan", async () => {
    await renderHome();
    await addFiles(image("a.png"));

    await act(async () => {
      fireEvent.click(button(/开始/));
    });

    await waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("esrgan", {
        filepath: "/files/a.png",
        model: MODEL_LIST[1],
        output: { mode: "current", path: "" },
      })
    );
    // 处理结束后恢复为可再次开始的状态
    await waitFor(() => expect(button(/开始/).disabled).toBe(false));
  });

  it("处理过程中显示进度，停止按钮终止任务", async () => {
    let finishEsrgan: (value: unknown) => void = () => { };
    mocks.invoke.mockImplementation(async (channel: string) => {
      if (channel === "getModels") return { success: true, data: MODEL_LIST.map((model) => `${model}.param`) };
      if (channel === "esrgan") return new Promise((resolve) => { finishEsrgan = resolve; });
      return undefined;
    });
    await renderHome();
    await addFiles(image("a.png"));

    await act(async () => {
      fireEvent.click(button(/开始/));
    });
    await waitFor(() => expect(document.body.textContent).toContain("处理中 0%"));

    await act(async () => {
      emit("esrgan:stdout", { type: "log", data: "42%" });
    });
    expect(document.body.textContent).toContain("处理中 42%");

    await act(async () => {
      fireEvent.click(button(/停止/));
    });
    expect(mocks.invoke).toHaveBeenCalledWith("kill-esrgan");
    await waitFor(() => expect(button(/开始/).disabled).toBe(false));

    await act(async () => {
      finishEsrgan({ type: "exit", code: 0 });
    });
    expect(screen.getByRole("button", { name: /开始/ })).toBeTruthy();
  });

  it("卸载时移除 stdout 监听", async () => {
    await renderHome();
    expect(mocks.on).toHaveBeenCalledWith("esrgan:stdout", expect.any(Function));
    cleanup();
    expect(mocks.off).toHaveBeenCalledWith("esrgan:stdout", expect.any(Function));
  });

  it("自定义输出路径通过目录选择对话框写入表单", async () => {
    await renderHome();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("自定义路径"));
    });

    const input = await screen.findByPlaceholderText("点击选择输出路径");
    await act(async () => {
      fireEvent.click(input);
    });

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("selectFolder"));
    await waitFor(() => expect((input as HTMLInputElement).value).toBe("/output/dir"));
  });

  it("自定义输出路径会随表单一起提交", async () => {
    await renderHome();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("自定义路径"));
    });
    await act(async () => {
      fireEvent.click(await screen.findByPlaceholderText("点击选择输出路径"));
    });
    await waitFor(() => expect((screen.getByPlaceholderText("点击选择输出路径") as HTMLInputElement).value).toBe("/output/dir"));

    await addFiles(image("a.png"));
    await act(async () => {
      fireEvent.click(button(/开始/));
    });
    await waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("esrgan", {
        filepath: "/files/a.png",
        model: MODEL_LIST[1],
        output: { mode: "custom", path: "/output/dir" },
      })
    );
  });
});
