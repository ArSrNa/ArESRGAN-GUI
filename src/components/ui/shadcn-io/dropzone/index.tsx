import type { ReactNode } from "react";
import { UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 桌面端文件投放区：点击走原生文件对话框，拖入由窗口级拖放事件处理，
 * 这里只负责展示与触发选择。
 */
export type DropzoneProps = {
  count: number;
  /** 由原生拖入事件驱动的高亮状态 */
  dragActive?: boolean;
  disabled?: boolean;
  onPick: () => void;
  className?: string;
  children?: ReactNode;
};

export const Dropzone = ({
  count,
  dragActive,
  disabled,
  onPick,
  className,
  children,
}: DropzoneProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "relative h-auto w-full flex-col overflow-hidden p-8",
        dragActive && "outline-none ring-1 ring-ring",
        className
      )}
    >
      {children ?? <DropzoneContent count={count} />}
    </Button>
  );
};

export type DropzoneContentProps = {
  count: number;
  className?: string;
};

export const DropzoneContent = ({
  count,
  className,
}: DropzoneContentProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full",
        className
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate font-medium text-sm">
        已选择{count}张图片
      </p>
      <p className="w-full text-wrap text-muted-foreground text-xs">
        点击此处或拖入文件以上传
      </p>
    </div>
  );
};
