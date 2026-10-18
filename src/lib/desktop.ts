import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

import type {
  BatchSnapshot,
  OutputConfig,
  RegisterResult,
  UpdateInfo,
} from "@/types";

/** 推理程序支持的输入格式 */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function isSupportedImage(path: string): boolean {
  const match = /\.([^./\\]+)$/.exec(path);
  return match ? IMAGE_EXTENSIONS.includes(match[1].toLowerCase()) : false;
}

/** 注册输入路径：校验存在性与格式，并为预览开放资源协议访问 */
export function registerInputs(paths: string[]): Promise<RegisterResult> {
  return invoke("register_inputs", { paths });
}

/** 打开原生文件对话框选择图片；取消时返回 null */
export async function pickImages(): Promise<RegisterResult | null> {
  const selection = await open({
    title: "选择需要超分的图片",
    multiple: true,
    directory: false,
    filters: [{ name: "图片", extensions: IMAGE_EXTENSIONS }],
  });
  if (!selection) {
    return null;
  }
  const paths = Array.isArray(selection) ? selection : [selection];
  if (paths.length === 0) {
    return null;
  }
  return registerInputs(paths);
}

/** 打开原生目录对话框；取消时返回 null */
export async function pickOutputDirectory(): Promise<string | null> {
  const selection = await open({
    title: "请选择文件夹",
    directory: true,
    multiple: false,
  });
  return typeof selection === "string" ? selection : null;
}

export function listModels(): Promise<string[]> {
  return invoke("list_models");
}

export function startBatch(request: {
  inputs: string[];
  model: string;
  output: OutputConfig;
}): Promise<BatchSnapshot> {
  return invoke("start_batch", { request });
}

export function stopBatch(batchId: string): Promise<BatchSnapshot> {
  return invoke("stop_batch", { batchId });
}

export function getBatchState(): Promise<BatchSnapshot | null> {
  return invoke("get_batch_state");
}

export function checkUpdate(): Promise<UpdateInfo> {
  return invoke("check_update");
}

export function openDevtools(): Promise<void> {
  return invoke("open_devtools");
}

/** 把本地绝对路径转换为可预览的资源地址 */
export function toPreviewUrl(path: string): string {
  return convertFileSrc(path);
}

/** 交给系统浏览器打开 */
export function openExternal(url: string): Promise<void> {
  return openUrl(url);
}

/** 订阅批次状态变化；调用方负责在卸载时解除订阅 */
export function onBatchUpdate(
  handler: (snapshot: BatchSnapshot) => void
): Promise<UnlistenFn> {
  return listen<BatchSnapshot>("batch:update", (event) =>
    handler(event.payload)
  );
}

/** 订阅窗口级原生拖入事件（webview 内不会收到 HTML5 drop 事件） */
export function onFileDrop(
  onPaths: (paths: string[]) => void,
  onDragState?: (active: boolean) => void
): Promise<UnlistenFn> {
  return getCurrentWebview().onDragDropEvent((event) => {
    const payload = event.payload;
    switch (payload.type) {
      case "enter":
      case "over":
        onDragState?.(true);
        break;
      case "leave":
        onDragState?.(false);
        break;
      case "drop": {
        onDragState?.(false);
        const paths = "paths" in payload ? payload.paths : [];
        if (paths.length > 0) {
          onPaths(paths);
        }
        break;
      }
    }
  });
}
