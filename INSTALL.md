# 安装、更新与卸载

适用于电脑上的 Chrome / Edge，建议保持浏览器正常更新。Safari、Firefox 和手机浏览器不在当前支持范围。受学校或公司管理的设备可能禁止开发者模式，请遵循设备管理员的设置。

## 1. 下载安装包

打开 [最新版本](https://github.com/YUAN-SHOU-dev/course-material-helper/releases/latest)，展开 **Assets**，下载 `course-material-helper-v1.2.0-extension.zip`（后续以实际版本号为准）。

`-extension.zip` 给直接使用插件的用户准备；`-source.zip` 含开发工具；GitHub 自动生成的 **Source code (zip)** 也可使用，但内容更多。

## 2. 解压到固定目录

Windows 可右键 ZIP →“全部解压”；macOS 可双击 ZIP。建议把解压目录放在“文档/浏览器扩展”等长期保留的位置。

```text
course-material-helper-v1.2.0-extension/
├── README.md
├── INSTALL.md
├── AI_INSTALL.md
├── PRIVACY.md
├── COMPATIBILITY.md
├── CHANGELOG.md
├── FILE_SHA256.json
└── extension/                 ← 加载时选择这一层
    ├── manifest.json
    ├── popup.html
    ├── popup.css
    └── …
```

**判断标准：选中的文件夹里直接包含 `manifest.json`。** 无论下载的是安装包、源码包还是仓库 ZIP，都选择其中的 `extension` 子文件夹。

## 3. 加载到浏览器

1. 在地址栏输入 `chrome://extensions/`；Edge 输入 `edge://extensions/`。这些地址需手动输入或粘贴。
2. 开启“开发者模式 / Developer mode”。
3. 点击“加载已解压的扩展程序 / Load unpacked”（部分 Edge 版本显示“加载解压缩的扩展”）。
4. 选择上一步找到的 `extension` 文件夹。
5. 确认管理页面出现“课件拾取 · Course Material Helper”，版本与下载包一致、开关已启用。
6. 打开浏览器工具栏的拼图图标，找到课件拾取，可点图钉固定。

安装到常用浏览器的正确个人资料中。下载、解压完成后不需要运行任何脚本，也不需要管理员权限。

## 4. 做一次使用检查

1. 进入自己有权限访问的课程网页，先打开一个附件预览。
2. 打开扩展，检查候选文件名和文件服务器域名。
3. 点“复制链接”，在本地文本编辑器粘贴检查。带签名的地址不要发到公开讨论区。
4. 点“下载”，选择保存位置，在浏览器下载记录中核对，并打开文件确认内容。

“找到文件”代表识别到了候选地址；文件能否下载还取决于原站点的权限和有效期。

## 更新

本地安装不会自动跟随 GitHub 更新。请先下载新版并保留旧目录副本。

**保留原安装路径：** 用新版 `extension` 内的文件替换原已加载的 `extension` 文件夹中的对应文件；回管理页点击课件拾取卡片上的“重新加载”图标，再刷新课程页并确认新版本号。

**改用新目录：** 在管理页移除旧的课件拾取，再按第 3 步加载新版目录。移除扩展不会删除已经下载的课件。避免同时启用两份同名插件。

安装后不要删除、移动或改名正在使用的目录。想移动时，应先移到最终位置，再从该位置重新加载。

## 卸载

在管理页点击课件拾取卡片上的“移除”。之后可以删除其本地文件夹，已下载的资料继续保留。

## 常见问题

| 现象 | 处理方法 |
| --- | --- |
| 清单缺失或找不到 manifest.json | 完整解压 ZIP，选择内层 extension 文件夹。 |
| 工具栏没有按钮 | 点拼图图标并固定；核对是否使用同一浏览器个人资料。 |
| 没有加载已解压按钮 | 检查开发者模式。若由管理员控制，联系管理员。 |
| 开发者模式或非商店安装提示 | 按浏览器说明判断是否继续使用；本项目采用本地加载方式，更新也需手动完成。 |
| 提示只能在课程网页中使用 | 切换到 HTTP/HTTPS 网页。浏览器设置页、扩展商店、内置 PDF 阅读器可能无法读取。 |
| 没找到文件 | 先打开课件预览，加载后重新扫描；该页面也可能使用不支持的结构。 |
| 下载到登录页、错误页或空文件 | 回平台重新登录、打开附件再提取；仍失败时使用平台自己的下载入口。 |
| 点下载后弹窗关闭 | 查看浏览器下载记录；保存对话框和点击弹窗外部可能使弹窗关闭。 |
| AI 说已解压，但浏览器没有扩展 | 继续完成第 3 步；解压和浏览器加载是两个独立步骤。 |
| 更新后还是旧界面 | 核对版本号与加载路径，重新加载，检查是否有另一份同名扩展。 |

官方参考：[Chrome 加载已解压扩展](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-an-unpacked-extension)、[Edge 本地安装与更新](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)。
