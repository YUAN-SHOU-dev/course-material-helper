# 开发与打包

运行扩展无需构建。开发检查使用 Node.js 24.15+，打包使用 Python 3 标准库。

```sh
npm ci --ignore-scripts
npm test
npm run check
npm run preview
```

预览服务只监听 127.0.0.1:4178，按 Ctrl+C 停止。首页使用真实弹窗控制器和模拟浏览器 API，其中下载任务是模拟的。/qa/fixtures.html 是合成 DOM 测试页，不能作为真实课程平台的兼容性证明。

## 代码位置

- extension/popup.html、popup.css：界面与样式。
- extension/messages.js：动态中文提示。
- extension/popup.js：扫描、复制与下载交互。
- extension/extractor.js：URL 提取与文件名处理，可序列化注入页面。
- extension/download-state.js：下载状态解释。
- tests/：Node + jsdom 测试，注入与下载 API 使用测试替身。

## 发布包

```sh
npm run package
```

产出 dist/course-material-helper-v<版本>-extension.zip、-source.zip 和 SHA256SUMS.txt。包内有逐文件 FILE_SHA256.json。安装包保留 extension 子目录，INSTALL.md 和 AI_INSTALL.md 均以它为加载目标。

脚本按允许名单打包，排除 node_modules、Git 历史和本机配置。发布前完成测试与静态检查，核对版本、文档链接与 ZIP 哈希。真实安装验收在 COMPATIBILITY.md 独立记录。

预览截图使用示例数据。勿把模拟下载标为真实成功，也勿承诺所有平台支持。反馈应包含浏览器版本、扩展版本、脱敏页面结构与操作步骤，避免收集完整签名地址或私有课程内容。
