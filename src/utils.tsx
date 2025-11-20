const { ipcRenderer } = window;
import { toast } from "sonner";
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
    const result = await ipcRenderer.invoke("getAsarHash");

    // Handle development environment or error cases
    if (!result || result.hash === null) {
      toast.warning("dev环境跳过检查更新");
      return;
    }

    const { hash, type, error } = result;

    if (error) {
      console.error("获取asar hash失败:", error);
      toast.error("无法获取应用版本信息，请稍后重试。" + error);
      return;
    }

    console.log("获取到hash:", hash, "类型:", type);

    let msg = await fetch(
      "https://api-gz.arsrna.cn/release/appUpdate/ArESRGAN"
    ).then((msg) => msg.json());
    console.log(msg);
    const needUpdate = msg.hash["windows"] !== hash;
    const { vNumber, uTime, content, link } = msg;
    if (needUpdate) {
      toast.success(
        <div>
          检查到新版本，请
          <a className="text-blue-500" href={link} target="_blank">
            点此查看更新内容并下载
          </a>
        </div>
      );
    } else {
      toast.info("当前版本已是最新版本");
    }
  } catch (error) {
    console.error("检查更新时发生错误:", error);
    toast.error("检查更新失败" + error);
  }
}
