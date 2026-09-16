# 项目文档

ESRGAN 图像超分辨率软件（ArSrNa ESRGAN UI）的开发者文档。

| 文档 | 内容 |
| --- | --- |
| [architecture.md](./architecture.md) | 技术栈、进程模型、目录结构、核心数据流 |
| [development.md](./development.md) | 环境准备、安装启动、调试、常见问题 |
| [testing.md](./testing.md) | 测试运行方式、覆盖范围、编写约定 |
| [ipc.md](./ipc.md) | 主进程 / preload / 渲染层通信接口 |
| [build-and-release.md](./build-and-release.md) | 打包、COS 上传、更新检查与发版流程 |

## 快速开始

```bash
bun i        # 安装依赖
bun dev      # 启动开发环境
bun test     # 运行全部测试
bun run build # 构建安装包
```

更详细的说明见上方各章节，初次接触项目建议从 [architecture.md](./architecture.md) 开始。
