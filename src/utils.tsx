import { toast } from "sonner";

import { checkUpdate } from "@/lib/desktop";

function describeError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** 手动检查更新：由原生层拉取线上版本号并按 semver 比较 */
export async function CheckUpdate() {
  try {
    const info = await checkUpdate();

    if (info.skipped) {
      toast.warning(`开发环境跳过检查更新（本地版本 ${info.currentVersion}）`);
      return;
    }

    if (info.hasUpdate) {
      toast.success(
        <div>
          检查到新版本 {info.latestVersion}，请
          <a
            className="text-blue-500"
            href={info.link ?? "#"}
            target="_blank"
            rel="noreferrer"
          >
            点此查看更新内容并下载
          </a>
        </div>
      );
      return;
    }

    toast.info(`当前版本已是最新版本（${info.currentVersion}）`);
  } catch (error) {
    console.error("检查更新时发生错误:", error);
    toast.error(`检查更新失败：${describeError(error)}`);
  }
}
