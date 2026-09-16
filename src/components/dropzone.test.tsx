// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dropzone } from "./dropzone";

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const image = (name = "a.png") => new File(["x"], name, { type: "image/png" });
const text = (name = "a.txt") => new File(["x"], name, { type: "text/plain" });
const fileInput = () => document.querySelector("input[type=file]") as HTMLInputElement;
/** 拖拽区域即隐藏输入框的父节点 */
const dropZone = () => fileInput().parentElement as HTMLElement;

describe("Dropzone", () => {
  it("渲染提示文案与透传的输入框属性", () => {
    render(<Dropzone accept="image/*" multiple />);
    expect(screen.getByText("拖入图片或点击上传")).toBeTruthy();
    expect(fileInput().accept).toBe("image/*");
    expect(fileInput().multiple).toBe(true);
  });

  it("点击区域触发文件选择", () => {
    render(<Dropzone />);
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => { });
    fireEvent.click(dropZone());
    expect(click).toHaveBeenCalled();
  });

  it("拖拽经过时阻止浏览器默认打开文件", () => {
    render(<Dropzone />);
    expect(fireEvent.dragOver(dropZone())).toBe(false);
  });

  it("拖入图片时只回调图片文件", () => {
    const onFileChange = vi.fn();
    render(<Dropzone onFileChange={onFileChange} />);
    fireEvent.drop(dropZone(), { dataTransfer: { files: [image("a.png"), text("b.txt"), image("c.png")] } });
    expect((onFileChange.mock.calls[0][0] as File[]).map((f) => f.name)).toEqual(["a.png", "c.png"]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("拖入非图片时提示且不回调", () => {
    const onFileChange = vi.fn();
    render(<Dropzone onFileChange={onFileChange} />);
    fireEvent.drop(dropZone(), { dataTransfer: { files: [text()] } });
    expect(toast.error).toHaveBeenCalledWith("请拖入图片文件");
    expect(onFileChange).not.toHaveBeenCalled();
  });

  it("通过文件选择框上传时回调所选文件", () => {
    const onFileChange = vi.fn();
    render(<Dropzone onFileChange={onFileChange} />);
    fireEvent.change(fileInput(), { target: { files: [image("picked.png")] } });
    expect((onFileChange.mock.calls[0][0] as File[]).map((f) => f.name)).toEqual(["picked.png"]);
  });

  it("files 变化后重置输入框，允许重复选择同一文件", () => {
    const { rerender } = render(<Dropzone files={[]} />);
    Object.defineProperty(fileInput(), "value", { value: "C:\\fakepath\\a.png", writable: true });
    rerender(<Dropzone files={[image()]} />);
    expect(fileInput().value).toBe("");
  });

  it("没有传入回调时拖入图片不会报错", () => {
    render(<Dropzone />);
    expect(() => fireEvent.drop(dropZone(), { dataTransfer: { files: [image()] } })).not.toThrow();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
