# ESRGAN图像超分辨率软件

# 构建

平台：node 25 ；bun包管理器1.3.1；使用macOS15开发

vite electron框架，比以前的react electron启动快**91%**

## clone

```bash
git clone https://cnb.cool/arsrna/esrgan-app
```

## 安装依赖

```bash
cd esrgan-app
bun i
```

_中国大陆用户注意：由于dddd的原因，安装过程不一定顺利，因为electron某些依赖使用镜像会报错，所以建议不要换镜像下载，使用默认镜像即可_

# 启动

```shell
bun dev
```

## 更新检查

当前版本直接读取根目录 `package.json` 的 `version` 字段，无需在 `.env` 中重复配置。
检查更新时请求 `https://api-gz.arsrna.cn/release/appUpdate/ArESRGAN`，
按 semver 规则比较响应中的 `version` 与当前版本，仅在远端版本更高时提示更新，并使用 `link` 作为下载地址。
支持预发布版本（例如 `7.1.0-beta.1`），构建元数据不影响版本优先级；不再依赖 ASAR hash。

发布前只需更新 `package.json` 的 `version`，更新检查和安装包命名共用此版本号。
运行 `bun run release:metadata` 可输出当前 `version`；现有更新检查接口使用 `version` 字段承载此值。
版本号由 Vite 在构建时写入应用，修改后需重新构建；开发环境也可检查更新。

# 意见反馈

欢迎前往：https://support.qq.com/products/419220 提交反馈，或在此仓库Issue中提交反馈。
