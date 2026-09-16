# 测试指南

## 运行方式

```bash
bun test                            # 等价于 vitest run，跑一遍全部用例
npx vitest                          # 监听模式，按文件变化增量执行
npx vitest run src/Home.test.tsx    # 只跑指定文件
npx vitest run -t "检查更新"         # 按用例名过滤
```

## 测试配置

- **`vitest.config.ts`**：默认 `environment: "node"`，配置 `@` → `src` 别名（与 `vite.config.ts` 保持一致），并注册 `vitest.setup.ts`。
- **`vitest.setup.ts`**：仅在 jsdom 环境下补齐 Radix UI / sonner 依赖的浏览器 API（`ResizeObserver`、`matchMedia`、`scrollIntoView`、指针捕获），node 环境不做任何处理。
- **需要 DOM 的用例**：在文件首行加注释切换环境，无需修改全局配置。

  ```tsx
  // @vitest-environment jsdom
  ```

## 覆盖范围

| 测试文件 | 覆盖内容 |
| --- | --- |
| `src/utils.test.tsx` | `CheckUpdate`：semver 比较、非法接口版本、HTTP/网络错误、下载链接校验 |
| `src/lib/utils.test.ts` | `cn`：类名合并、Tailwind 冲突覆盖、假值过滤 |
| `src/components/dropzone.test.tsx` | 上传交互：点击选择、拖拽过滤 `image/*`、非图片提示、输入框重置 |
| `src/components/ErrorBoundary.test.tsx` | 正常渲染、错误兜底界面、开发模式错误详情 |
| `src/Home.test.tsx` | 首页主流程：模型列表加载与失败提示、预览与删除/清空、逐个调用 `esrgan`、进度与停止、自定义输出路径 |
| `src/App.test.tsx` | 应用外壳：启动时检查更新、路由跳转到开源许可、未匹配路径的 404 页面 |
| `electron/preload/index.test.ts` | `contextBridge` 暴露面：`on` / `once` / `off` / `send` / `invoke` 参数转发、`webUtils` 委托 |
| `electron/main/utils.test.ts` | `getHash`：sha256 摘要、二进制与空文件、文件不存在 |
| `electron/main/esrgan.test.ts` | 主进程处理链路：入参校验、输出路径、spawn 参数、进度换算、退出与错误、`kill-esrgan` |
| `scripts/upload-cos.test.ts` | COS 上传：产物筛选与架构识别、配置读取、参数校验、SDK 调用与错误处理、CLI |
| `release.test.ts` | `release:metadata`：版本输出与非法版本校验 |

## 编写约定

1. **Window API 必须在导入前注入**：`Home.tsx` / `Navbar1.tsx` 在模块顶层读取 `window.ipcRenderer`、`window.webUtils`，因此组件测试使用 `vi.hoisted` 注入桩（`vi.hoisted` 的回调会在 import 之前执行）：

   ```tsx
   const mocks = vi.hoisted(() => {
     const invoke = vi.fn();
     Object.assign(window, { ipcRenderer: { invoke, on: vi.fn(), off: vi.fn(), send: vi.fn() } });
     return { invoke };
   });
   import Home from "./Home";
   ```

2. **测试主进程处理器**：`electron/main/esrgan.test.ts` 通过 mock `electron` 把 `ipcMain.handle` 的处理器收集到 `Map`，再直接调用，避免启动真实 Electron。
3. **mock 外部副作用**：`sonner`（toast）、`child_process`（spawn 假子进程）、`fetch`（更新检查）、`electron` 全部桩化；临时文件统一使用 `mkdtemp` + `rm` 清理。
4. **组件测试收尾**：vitest 未开启 `globals`，自动清理不会生效，需显式 `afterEach(cleanup)`；对会打印日志的组件用 `vi.spyOn(console, "log")` 静默，保持输出可读。
5. **jsdom 限制**：`window.location` 不可被替换/改写，涉及导航的用例只断言“点击不抛异常”，真实跳转由人工验证。
6. **新增功能时**：逻辑放纯函数便于测试；新增 IPC 通道在 `electron/main/esrgan.test.ts` 风格下补充处理器测试，并在 [ipc.md](./ipc.md) 中登记接口。

## 依赖说明

测试相关依赖仅用于开发：`vitest`、`jsdom`、`@testing-library/react`、`@testing-library/dom`。请勿将它们加入 `dependencies`，否则会被 `vite-plugin-electron` 打进主进程 bundle。
