# 开发指南

## 环境要求

| 项 | 版本 / 说明 |
| --- | --- |
| 操作系统 | macOS 15 开发；Windows、Linux 亦可构建 |
| Node.js | 25（CI 使用 `docker.cnb.cool/arsrna/dev-image/nodejs`） |
| 包管理器 | bun 1.3.1 |
| Git LFS | 必须安装：`public/realsgan`（可执行文件与模型）由 LFS 管理，缺失会导致超分功能不可用 |

> 中国大陆网络：安装依赖时不要切换镜像，Electron 相关依赖使用镜像会报错；仓库已在 `.cnb.yml` 和 `electron-builder.json` 中配置了 Electron 下载镜像。

## 安装与启动

```bash
git clone https://cnb.cool/arsrna/esrgan-app
cd esrgan-app
git lfs pull   # 拉取超分内核与模型
bun i
bun dev        # 启动 Vite + Electron
```

Windows 建议使用 `bun win`（等价于 `chcp 65001 && vite`）以避免控制台中文乱码。

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `bun dev` / `bun win` | 启动开发环境（Vite + Electron 热更新） |
| `bun run build` | `tsc` + `vite build` + `electron-builder`，产物位于 `release/${version}` |
| `bun run preview` | 预览已构建的渲染层 |
| `bun test` | 运行全部测试（`vitest run`，详见 [testing.md](./testing.md)） |
| `bun run changelog` | 基于 angular 规范生成 `CHANGELOG.md` |
| `bun run release:metadata` | 输出 `package.json` 中的版本号与发布提示 |
| `bun run upload:cos` | 上传安装包到腾讯云 COS，详见 [build-and-release.md](./build-and-release.md) |

## 代码组织与别名

- `@/*` → `src/*`（`vite.config.ts` 与 `vitest.config.ts` 均已配置）；
- 基础 UI 组件放在 `src/components/ui`，业务组件与页面放在 `src/`；
- 主进程代码放在 `electron/main`，新增 IPC 通道时同步更新 [ipc.md](./ipc.md)；
- TypeScript 配置：`tsconfig.json` 覆盖 `src` / `electron` / `scripts`，`tsc` 在构建前执行类型检查。

## 调试

- **渲染层**：开发模式下窗口自动打开 DevTools；运行时也可通过导航栏「更多 → 调试控制台」调用 `openDevTools` 通道。
- **主进程**：直接查看终端输出（启动时会打印平台信息、每次处理任务的入参与子进程日志）。
- **错误边界**：`NODE_ENV=development` 时错误页面会展开错误堆栈与组件栈。
- **资源路径**：开发模式读取 `public/`，需要临时验证打包行为时可设置 `DEBUG_PROD=true`。

## 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 启动后模型列表为空 | 确认 `public/realsgan/models` 已通过 `git lfs pull` 拉取（应有 5 个 `.param` 模型） |
| 处理时提示“文件不存在” | 传给主进程的是绝对路径，Windows 下注意路径分隔符由主进程统一转换 |
| Windows 控制台中文乱码 | 使用 `bun win` 启动 |
| 修改 `package.json` 版本后更新提示异常 | 版本号由 Vite 在构建时写入应用，修改后需重新构建 |
| sass 输出 `legacy-js-api` 弃用警告 | Sass 依赖链的已知警告，不影响构建与测试 |
