import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn 类名合并", () => {
  it("合并字符串、数组与对象条件类名", () => {
    expect(cn("flex", ["gap-2", { "items-center": true, hidden: false }])).toBe("flex gap-2 items-center");
  });
  it("后者覆盖同组 Tailwind 工具类", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("flex", "block")).toBe("block");
  });
  it("保留不同组的工具类", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });
  it("忽略假值输入", () => {
    expect(cn("flex", undefined, null, false, "", 0)).toBe("flex");
  });
  it("没有输入时返回空字符串", () => {
    expect(cn()).toBe("");
  });
});
