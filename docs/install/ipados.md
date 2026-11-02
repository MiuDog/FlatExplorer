# iPad／iPadOS 安裝 FlatExplorer

作者：MiuDog。建議使用 **BRAT**，在 iPad 的 Obsidian 內完成安裝，不需要透過「檔案」App 管理隱藏設定資料夾。

## 建議方式：BRAT

1. 在 iPad 開啟要使用的 Vault，到「設定 → 社群外掛 → 瀏覽」搜尋 **BRAT**，安裝並啟用。[BRAT 套件頁](https://community.obsidian.md/plugins/obsidian42-brat)
2. 到 BRAT 設定，選 **Add beta plugin**，輸入 `MiuDog/FlatExplorer`。
3. 選 **Latest version** 並確認安裝，再到已安裝外掛清單啟用 **FlatExplorer**。
4. 從命令面板執行「FlatExplorer：開啟檔案瀏覽器」。觸控可點「⋯」或長按；手動排序從選單上移／下移。

## 備用方式：從電腦同步

[下載 iPadOS ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-ipados.zip)

在電腦解壓縮，將包內 `flat-explorer` 安裝到同一 Vault 的設定資料夾，再以 [Obsidian Sync](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/sync.md) 傳到 iPad；必須在各裝置啟用套件檔案同步。iPad 確認同步完成後，完全關閉並重開 Obsidian，再啟用 FlatExplorer。

若原本已在 Mac 與 iPad 使用 iCloud Vault，也可由 Mac 將套件放入該 Vault；行動端 Vault 應位於 `iCloud Drive/Obsidian/你的Vault`，仍需確認設定資料夾已同步。[Obsidian 官方 iCloud 說明](https://obsidian.md/help/Getting%20started/Sync%20your%20notes%20across%20devices)

ZIP 是供手動或電腦同步安裝的備用包，Safari 下載或「檔案」App 解壓縮後不會自動把套件裝進 Obsidian。若只使用 iPad，優先採用 BRAT。

## 更新

使用 BRAT 檢查更新，或在電腦更新三個程式檔後同步；保留 `data.json`。[更新與復原](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/updates.md)

iPadOS、iOS、Android 使用相同的套件主程式。已通過行動模擬，iPad 實機尚未驗證。[安裝方式與查證來源](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/README.md)
