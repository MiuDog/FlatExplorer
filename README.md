# FlatExplorer

Obsidian 平面檔案瀏覽套件。

作者：[MiuDog](https://github.com/MiuDog) · [下載最新版本](https://github.com/MiuDog/FlatExplorer/releases/latest) · [回報問題](https://github.com/MiuDog/FlatExplorer/issues)

## Android／iPad／iPhone 下載與安裝

目前推薦在 Obsidian 透過 [BRAT](https://community.obsidian.md/plugins/obsidian42-brat) 加入 `MiuDog/FlatExplorer`，由 BRAT 下載與管理更新，不必手動操作隱藏設定資料夾。[開始安裝](docs/install/README.md)

| 裝置 | 安裝指南 | 附指南的 ZIP 備用包 |
| --- | --- | --- |
| Android | [Android 安裝](docs/install/android.md) | [Android ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-android.zip) |
| iPad／iPadOS | [iPadOS 安裝](docs/install/ipados.md) | [iPadOS ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-ipados.zip) |
| iPhone／iOS | [iOS 安裝](docs/install/ios.md) | [iOS ZIP](https://github.com/MiuDog/FlatExplorer/releases/latest/download/flat-explorer-ios.zip) |

三個平台使用相同主程式，ZIP 差別僅為附帶指南；手機上優先選 BRAT。iPad／iPhone 下載 ZIP 不會自動安裝，也可從已安裝的電腦透過既有 [Obsidian Sync](docs/install/sync.md) 同步。

## 功能

目前版本：0.7.2，修正核心檔案列表已啟用時的原生選單載入，檔案提示改用 Obsidian 主題 tooltip。

- 上方依序列出 Vault 根目錄到當前目錄，點擊可返回任一祖先目錄。
- 下方平面列出直屬子資料夾及檔案，資料夾在前、名稱自然排序。
- 點資料夾進入下一層，點檔案交由 Obsidian 開啟。
- 新增、刪除及改名後更新畫面；當前資料夾被刪除時返回根目錄。
- 由側邊圖示或命令「FlatExplorer: 開啟檔案瀏覽器」開啟面板。
- 使用原生檔案列與主題，維持平面對齊；資料夾沒有斜線，Markdown 隱藏副檔名。
- 兩區標題為「路徑」與「當前目錄」。
- 兩區標題皆與分隔線同行並使用主題次要文字色；頂部操作列沿用原生按鈕元素、圖示及間距。
- 每列顯示類型圖示，區分筆記、畫布、資料夾、每日筆記及常見附件；資料夾不使用箭頭。
- 每日筆記依啟用中的核心每日筆記目錄與日期格式辨識，支援格式內含日期子目錄。
- 圖示與文字間距為原有主題間距加 2px。置頂筆記平常以主題輔色大頭針取代類型圖示，使用 accent-h／accent-s／accent-l，與參考的 Pin 圖示一致；滑過該列才切回類型圖示，列背景使用原生 hover 色。
- 檔案 hover 沿用原生 tooltip、頁面預覽及原生預覽來源設定。
- 右鍵沿用核心檔案總管的完整單項目選單及其他外掛的附加項目。
- 在內容空白處按右鍵，顯示原生新增筆記、資料夾、畫布、Base 選單，依已啟用的核心外掛提供項目，建立位置是當前目錄。
- Pin File／Unpin File 與 Pin Folder／Unpin Folder 將檔案或資料夾置於當前目錄頂端；置頂群組及其餘項目皆依選定模式排序。Vault 根目錄不提供置頂。
- Hide 隱藏目前列表項目，不搬移或刪除檔案。在頂部操作列按眼睛圖示暫顯，再右鍵選 Unhide 可復原。
- 頂部排序圖示可選跟隨原生、名稱正反序、修改及建立時間新舊序。資料夾維持名稱排序。
- 選擇「手動排序（拖曳調整）」後，可將項目拖到另一列上半部或下半部，分別插入其前或其後；插入線標示落點。
- 手動模式允許資料夾與檔案混排，按目錄保存順序；置頂群組維持在最上方，同群組內可拖曳。首次切換保留原排序，再次切回沿用保存的手動順序。
- 手動排序只調整顯示，不搬移檔案；隱藏項目保留位置，新增項目排在已保存項目之後，改名或刪除會同步更新順序資料。
- 顯示偏好保存在外掛 data.json，重新啟動後仍保留；檔案或祖先改名時同步更新路徑。

## 行動裝置

- 使用相同的三個安裝檔，manifest 的 isDesktopOnly 為 false，執行程式不依賴 Node.js 或 Electron。
- 點擊項目導覽或開檔；點擊「⋯」開啟操作選單。物件長按 550ms 啟動拖曳，不視為右鍵；空白區長按仍開啟新增選單。
- 長按啟動前移動超過 10px 或開始捲動會取消候選；啟動後顯示跟隨手指的預覽，靠近內容邊緣可自動捲動。
- 頂部提供新增項目、排序與隱藏項目入口；按鈕與項目觸控範圍至少 44px。
- 檔案與資料夾列使用小圓角文件列樣式，不沿用行動導覽 dropdown 的大圓角；移除列內額外垂直留白，保留至少 44px 觸控範圍。
- 手動排序模式下，放到檔案列的前後半部或資料夾列的上下四分之一，以插入線預覽排序；「⋯」選單也保留上移／下移。
- 放到資料夾中央會移入該資料夾，包含路徑區的父層／祖先目錄。其他排序模式只接受資料夾搬移，不改動排序。
- 有效資料夾落點會高亮；相同位置、自身／子孫資料夾與同名衝突不接受放置。放開時再次驗證，並由 Obsidian FileManager 搬移及更新連結，不覆寫既有項目。
- 行動端不依賴 HTML 拖曳或 hover，置頂大頭針持續顯示。開啟檔案後收起側欄，從外掛入口可重新展開。
- 已通過 [Obsidian 官方行動模擬](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development) 與 390 × 844 視窗檢查；Android／iOS 實機尚未測試。

## 第一步：建置與載入

直接安裝：從 [GitHub Releases](https://github.com/MiuDog/FlatExplorer/releases) 下載 `flat-explorer.zip`，解壓縮後將整個 `flat-explorer` 資料夾放入 Vault 的 `.obsidian/plugins/`。重新啟動 Obsidian，在「設定 → 社群外掛 → 已安裝的外掛」啟用 FlatExplorer。

儲存庫發布與 Obsidian 社群目錄上架是不同流程；目前提供 BRAT 與 GitHub Release 手動安裝。

需要 Node.js 與 npm。在專案目錄執行：

```sh
npm install
npm run build
```

將專案根目錄的 `main.js`、`manifest.json`、`styles.css` 複製至測試 Vault 的 `.obsidian/plugins/flat-explorer/`，重新啟動 Obsidian，在「設定 → 社群外掛」啟用 FlatExplorer。

打包產物位於 `dist/flat-explorer/` 與 `dist/flat-explorer.zip`。更新已安裝套件時，先停用 FlatExplorer，再覆蓋三個檔案後啟用；保留原有 data.json。

本版已於 Obsidian 1.14.5 桌面及官方行動模擬驗證。完整原生選單與 tooltip 需啟用核心檔案總管（檔案列表），並保有其面板；外掛入口會先喚醒其延遲載入視圖，並建立獨立面板。原生內部處理器未提供公開 API，因此集中於相容層；無法取得時保留 FlatExplorer 顯示控制選單，提示原生整合不可用。桌面頁面預覽需啟用該核心外掛，並遵循原生設定的 Ctrl／Cmd 操作。其他外掛的 Pin／Hide 同名選單列在 FlatExplorer 中改接本套件的顯示偏好，原生檔案總管不受影響。

`npm test` 的十五個案例驗證檔案與資料夾置頂、六種排序、手動排列、搬移路徑與落點分區、循環保護、設定載入及類型圖示。0.7.0 另通過四十八項行動模擬檢查，使用臨時測試檔案實際驗證移入資料夾、移到父層、資料夾及其後代搬移、邊緣排序、高亮預覽、衝突不覆寫、來源／目標替換保護與取消手勢；結束後清理臨時檔並還原偏好及版面。iPad／iPhone／Android 實機仍需驗證。

0.6.0 另通過十八項行動模擬檢查：長按及取消、防止誤點與重複選單、更多與新增入口、觸控尺寸、手動上移保存、檔案路徑不變、側欄收合與重新展開。工具列位於內容上方，窄螢幕無水平溢出；完成後還原桌面模式與工作區。

`npm run dev` 可持續編譯；若使用複製安裝，每次變更後仍需同步產出並重新載入套件。

## 後續開發目錄（尚未實作）

1. 決定是否跟隨目前開啟檔案及保存瀏覽位置。
2. 搜尋與多選操作。
3. Android／iOS 實機與其他 Obsidian 版本驗證後準備發佈。

模組說明見 [architecture.md](architecture.md)。建置流程參考 [Obsidian 官方開發文件](https://docs.obsidian.md/Plugins/Getting%20started/Build%20a%20plugin)。
