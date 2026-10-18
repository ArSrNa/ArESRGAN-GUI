import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { PauseCircleIcon, PlayCircleIcon, Trash2Icon } from "lucide-react";
import { Controller, useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import "./App.scss";
import { filesState } from "./states";
import type {
  BatchSnapshot,
  FormDataType,
  ImageInput,
  TaskState,
} from "./types";
import * as desktop from "./lib/desktop";
import { isBatchActive, useBatch } from "./lib/useBatch";
import { cn } from "./lib/utils";
import { FieldLegend, FieldSet } from "./components/ui/field";
import { Dropzone, DropzoneContent } from "./components/ui/shadcn-io/dropzone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";

/** 默认模型缺失时报资源异常，不静默切换其他模型 */
const DEFAULT_MODEL = "realesrgan-x4plus-anime";

function describeError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default function Home() {
  const form = useForm<FormDataType>({
    defaultValues: {
      model: DEFAULT_MODEL,
      output: {
        mode: "current",
        path: "",
      },
    },
  });
  const [files, setFiles] = useAtom(filesState);
  const [modelList, setModelList] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const batch = useBatch();
  const busy = isBatchActive(batch);
  /** 拖放监听不随批次状态重订阅，用 ref 读取最新值 */
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    /**获取模型列表 */
    desktop
      .listModels()
      .then((models) => {
        setModelList(models);
        if (!models.includes(DEFAULT_MODEL)) {
          toast.error(`内置模型资源异常：缺少默认模型 ${DEFAULT_MODEL}`);
        }
      })
      .catch((error) => toast.error(describeError(error)));
  }, []);

  const appendInputs = useCallback(
    (incoming: ImageInput[]) => {
      if (incoming.length === 0) {
        return;
      }
      setFiles((current) => {
        const known = new Set(current.map((item) => item.path));
        const merged = [...current];
        for (const item of incoming) {
          if (known.has(item.path)) {
            continue;
          }
          known.add(item.path);
          merged.push(item);
        }
        return merged;
      });
    },
    [setFiles]
  );

  /**
   * @description 选择图片：取消对话框不改变现有列表
   */
  const handlePick = useCallback(async () => {
    if (busy) {
      toast.info("任务执行中，暂时无法修改图片列表");
      return;
    }
    try {
      const result = await desktop.pickImages();
      if (!result) {
        return;
      }
      if (result.rejected.length > 0) {
        toast.error(result.rejected.join("；"));
      }
      appendInputs(result.inputs);
    } catch (error) {
      toast.error(describeError(error));
    }
  }, [appendInputs, busy]);

  /**
   * @description 设置输出路径
   */
  const handleSetPath = async () => {
    try {
      const path = await desktop.pickOutputDirectory();
      if (!path) {
        return;
      }
      form.setValue("output.path", path);
    } catch (error) {
      toast.error(describeError(error));
    }
  };

  /** 原生拖入：webview 内拿不到 HTML5 drop，只能订阅窗口拖放事件 */
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    desktop
      .onFileDrop(
        async (paths) => {
          if (busyRef.current) {
            toast.info("任务执行中，暂时无法修改图片列表");
            return;
          }
          const images = paths.filter(desktop.isSupportedImage);
          const ignored = paths.length - images.length;
          if (ignored > 0) {
            toast.error(`已忽略 ${ignored} 个文件，仅支持 jpg/png/webp 图片`);
          }
          if (images.length === 0) {
            return;
          }
          try {
            const result = await desktop.registerInputs(images);
            if (result.rejected.length > 0) {
              toast.error(result.rejected.join("；"));
            }
            appendInputs(result.inputs);
          } catch (error) {
            toast.error(describeError(error));
          }
        },
        (active) => setDragActive(active)
      )
      .then((stop) => {
        if (disposed) {
          stop();
          return;
        }
        unlisten = stop;
      })
      .catch((error) => console.error("订阅拖放事件失败:", error));

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appendInputs]);

  return (
    <>
      <div className="flex flex-col gap-4 itens-center justify-center">
        <form className="grid grid-cols-[450px_1fr] gap-20">
          <FieldSet>
            <FieldLegend>上传图片</FieldLegend>
            <Dropzone
              count={files.length}
              dragActive={dragActive}
              disabled={busy}
              onPick={handlePick}
            >
              <DropzoneContent count={files.length} />
            </Dropzone>
          </FieldSet>

          <div className="flex flex-col gap-5">
            <FieldSet>
              <FieldLegend>选择模型</FieldLegend>
              <Controller
                name="model"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelList.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldSet>
            <FieldSet>
              <FieldLegend>输出路径</FieldLegend>
              <Controller
                rules={{ required: true }}
                name="output.mode"
                control={form.control}
                render={({ field }) => (
                  <RadioGroup
                    className="flex"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <div className="flex items-center space-x-2 h-10">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label className="w-30" htmlFor="custom">
                        自定义路径
                      </Label>
                      {form.watch("output.mode") === "custom" && (
                        <Input
                          value={form.watch("output.path") ?? ""}
                          placeholder="点击选择输出路径"
                          readOnly
                          className="cursor-pointer"
                          onClick={handleSetPath}
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="current" id="current" />
                      <Label htmlFor="current">原文件路径</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </FieldSet>
          </div>
        </form>

        <TView form={form} batch={batch} modelsReady={modelList.length > 0} />
      </div>
    </>
  );
}

type OverlayTone = "pending" | "failed" | "cancelled";

interface OverlayInfo {
  text: string;
  tone: OverlayTone;
}

function overlayOf(task: TaskState | undefined): OverlayInfo | null {
  if (!task) {
    return null;
  }
  switch (task.status) {
    case "queued":
      return { text: "等待处理", tone: "pending" };
    case "running":
      return {
        text:
          task.progress === null
            ? "处理中"
            : `处理中 ${Math.round(task.progress)}%`,
        tone: "pending",
      };
    case "failed":
      return { text: "处理失败", tone: "failed" };
    case "cancelled":
      return { text: "已取消", tone: "cancelled" };
    case "success":
      return null;
  }
}

function TView({
  form,
  batch,
  modelsReady,
}: {
  form: UseFormReturn<FormDataType>;
  batch: BatchSnapshot | null;
  modelsReady: boolean;
}) {
  const [files, setFiles] = useAtom(filesState);
  const busy = isBatchActive(batch);
  const stopping = batch?.status === "cancelling";
  const finishedBatch = useRef<string | null>(null);

  const taskByPath = useMemo(() => {
    const map = new Map<string, TaskState>();
    batch?.tasks.forEach((task) => map.set(task.input, task));
    return map;
  }, [batch?.tasks]);

  /** 批次结束后汇总失败数量，避免逐条弹窗 */
  useEffect(() => {
    if (!batch || batch.status !== "finished") {
      return;
    }
    if (finishedBatch.current === batch.id) {
      return;
    }
    finishedBatch.current = batch.id;

    const failed = batch.tasks.filter((task) => task.status === "failed").length;
    const cancelled = batch.tasks.filter(
      (task) => task.status === "cancelled"
    ).length;
    if (failed > 0) {
      toast.error(`批次结束：${failed} 张处理失败`);
    } else if (cancelled > 0) {
      toast.info(`批次已停止：${cancelled} 张未处理`);
    }
  }, [batch]);

  async function handleSubmit(data: FormDataType) {
    try {
      await desktop.startBatch({
        inputs: files.map((file) => file.path),
        model: data.model,
        output: data.output,
      });
    } catch (error) {
      toast.error(describeError(error));
    }
  }

  const handleStop = async () => {
    if (!batch) {
      return;
    }
    try {
      await desktop.stopBatch(batch.id);
    } catch (error) {
      toast.error(describeError(error));
    }
  };

  return (
    <>
      <div className="sticky top-15 z-20 grid grid-cols-2 gap-3 my-3">
        {!busy && (
          <Button
            disabled={files.length === 0 || !modelsReady}
            onClick={form.handleSubmit(handleSubmit)}
          >
            <PlayCircleIcon /> 开始
          </Button>
        )}
        {busy && (
          <Button onClick={handleStop} disabled={stopping}>
            <PauseCircleIcon /> {stopping ? "正在停止…" : "停止"}
          </Button>
        )}
        <Button
          disabled={files.length === 0 || busy}
          onClick={() => {
            setFiles([]);
          }}
        >
          <Trash2Icon /> 清空
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 border items-center justify-center rounded-lg p-3 min-h-60 overflow-y-auto">
        {files.map((file, index) => {
          const task = taskByPath.get(file.path);
          const overlay = overlayOf(task);
          return (
            <div key={file.path} className="w-40 h-40 relative">
              {overlay && (
                <div
                  title={task?.error ?? undefined}
                  className={cn(
                    "absolute inset-0 text-white flex items-center justify-center rounded-lg z-10 px-2 text-center text-sm",
                    overlay.tone === "pending" && "bg-black/50",
                    overlay.tone === "failed" && "bg-red-950/70 text-red-100",
                    overlay.tone === "cancelled" &&
                      "bg-amber-950/70 text-amber-100"
                  )}
                >
                  {overlay.text}
                </div>
              )}
              <img
                src={desktop.toPreviewUrl(file.path)}
                alt={file.name}
                draggable={false}
                className={cn(
                  "w-full h-full object-contain border rounded-lg",
                  overlay?.tone === "pending" && "blur-xs"
                )}
              />
              {!busy && (
                <div className="bg-black/50 absolute bottom-0 rounded-b-lg right-0 left-0 py-1 z-10 flex items-center justify-center">
                  <Trash2Icon
                    className="right-0 bottom-0 size-4 cursor-pointer"
                    onClick={() => {
                      setFiles((current) => current.toSpliced(index, 1));
                    }}
                    color="white"
                  />
                </div>
              )}
            </div>
          );
        })}

        {files.length === 0 && <div>暂无图片</div>}
      </div>
    </>
  );
}
