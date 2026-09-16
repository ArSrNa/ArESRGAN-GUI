# 架构说明

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 桌面容器 | Electron 43（`electron-builder` 打包） |
| 构建 | Vite 7 + `vite-plugin-electron`（主进程 / preload / 渲染层一体构建） |
| UI | React 19 + TypeScript + Tailwind CSS 4 + Radix UI（shadcn 风格组件位于 `src/components/ui`） |
| 状态与表单 | jotai（跨组件状态）、react-hook-form（表单） |
| 路由 | react-router-dom（使用 `MemoryRouter`，适配 Electron 本地加载） |
| 其他 | sonner（提示）、semver（版本比较）、fs-extra、lucide-react（图标） |
| 超分内核 | Real-ESRGAN ncnn Vulkan 可执行文件（`public/realsgan`） |

## 进程模型

```
┌──────────────────────────── 渲染层 (src/) ────────────────────────────┐
│ App.tsx  ──  MemoryRouter ── Home / Copyright / Error                 │
│   │  jotai atoms(filesState, modelsState) + react-hook-form            │
│   │                                                                    │
│   └── window.ipcRenderer / window.webUtils                            │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ contextBridge（electron/preload/index.ts）
┌───────────────────────────────┴───────────────────────────────────────┐
│ 主进程 (electron/main/)                                                │
│   index.ts   窗口、菜单、生命周期、通用 IPC（getModels/selectFolder…）  │
│   esrgan.ts  spawn Real-ESRGAN 可执行文件，转发进度与退出码             │
│   utils.ts   文件 sha256（发布/校验用工具函数）                         │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ child_process
                    public/realsgan/realesrgan-ncnn-vulkan(.exe)
```

- **渲染层**只通过 `window.ipcRenderer`（`invoke` / `send` / `on` / `off` / `once`）与主进程通信，不直接访问 Node API。
- **preload** 使用 `contextBridge.exposeInMainWorld` 暴露最小 API，`contextIsolation` 保持默认开启。
- 窗口 `webPreferences.webSecurity = false`：渲染层需要以 `file://` 协议直接显示用户本地图片（开发模式下页面来自 http 服务）。

## 目录结构

```
electron/
  main/
    index.ts     # 主进程入口：窗口、菜单、通用 IPC
    esrgan.ts    # 图像处理子进程管理（esrgan / kill-esrgan）
    utils.ts     # getHash 等通用工具
  preload/
    index.ts     # contextBridge 暴露 ipcRenderer / webUtils
src/
  App.tsx        # 路由与页面骨架（含更新检查、Toaster）
  Home.tsx       # 首页：上传图片、选择模型与输出路径、批量处理
  Copyright.tsx  # 开源许可页
  error.tsx      # 404 页面
  states.ts      # jotai atoms（filesState / modelsState）
  types.ts       # FormDataType 等类型
  utils.tsx      # CheckUpdate：语义化版本更新检查
  lib/utils.ts   # cn：Tailwind 类名合并
  components/    # dropzone / ErrorBoundary / navbar1 + ui/* 基础组件
public/
  realsgan/      # Real-ESRGAN 可执行文件与模型（Git LFS 管理）
scripts/
  upload-cos.ts  # 构建产物上传腾讯云 COS
docs/            # 本文档目录
```

## 渲染层结构

- **路由**（`src/App.tsx`）：`/` 首页、`/os` 开源许可、`*` 错误页；整体包裹 `ErrorBoundary`，顶部 `Toaster` 用于全局提示。
- **状态**：
  - `filesState`（jotai）：待处理图片，`Dropzone` 与首页共享，切换页面不丢失；
  - `modelsState`：为后续扩展预留的模型 atom；
  - 表单值由 react-hook-form 管理，`files`、`model`、`output.mode`、`output.path` 即 `FormDataType`。
- **首页两个部分**：
  1. 表单区：拖拽/点击上传图片、选择模型（模型列表来自主进程 `getModels`，显示时去掉 `.param` 后缀）、选择输出路径（原文件路径 / 自定义目录）；
  2. `TView`：预览已选图片、逐张提交处理、显示“处理中 x% / 等待处理”、支持停止与清空。

## 图像处理流程

1. 用户拖入图片 → `Dropzone` 过滤 `image/*` → 写入 `filesState`；
2. 通过 `webUtils.getPathForFile` 取得本地绝对路径（渲染层无法直接读取真实路径）；
3. 点击“开始” → 对每张图片依次 `ipcRenderer.invoke("esrgan", { filepath, model, output })`；
4. 主进程校验文件存在 → 计算输出路径（`原文件_opt.png` 或 `自定义目录/文件名_opt.png`，自定义目录不存在则自动创建）→ `spawn` 可执行文件，参数为 `-i 输入 -o 输出 -m 模型目录 -n 模型名`；
5. 子进程 stderr 输出百分比 → 主进程换算为 `0~1` 更新任务栏进度条，并以 `esrgan:stdout` 事件发给渲染层；渲染层据此显示百分比；
6. 子进程退出 → 主进程回传 `esrgan:stderr`（`type: "exit"`）并 resolve；“停止”按钮调用 `kill-esrgan`，主进程向子进程发送 `SIGINT`。

## 资源与路径解析

`electron/main/index.ts` 的 `getAssetPath()` 统一处理随包资源：

- 开发模式（`NODE_ENV=development` 或 `DEBUG_PROD=true`）：读取项目 `public/`；
- 打包后：读取 `process.resourcesPath/public`（`electron-builder.json` 中 `extraResources: ["public"]`）。

因此模型扫描（`getModels`）与可执行文件（`getExecPath`）在开发与生产环境使用同一份代码。

## 错误处理

| 场景 | 处理方式 |
| --- | --- |
| 渲染层组件异常 | `ErrorBoundary` 兜底界面，开发模式展开错误堆栈，可刷新重载 |
| 处理失败 / 文件不存在 | `esrgan` 处理器 reject，错误信息经 IPC 返回后由调用方处理 |
| 模型列表、更新检查失败 | 静默捕获并通过 `toast.error` 提示 |
| 非法访问路径 | 路由 `*` 展示错误页并显示请求路径 |
| 重复启动 | `app.requestSingleInstanceLock()` 保证单实例，第二次启动聚焦已有窗口 |
