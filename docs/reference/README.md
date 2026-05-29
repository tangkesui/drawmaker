# Reference

冻结历史和参考资料，**只读**。不参与构建，不作为代码依赖。

## drawio-package.json

来源：`/Applications/draw.io.app/Contents/Resources/app.asar` 内 `/package.json`
版本：drawio-desktop **v30.0.4**
归档日期：2026-05-28

作用：作为我们项目立项参照的 drawio 版本快照。**我们不沿用其依赖列表**（`electron-store`、`electron-updater`、`electron-context-menu` 等均为 Electron 专属，与 Tauri 不兼容）。
