# IPC 接口参考

渲染层不直接访问 Node API，所有能力都通过 `electron/preload/index.ts` 暴露的 `window.ipcRenderer` 与 `window.webUtils` 调用。下面按“渲染层调用主进程”和“主进程推送事件”两类列出。

## preload 暴露的 API

```ts
window.ipcRenderer.on(channel, listener)      // 订阅主进程事件，自动透传 event 参数
window.ipcRenderer.once(channel, listener)    // 仅订阅一次
window.ipcRenderer.off(channel, listener)     // 取消订阅
window.ipcRenderer.send(channel, ...args)     // 单向消息
window.ipcRenderer.invoke(channel, ...args)   // Promise 请求/响应

window.webUtils.getPathForFile(file)          // Promise<string>，获取拖入文件的真实路径
```

## 渲染层 → 主进程（invoke）

| 通道 | 入参 | 返回 | 说明 |
| --- | --- | --- | --- |
| `esrgan` | `{ filepath: string; model: string; output: { mode: "current" \| "custom"; path?: string } }` | `{ type: "exit"; code: number \| null; signal: NodeJS.Signals \| null; output: string }` | 处理单张图片；文件不存在时 reject，子进程 `error` 事件时 reject |
| `kill-esrgan` | — | `void` | 向当前子进程发送 `SIGINT` 并清空引用；无运行中的子进程时安全返回 |
| `getModels` | — | `{ success: true; data: string[] } \| { success: false; data: unknown }` | 扫描 `realsgan/models` 下含 `.param` 的文件，失败时 `data` 为错误对象 |
| `selectFolder` | — | `string \| undefined` | 打开“选择文件夹”对话框，取消时返回 `undefined`，路径中的 `\` 已转为 `/` |
| `env` | — | `void` | 通过 `env` 事件回传 `app.isPackaged`（预留） |
| `setOutPath` | — | `string \| undefined` | 与 `selectFolder` 等价的历史通道，当前渲染层未使用 |
| `open-win` | `arg: string` | `void` | 以 `#arg` 打开子窗口（脚手架保留能力） |

`esrgan` 输出路径规则：

- `output.mode === "current"`：`<原文件路径>_opt.png`；
- `output.mode === "custom"`：`<output.path>/<原文件名>_opt.png`，目录不存在时自动递归创建。

## 渲染层 → 主进程（send）

| 通道 | 入参 | 说明 |
| --- | --- | --- |
| `openDevTools` | — | 打开主窗口开发者工具，导航栏「更多 → 调试控制台」使用 |

## 主进程 → 渲染层（事件）

| 通道 | 载荷 | 说明 |
| --- | --- | --- |
| `esrgan:stdout` | `{ type: "log"; data: string; progress: number }` | 子进程 stderr 输出；`data` 为原始文本（如 `"42.5%"`），`progress` 为 `0~1` 进度 |
| `esrgan:stderr` | `{ type: "error"; data: string }` 或 `{ type: "exit"; data: number \| null }` | 子进程错误信息或退出码 |
| `env` | `boolean` | `app.isPackaged`（配合 `invoke("env")` 使用） |
| `main-process-message` | `string` | 页面加载完成时推送的时间戳，用于脚手架自检 |

## 典型调用示例

```tsx
// 渲染层：处理单张图片并订阅进度
const onLog = (_e, payload: { data: string }) => setProgress(parseInt(payload.data));
ipcRenderer.on("esrgan:stdout", onLog);
const result = await ipcRenderer.invoke("esrgan", {
  filepath: "/Users/me/a.png",
  model: "realesrgan-x4plus-anime",
  output: { mode: "custom", path: "/Users/me/out" },
});
ipcRenderer.off("esrgan:stdout", onLog);
```

```ts
// 主进程：注册处理器（electron/main/esrgan.ts）
ipcMain.handle("esrgan", async (event, data) => { /* 校验 → spawn → 转发日志 → resolve */ });
```

## 安全约定

- `contextIsolation` 保持默认开启，渲染层只能使用 preload 暴露的通道；
- 新增通道时只暴露必要能力，参数在主进程侧做校验（如 `esrgan` 会先校验文件存在）；
- 上传/发布等敏感操作不进入渲染层，全部放在 `scripts/` 与 CI 中执行。
