# 构建与发布

## 构建

```bash
bun run build     # tsc && vite build && electron-builder
```

产物位置：

| 目录 | 内容 |
| --- | --- |
| `dist/` | 渲染层构建结果（`index.html` + 资源） |
| `dist-electron/main` `dist-electron/preload` | 主进程与 preload 构建结果 |
| `release/${version}/` | 安装包与未打包目录（`directories.output`） |

`electron-builder.json` 关键配置：

| 配置 | 值 | 说明 |
| --- | --- | --- |
| `productName` | `ArSrNaUIESRGAN` | 安装包文件名前缀 |
| `appId` | `arsrnauiesrgan` | 应用标识 |
| `asar` | `true` | 应用代码打包为 asar |
| `files` | `dist-electron`、`dist` | 只打包构建产物 |
| `extraResources` | `public` | 超分内核与模型随包分发，运行时从 `process.resourcesPath/public` 读取 |
| `win.target` / `win.artifactName` | `nsis` / `${productName}_${version}.${ext}` | 生成 `ArSrNaUIESRGAN_<版本>.exe` |
| `mac.target` | `dmg` | 生成 `ArSrNaUIESRGAN-<版本>[-arm64|-universal].dmg`（x64 不带架构后缀） |
| `linux` | 未显式配置 | 使用 electron-builder 默认目标（`.AppImage`，启用 snap 时为 `.snap`），上传脚本两者都支持 |
| `nsis` | 非一键安装、可改安装目录、创建桌面/开始菜单快捷方式 | 快捷方式名称为「ArSrNa ESRGAN 图像版」 |
| `electronDownload.mirror` | npmmirror | 加速 Electron 二进制下载 |

产物命名直接影响自动更新与上传脚本，修改前请同步检查 `scripts/upload-cos.ts`。

## 上传到腾讯云 COS

```bash
bun run upload:cos                                  # 当前平台 + 自动识别架构
bun run upload:cos --platform macos --arch arm64     # 指定平台与架构
bun run upload:cos --dry-run                         # 只打印计划，不发送请求、不需要凭据
bun run upload:cos --help                            # 查看用法
```

环境变量：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `SECRET_ID` / `SECRET_KEY` | 是 | 腾讯云访问密钥 |
| `SESSION_TOKEN` | 否 | 临时密钥 token，透传为 `SecurityToken` |
| `COS_BUCKET` / `COS_REGION` | 是 | 存储桶与地域；兼容旧变量名 `APP_RELEASE_BUCKET` / `APP_RELEASE_REGION`，独立变量优先 |
| `COS_PREFIX` | 否 | 对象前缀，默认 `app-release/ArSrNaUI-ESRGAN`，不允许首尾斜杠、`..` 或反斜杠 |

上传规则：

- 只选择构建目录**顶层**的安装包（Windows `.exe`、macOS `.dmg`、Linux `.AppImage` / `.snap`），跳过目录、符号链接、`.blockmap`、`latest.yml` 等辅助文件；
- 文件名中的版本号必须与 `package.json` 一致，否则忽略；
- 不指定 `--arch` 时按文件名后缀识别架构：`-arm64` / `-aarch64` → `arm64`，`-universal` → `universal`，无后缀的 DMG/AppImage 视为 `x64`，Windows 安装包沿用宿主架构；`universal` 仅允许 macOS；
- 对象 Key 规范：`<COS_PREFIX>/<version>/<platform>/<arch>/<文件名>`，例如 `app-release/ArSrNaUI-ESRGAN/7.1.0/macos/arm64/ArSrNaUIESRGAN-7.1.0-arm64.dmg`；
- 使用 8 MiB 分片上传，任一文件失败即中断并只输出错误码（不打印可能包含鉴权头的 SDK 错误对象）；
- 缺少构建目录时提示「请先构建」。

## CI（.cnb.yml）

| 流水线 | 触发 | 步骤 |
| --- | --- | --- |
| `web_trigger_build_linux` | 手动 | `bun i` → `bun run build` → `bun run upload:cos` |
| `web_trigger_build_mac` | 手动（`seele-macbook` 构建机） | 同上 |
| `web_trigger_build_windows` | 手动（`keqing` 构建机） | 同上 |
| 默认流水线 | 任意分支 push | 同步仓库到 GitHub（`https://github.com/ArSrNa/ArESRGAN-GUI.git`） |

COS 凭据通过 `imports: https://cnb.cool/arsrna/env/-/blob/main/cos.yaml` 注入，仓库内不保存密钥；Electron 下载镜像由 `.electron_mirror` 统一配置。

## 版本与更新检查

- **唯一版本来源**：`package.json` 的 `version`，构建时由 Vite 写入应用；`bun run release:metadata` 输出当前版本，便于登记更新接口。
- **更新接口**：`GET https://api-gz.arsrna.cn/release/appUpdate/ArESRGAN`，返回：

  ```json
  { "version": "7.1.0", "link": "https://www.arsrna.cn/app/esrgan/#download" }
  ```

- **客户端行为**（`src/utils.tsx`）：
  - 本地与远端版本都必须通过 semver 校验，否则提示“检查更新失败”；
  - 仅当远端版本 **高于** 本地版本时用 `toast.success` 提示更新（支持 `7.0.0-beta.2` 这类预发布版本，构建元数据不参与比较）；
  - 有更新时 `link` 必须是 https 链接，否则视为非法响应；
  - 版本相同时提示“当前版本已是最新版本”，请求失败提示具体错误原因。
- 应用启动与导航栏「更多 → 检查更新」都会触发该检查。

## 发版清单

1. 更新 `package.json` 的 `version`（遵循 semver）；
2. 运行 `bun test`、`bun run build` 确认测试与构建通过；
3. 在更新接口登记新的 `version` 与 `link`（可先用 `bun run release:metadata` 核对版本号）；
4. 触发对应平台的 `web_trigger_build_*` 流水线完成构建与 COS 上传，或本地执行 `bun run upload:cos --dry-run` 核对计划后再上传；
5. 可选：运行 `bun run changelog` 更新 `CHANGELOG.md`；
6. 校验 CDN 上的安装包可下载，再对外发布更新说明。
