# 手機與平板安裝

FlatExplorer 由 MiuDog 維護。目前三個平台均建議使用 **BRAT** 安裝：在 Obsidian 內加入儲存庫位置，交由 BRAT 下載及更新，省去手動管理隱藏設定資料夾。

| 平台 | 建議方式 | 平台指南 | 含指南的離線安裝包 |
| --- | --- | --- | --- |
| Android | BRAT | [Android](android.md) | [下載 Android ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-android.zip) |
| iPad／iPadOS | BRAT | [iPadOS](ipados.md) | [下載 iPadOS ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-ipados.zip) |
| iPhone／iOS | BRAT | [iOS](ios.md) | [下載 iOS ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-ios.zip) |

三份 ZIP 的主程式完全相同，僅附帶的平台安裝指南不同。FlatExplorer 是 Obsidian 套件，安裝於 Vault，不是獨立的 Android APK 或 Apple IPA。

## 第一步：透過 BRAT 安裝

1. 在要使用 FlatExplorer 的手機／平板 Vault 開啟「設定 → 社群外掛 → 瀏覽」，搜尋 **BRAT**，安裝並啟用。[BRAT 官方套件頁](https://community.obsidian.md/plugins/obsidian42-brat)
2. 進入 BRAT 設定，選擇 **Add beta plugin**，輸入 `MiuDog/FlatExplorer`，也可輸入完整儲存庫網址 `https://github.com/MiuDog/FlatExplorer`。
3. 選擇 **Latest version**，確認新增。若未自動啟用，回到已安裝外掛清單啟用 **FlatExplorer**。
4. 在命令面板執行「FlatExplorer：開啟檔案瀏覽器」。

此儲存庫為公開儲存庫，一般安裝不需 GitHub Token。若遇到 GitHub 下載或限流錯誤，可稍後重試或使用下方 ZIP／同步方式。BRAT 是第三方社群外掛，FlatExplorer 目前尚未列入 Obsidian 社群目錄，因此不能直接在社群目錄搜尋 FlatExplorer 安裝。

## 其他方式目錄

- [Android 檔案管理器安裝](android.md#備用方式直接使用-zip)
- [iPadOS 電腦同步安裝](ipados.md#備用方式從電腦同步)
- [iOS 電腦同步安裝](ios.md#備用方式從電腦同步)
- [使用 Obsidian Sync](sync.md)
- [更新與復原](updates.md)

## 已安裝 BRAT 的 URI 捷徑

```text
obsidian://brat?plugin=MiuDog/FlatExplorer
```

此 URI 會開啟 BRAT 的安裝介面，仍需確認安裝。GitHub 或部分瀏覽器可能不讓自訂協定直接跳轉；此時直接使用上面的 BRAT 設定流程，不依賴連結自動跳轉。

## 查證與測試範圍

查證日期：2026-11-02。BRAT 官方套件頁標示支援 Desktop、Mobile，目前 BRAT 2.2.0 要求 Obsidian 1.11.4+；建議先更新手機上的 Obsidian。這是 BRAT 的版本需求，與 FlatExplorer manifest 的最低目標版本不同。

已確認 FlatExplorer Release 提供 BRAT 所需的 `main.js`、`manifest.json`、`styles.css`，且 `isDesktopOnly=false`。FlatExplorer 已通過官方行動模擬；實際 Android、iPadOS、iOS 下載與執行尚未以實機驗證。

來源：[BRAT 官方說明](https://tfthacker.com/BRAT)、[BRAT 套件頁與相容資訊](https://community.obsidian.md/plugins/obsidian42-brat)、[BRAT Release 格式](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md)、[BRAT URI](https://tfthacker.com/brat-protocol)。
