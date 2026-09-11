import { toast } from "sonner";
import { gt, valid } from "semver";
import { version } from "../package.json";
/**测试用数据 */
export const mock = [
  {
    origin:
      "A:/stable-diffusion-webui/outputs/txt2img-images/2023-07-08/00000-1613037609.png",
    process: "",
    path: "D:/xxx/xxx/xxx",
    progress: parseInt("100%".replace("%", "")),
    log: "exit0",
  },
  {
    origin:
      "A:/stable-diffusion-webui/outputs/txt2img-images/2023-07-08/00001-2967784565.png",
    process: "",
    path: "D:/xxx/xxx/xxx",
    progress: parseInt("100%".replace("%", "")),
    log: "exit0",
  },
];

export async function CheckUpdate() {
  try {
    const currentVersion = version;
    if (!currentVersion || !valid(currentVersion)) {
      throw new Error("package.json 中的 version 不是有效的 semver 版本号");
    }
    const response = await fetch(
      "https://api-gz.arsrna.cn/release/appUpdate/ArESRGAN"
    );
    if (!response.ok) {
      throw new Error(`更新接口请求失败（HTTP ${response.status}）`);
    }
    const msg = await response.json();
    if (typeof msg?.version !== "string" || !valid(msg.version)) {
      throw new Error("更新接口返回的 version 不是有效的 semver 版本号");
    }
    const { link } = msg;
    if (gt(msg.version, currentVersion)) {
      if (typeof link !== "string" || new URL(link).protocol !== "https:") {
        throw new Error("更新接口返回的下载链接无效");
      }
      toast.success(
        <div>
          检查到新版本，请
          <a className="text-blue-500" href={link} target="_blank" rel="noreferrer">
            点此查看更新内容并下载
          </a>
        </div>
      );
    } else {
      toast.info("当前版本已是最新版本");
    }
  } catch (error) {
    console.error("检查更新时发生错误:", error);
    toast.error("检查更新失败：" + (error instanceof Error ? error.message : String(error)));
  }
}
