/** 前端共享类型：与 Rust 侧序列化结构保持一致（camelCase） */

/** 已注册的输入图片，path 为本地绝对路径 */
export interface ImageInput {
  path: string;
  name: string;
}

export type TaskStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export type BatchStatus = "running" | "cancelling" | "finished";

export interface TaskState {
  id: string;
  input: string;
  name: string;
  output: string;
  status: TaskStatus;
  /** 0～100，未解析到有效百分比时为 null */
  progress: number | null;
  error: string | null;
}

export interface BatchSnapshot {
  id: string;
  seq: number;
  status: BatchStatus;
  model: string;
  tasks: TaskState[];
  currentTaskId: string | null;
}

export interface RegisterResult {
  inputs: ImageInput[];
  rejected: string[];
}

export interface OutputConfig {
  /** 输出模式 */
  mode: "custom" | "current";
  /** 自定义输出目录 */
  path?: string;
}

export interface FormDataType {
  /** 模型选择 */
  model: string;
  /** 输出路径 */
  output: OutputConfig;
}

export interface UpdateInfo {
  /** 开发构建不参与版本比较 */
  skipped: boolean;
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  link: string | null;
  content: string | null;
}
