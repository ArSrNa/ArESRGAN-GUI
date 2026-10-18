import { Separator } from "./components/ui/separator";

export default function Copyright() {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-medium">Real ESRGAN</h2>
        软件超分辨率功能来自模型 Real-ESRGAN，并遵循 BSD 3-Clause License
        公共许可协议
        <a href="https://github.com/xinntao/Real-ESRGAN" target="_blank">
          https://github.com/xinntao/Real-ESRGAN
        </a>
      </div>
      <Separator />
      <div>
        <h2 className="text-lg font-medium">shadcn/ui</h2>
        软件UI框架来自shadcn/ui，并遵循 MIT 公共许可协议
        <a href="https://github.com/shadcn-ui/ui" target="_blank">
          https://github.com/shadcn-ui/ui
        </a>
      </div>
      <Separator />

      <div>
        <h2 className="text-lg font-medium">tauri</h2>
        开发脚手架为tauri，并遵循 MIT 公共许可协议
        <a
          href="https://github.com/tauri-apps/tauri"
          target="_blank"
        >
          https://github.com/tauri-apps/tauri
        </a>
      </div>
      <Separator />

      <div>
        <h2 className="text-lg font-medium">本软件</h2>
        软件按照GNU GPL3.0协议进行开放源代码。源代码请前往：https://cnb.cool/arsrna/esrgan-app
      </div>
    </div>
  );
}
