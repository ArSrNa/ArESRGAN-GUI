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
        <h2 className="text-lg font-medium">Ant Design</h2>
        软件UI来自Ant Design，并遵循 MIT 公共许可协议
        <a href="https://github.com/ant-design/ant-design/" target="_blank">
          https://github.com/ant-design/ant-design/
        </a>
      </div>
      <Separator />

      <div>
        <h2 className="text-lg font-medium">electron-vite-react</h2>
        开发脚手架为electron-vite-react，并遵循 MIT 公共许可协议
        <a
          href="https://github.com/electron-vite/electron-vite-react"
          target="_blank"
        >
          https://github.com/electron-vite/electron-vite-react
        </a>
      </div>
      <Separator />

      <div>
        <h2 className="text-lg font-medium">本软件</h2>
        本软件作者：Ar-Sr-Na
        <a href="https://www.arsrna.cn" target="_blank">
          www.arsrna.cn
        </a>
        拥有修改与二次创作该作品的权利，并受法律保护； 软件按照GNU
        GPL3.0协议进行开放源代码。
        <br />
        本软件同时有软件著作权登记，与开源部分并不冲突，当违规使用（如进行非法内容的处理、不正当用途损害作者权益等）时维权。
      </div>
    </div>
  );
}
