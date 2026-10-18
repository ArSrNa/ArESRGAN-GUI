# 项目文档

ESRGAN 图像超分辨率软件（ArSrNa ESRGAN UI）的开发者文档。

| 文档 | 内容 |
| --- | --- |
| [tauri-migration/intent.md](./tauri-migration/intent.md) | Tauri 迁移意图与范围 |
| [tauri-migration/spec.md](./tauri-migration/spec.md) | 当前 Tauri 架构、任务、资源及接口设计 |
| [architecture.md](./architecture.md) | 技术栈、进程模型、目录结构、核心数据流 |
| [development.md](./development.md) | 环境准备、安装启动、调试、常见问题 |
| [testing.md](./testing.md) | 测试运行方式、覆盖范围、编写约定 |
| [ipc.md](./ipc.md) | 主进程 / preload / 渲染层通信接口 |
| [build-and-release.md](./build-and-release.md) | 打包、COS 上传、更新检查与发版流程 |

## 快速开始

```bash
bun i        # 安装依赖
bun run app:dev # 启动 Tauri 开发窗口
bun run test # 运行前端和脚本测试
cargo test --manifest-path src-tauri/Cargo.toml --lib --locked # Rust 测试
bun run app:build # 构建安装包
```

当前入口见[项目 README](../README.md) 和 [Tauri Spec](./tauri-migration/spec.md)。architecture、development、ipc、build-and-release 保留为 Electron 7.x 历史资料；旧发布工具兼容逻辑仍有测试，当前安装包从 src-tauri/target 下读取。
