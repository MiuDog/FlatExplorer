# 更新與復原

## BRAT 安裝

在 BRAT 檢查追蹤儲存庫的更新。若選擇 Latest version，可取得該儲存庫較新的發布版本；如需固定在 0.6.0，可改選特定版本。BRAT 的自動更新依其設定運作，並非安裝後保證永遠自動更新。

## ZIP 安裝

先停用 FlatExplorer，下載同一版本的三個程式檔或新的平台 ZIP，覆蓋 `main.js`、`manifest.json`、`styles.css`，再重新啟用。保留自己的 `data.json`，其中包含置頂、隱藏及手動排序偏好。

## 常見問題

- 找不到 FlatExplorer：目前未列入 Obsidian 社群目錄；先從社群目錄安裝 BRAT，再輸入 `MiuDog/FlatExplorer`。
- BRAT 不可安裝：更新 Obsidian，並查看 [BRAT 目前相容版本](https://community.obsidian.md/plugins/obsidian42-brat)。
- 下載 ZIP 後沒有出現外掛：確認三個檔案直接位於 Vault 設定資料夾的 `plugins/flat-explorer/`，不是 Downloads，也不是多一層巢狀資料夾；再重開 Obsidian。
- iPad／iPhone 無法從「檔案」App 放入套件資料夾：改用 BRAT 或從電腦透過既有 Sync 同步。
- 更新失敗：可在 BRAT 固定先前版本，或從 [發布頁](https://github.com/MiuDog/FlatExplorer/releases) 下載舊版三個程式檔，依 ZIP 更新流程覆蓋，保留 data.json。
- 預覽或完整原生選單不可用：檢查核心檔案總管是否啟用、是否保留其面板。FlatExplorer 目前以 Obsidian 1.14.5 與官方行動模擬驗證；實機仍可能有版本差異。

來源：[BRAT 開發者與版本追蹤說明](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md)。
