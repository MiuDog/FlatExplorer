# Android 安裝 FlatExplorer

作者：MiuDog。建議使用 **BRAT**，可直接在 Android 的 Obsidian 下載與更新，不用先解壓縮 ZIP。

## 建議方式：BRAT

1. 開啟目標 Vault，在「設定 → 社群外掛 → 瀏覽」搜尋 **BRAT**，安裝並啟用。[BRAT 套件頁](https://community.obsidian.md/plugins/obsidian42-brat)
2. 在 BRAT 設定選 **Add beta plugin**，貼上 `MiuDog/FlatExplorer`。
3. 選 **Latest version** 並確認安裝，再到已安裝外掛清單啟用 **FlatExplorer**。
4. 從命令面板執行「FlatExplorer：開啟檔案瀏覽器」。點擊導航，長按或「⋯」開啟操作選單。

## 備用方式：直接使用 ZIP

[下載 Android ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-android.zip)

以可存取 Vault 的 Android 檔案管理器解壓縮，將包內 `flat-explorer` 資料夾複製到 `你的Vault/.obsidian/plugins/flat-explorer/`。若看不到 `.obsidian`，先開啟檔案管理器的隱藏檔顯示；若 Vault 使用自訂設定資料夾，改用該資料夾。目的地應直接包含 `main.js`、`manifest.json`、`styles.css`，不要多套一層 `flat-explorer`。

完全關閉再開啟 Obsidian，到「社群外掛 → 已安裝的外掛」啟用 FlatExplorer。Android 檔案管理器能否存取 Vault 取決於實際儲存位置與權限；無法存取時改用 BRAT 或 [Obsidian Sync](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/sync.md)。

## 更新

BRAT 使用自身的更新檢查；ZIP 安裝則只覆蓋三個程式檔並保留 `data.json`。[更新與復原](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/updates.md)

Android、iPadOS、iOS 使用相同的套件主程式。已通過行動模擬，Android 實機尚未驗證。[安裝方式與查證來源](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/README.md)
