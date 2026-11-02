# iPhone／iOS 安裝 FlatExplorer

作者：MiuDog。建議使用 **BRAT**，在 iPhone 的 Obsidian 直接下載與管理更新，不必手動操作隱藏設定資料夾。

## 建議方式：BRAT

1. 開啟目標 Vault，進入「設定 → 社群外掛 → 瀏覽」搜尋 **BRAT**，安裝並啟用。[BRAT 套件頁](https://community.obsidian.md/plugins/obsidian42-brat)
2. 開啟 BRAT 設定，選 **Add beta plugin**，輸入 `MiuDog/FlatExplorer`。
3. 選 **Latest version** 並確認安裝；若未自動啟用，再到已安裝外掛清單開啟 **FlatExplorer**。
4. 在命令面板執行「FlatExplorer：開啟檔案瀏覽器」。點「⋯」開啟選單；物件長按拖曳。放到資料夾中央會搬移，路徑區父層也能接收；手動模式放到列前後邊緣會排序，選單仍可上移／下移。

## 備用方式：從電腦同步

[下載 iOS ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-ios.zip)

在電腦將包內 `flat-explorer` 資料夾放進相同 Vault 的 `.obsidian/plugins/`，再透過 [Obsidian Sync](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/sync.md) 同步套件檔案；各裝置的同步選項要分別啟用。iPhone 完成同步後，完全關閉並重開 Obsidian，再啟用 FlatExplorer。

如果原本使用 Mac 與 iPhone 的 iCloud Vault，可由 Mac 安裝並等待同步；Vault 在 iPhone 應位於 `iCloud Drive/Obsidian/你的Vault`。[Obsidian 官方 iCloud 說明](https://obsidian.md/help/Getting%20started/Sync%20your%20notes%20across%20devices)

Safari 下載或「檔案」App 解壓縮 ZIP 不等於完成安裝。只有 iPhone、沒有電腦時優先使用 BRAT。FlatExplorer 是 Obsidian 外掛，不需要 IPA、TestFlight 或替代 App 商店。

## 更新

BRAT 可檢查並下載更新；手動安裝則替換三個程式檔，保留 `data.json`。[更新與復原](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/updates.md)

iOS、iPadOS、Android 使用相同的套件主程式。已通過行動模擬，iPhone 實機尚未驗證。[安裝方式與查證來源](https://github.com/MiuDog/FlatExplorer/blob/main/docs/install/README.md)
