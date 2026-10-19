# ArSrNaUI ESRGAN图像超分辨率软件

桌面前端使用 Tauri 2、React、TypeScript 与 Vite，超分算法由内置的 `realesrgan-ncnn-vulkan` 二进制执行。支持 Windows x64 与 macOS Apple Silicon（arm64），不提供 macOS Intel 或 Universal 版本。

![](image/index.avif)

## 构建本软件

### 前置条件

- Node.js 20.19+/22.12+ 与 Bun（CI 使用 Bun；也可用 pnpm 安装依赖）
- Rust 稳定版工具链（rustup）
- Windows：MSVC 生成工具与 WebView2 运行时；macOS：Xcode 命令行工具
- 最低系统版本、签名与产物形态仍在评估，见 [迁移 Spec](docs/tauri-migration/spec.md)

### 安装依赖

````shell
git clone https://github.com/ArSrNa/ArESRGAN-GUI.git
cd ArESRGAN-GUI
bun install
````

### 开发与打包

````shell
bun run app:dev      # 准备内置资源 + 启动 Vite + Tauri 窗口
bun run app:build    # 按当前平台构建；macOS 仅支持 arm64
# macOS 发布命令：
bun run app:build --target aarch64-apple-darwin --bundles dmg
````

`bun run app:dev` 会先执行 `scripts/prepare-tauri-assets.mjs`：按当前系统准备 `public/realsgan` 下的推理程序：macOS 使用 lipo 提取纯 arm64 sidecar，Windows 使用 x64 exe；模型与 DLL 复制到 `src-tauri/resources/`。这两个目录属于构建产物，已被 git 忽略。

| 命令 | 说明 |
| --- | --- |
| `bun run dev` | 只启动前端 Vite 开发服务器 |
| `bun run build` | 类型检查 + 前端构建到 `dist/` |
| `bun run assets` | 只准备 sidecar 与资源 |
| `bun run changelog` | 生成 CHANGELOG |

## 源代码内容

| 目录 | 内容 |
| --- | --- |
| `src/` | React 界面与页面 |
| `src/lib/desktop.ts` | 前端唯一的 Tauri 调用层（invoke、事件订阅、预览地址） |
| `src-tauri/src/` | Rust 桌面层：资源定位、批次队列、子进程与进度解析、更新检查 |
| `src-tauri/binaries/` | sidecar 推理程序（构建时生成，不入库） |
| `src-tauri/resources/` | 模型与 DLL（构建时生成，不入库） |
| `public/realsgan/` | 推理二进制、模型与 DLL 的唯一真源 |
| `scripts/prepare-tauri-assets.mjs` | 把 `public/realsgan` 准备成 Tauri 可打包的布局 |

## 实现方式与原理

### 前后端通讯

前端不直接驱动推理进程，而是通过 Tauri 命令与事件和 Rust 桌面层交互。所有调用集中在 `src/lib/desktop.ts`。

````ts
import { invoke } from "@tauri-apps/api/core";

// 提交批次：参数在提交时固定
await invoke("start_batch", {
  request: { inputs, model, output },
});
````

````ts
import { listen } from "@tauri-apps/api/event";

// 批次状态推送：等待 / 执行中 / 成功 / 失败 / 已取消
await listen("batch:update", (event) => {
  console.log(event.payload);
});
````

### 任务调度与推理进程

Rust 侧持有批次、队列与子进程。同一时间只允许一个推理进程，重复开始会被拒绝；停止会先记录请求，再终止子进程并取消后续任务。

````rust
let mut command = Command::new(&binary);
command
    .arg("-i").arg(&input)
    .arg("-o").arg(&output)
    .arg("-m").arg(&models_dir)
    .arg("-n").arg(&model);
````

推理进度来自子进程输出中形如 `12.34%` 的整行文本。解析按流增量进行，兼容分段到达与 `\r` / `\n` 两种分隔符；stderr 中的其他内容是日志，既不算错误也不算进度。

### 资源与打包

- 推理二进制以 Tauri sidecar 形式打包，按目标 triple 命名，需先执行 `bun run assets`。
- 模型与 Windows DLL 作为附加资源打包，运行时通过 Tauri 路径接口定位，不依赖源码目录或工作目录。
- 输出重名时自动改名为 `a_opt(1).png`，不覆盖已有文件。

macOS 安装包位于 `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/`；原生默认目标构建位于 `src-tauri/target/release/bundle/`。上传脚本同时识别这两种布局，并排除旧 Intel / Universal 安装包。

## 项目文档

- [文档索引](docs/README.md)
- [测试指南](docs/testing.md)

现有 macOS / Windows 手动构建按钮已改为 Tauri 安装包构建并沿用 COS 上传；macOS 构建固定为 `aarch64-apple-darwin`，仅上传 arm64 安装包；Runner 需要预先安装 Rust（rustup）与平台构建工具。当前没有 Linux 推理二进制，因此不提供 Linux 安装包构建入口。

## 迁移文档

- [Tauri 迁移 Intent](docs/tauri-migration/intent.md)
- [Tauri 迁移 Spec](docs/tauri-migration/spec.md)

# 问题反馈

您可以在这个页面的 issues 提交您的疑问，建议附上日志，控制台（Ctrl+Shift+I调出 或 点击页面上栏的调试控制台）截图

或者到 https://support.qq.com/product/419220 进行业务层面的反馈