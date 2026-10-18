import { vi } from "vitest";
import type { BatchSnapshot } from "../types";

let batchListener: ((batch: BatchSnapshot) => void) | undefined;
let dropListener: ((paths: string[]) => void | Promise<void>) | undefined;
export const unlistenBatch = vi.fn();
export const unlistenDrop = vi.fn();
export const listModels = vi.fn();
export const pickImages = vi.fn();
export const pickOutputDirectory = vi.fn();
export const startBatch = vi.fn();
export const stopBatch = vi.fn();
export const getBatchState = vi.fn();
export const openExternal = vi.fn().mockResolvedValue(undefined);
export const openDevtools = vi.fn().mockResolvedValue(undefined);
export const toPreviewUrl = (path: string) => `asset://localhost${path}`;
export const isSupportedImage = (path: string) => /\.(jpe?g|png|webp)$/i.test(path);
export const registerInputs = vi.fn(async (paths: string[]) => ({
  inputs: paths.map(path => ({ path, name: path.split("/").at(-1)! })),
  rejected: [],
}));
export const onBatchUpdate = vi.fn(async (handler: typeof batchListener) => {
  batchListener = handler;
  return unlistenBatch;
});
export const onFileDrop = vi.fn(async (handler: typeof dropListener) => {
  dropListener = handler;
  return unlistenDrop;
});
export const emitBatch = (batch: BatchSnapshot) => batchListener?.(batch);
export const emitDrop = (paths: string[]) => dropListener?.(paths);

export function resetDesktop() {
  vi.clearAllMocks();
  batchListener = undefined;
  dropListener = undefined;
  listModels.mockReset().mockResolvedValue(["realesrgan-x4plus", "realesrgan-x4plus-anime"]);
  pickImages.mockReset().mockResolvedValue(null);
  pickOutputDirectory.mockReset().mockResolvedValue("/output/dir");
  startBatch.mockReset().mockResolvedValue(undefined);
  stopBatch.mockReset().mockResolvedValue(undefined);
  getBatchState.mockReset().mockResolvedValue(null);
}
