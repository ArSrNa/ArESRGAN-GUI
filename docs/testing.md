# 测试指南

## 运行方式

```bash
bun install --frozen-lockfile
bun run test
bun run assets
cargo test --manifest-path src-tauri/Cargo.toml --lib --locked
bun run build
```

`bun run build` 检查 TypeScript 并构建前端；桌面安装包使用 `bun run app:build`。本地单元测试不能替代 Windows x64、macOS Intel / Apple Silicon 安装版与 GPU 推理验收。

## 覆盖范围

| 位置 | 覆盖内容 |
| --- | --- |
| `src/Home.test.tsx` | Jotai 状态、原生选图与拖入、批次提交、停止中禁用重启、进度与过期事件、目录选择、订阅清理 |
| `src/App.test.tsx` | 启动检查、页面路由、错误页 |
| `src/utils.test.tsx` | 原生更新检查结果展示、开发模式、错误与下载地址校验 |
| `src/components/ErrorBoundary.test.tsx` | 错误兜底、刷新入口与开发模式详情 |
| `src/components/dropzone.test.tsx` | 保留的浏览器上传组件交互；Tauri 首页使用原生路径组件 |
| `src/lib/utils.test.ts` | 类名合并与冲突处理 |
| `scripts/upload-cos.test.ts` | Tauri DMG/NSIS 与旧版产物识别、架构、配置、上传参数和错误处理；不执行真实上传 |
| `release.test.ts` | package.json 版本元数据与非法版本校验 |
| `src-tauri/src/batch.rs` | 流式百分比解析、非进度日志、输出重名分配 |
| `src-tauri/src/update.rs` | semver 解析、预发布版本及构建元数据比较 |

## 编写约定

- `vitest.config.ts` 默认使用 node；DOM 测试首行声明 `// @vitest-environment jsdom`，通过 vitest.setup.ts 补齐浏览器 API。
- 原生桌面边界使用 `src/test/desktopMock.ts`，不再注入 Electron IPC。组件测试明确清理 React 挂载和事件监听。
- 版本比较移至 Rust；前端只测试原生结果展示。进程与文件逻辑优先在原生层验证。
- 文件系统测试在临时目录运行；COS SDK 使用替身，不调用真实上传。
- 原 Electron 主进程及 preload 测试随对应实现删除，避免继续验证已不存在的运行时。
