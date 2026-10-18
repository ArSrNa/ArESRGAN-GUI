import { useEffect, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";

import { getBatchState, onBatchUpdate } from "./desktop";
import type { BatchSnapshot } from "@/types";

/**
 * 订阅批次状态：先建立监听再查询当前状态，避免快速结束的任务丢失终态。
 * 事件按 `seq` 丢弃过期快照；批次切换时以批次 id 为准重置。
 */
export function useBatch() {
  const [batch, setBatch] = useState<BatchSnapshot | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    const accept = (incoming: BatchSnapshot) => {
      if (disposed) {
        return;
      }
      setBatch((previous) => {
        if (!previous) {
          return incoming;
        }
        if (previous.id !== incoming.id) {
          return incoming;
        }
        return incoming.seq >= previous.seq ? incoming : previous;
      });
    };

    (async () => {
      const stop = await onBatchUpdate(accept);
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;

      const current = await getBatchState();
      if (current) {
        accept(current);
      }
    })().catch((error) => {
      console.error("订阅任务状态失败:", error);
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return batch;
}

export function isBatchActive(batch: BatchSnapshot | null): boolean {
  return batch?.status === "running" || batch?.status === "cancelling";
}
