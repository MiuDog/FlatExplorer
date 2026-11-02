# FlatExplorer 架構

模組提供平面目錄導覽、主題原生列與頂部工具列、類型與置頂圖示、原生 hover／單項目選單橋接，以及可保存的置頂、隱藏、排序偏好。

## 類別與資料契約

| 定義 | 原始碼 | 責任 |
| --- | --- | --- |
| FlatExplorerPlugin | [src/FlatExplorerPlugin.ts](src/FlatExplorerPlugin.ts) | 註冊入口、載入偏好、序列化保存與同步路徑。 |
| FlatExplorerView | [src/FlatExplorerView.ts](src/FlatExplorerView.ts) | 平面兩區、導覽、排序、項目與空白選單、hover、就地改名。 |
| ExplorerPreferences | [src/explorer_preferences.ts](src/explorer_preferences.ts) | pinned／hidden／manualOrder 路徑陣列及 sortOrder 代碼。 |
| NativeExplorer | [src/native_explorer.ts](src/native_explorer.ts) | 核心內部檔案總管介面，繼承 ItemView、HoverParent。 |
| NativeRow | [src/native_explorer.ts](src/native_explorer.ts) | 本面板列的選單定位與 tooltip 文字資訊。 |
| NativeTree | [src/native_explorer.ts](src/native_explorer.ts) | 空多選集合及不改原生焦點的介面。 |
| NativeMenu | [src/native_explorer.ts](src/native_explorer.ts) | items 為選單項目陣列，項目的可選 titleEl 用於辨識其他外掛的同名 Pin／Hide。 |
| DailyNotesHost | [src/file_icons.ts](src/file_icons.ts) | 將每日筆記核心設定的讀取限定在圖示分類邊界，缺少該 API 時視為一般筆記。 |
| TouchContextMenu | [src/TouchContextMenu.ts](src/TouchContextMenu.ts) | 管理行動端長按、捲動取消及點擊／選單去重，不控制檔案操作。 |
| TouchFileDrag | [src/TouchFileDrag.ts](src/TouchFileDrag.ts) | 物件長按啟動、預覽移動、邊緣捲動及結束手勢。 |
| TouchDragHandlers | [src/touch_drag.ts](src/touch_drag.ts) | start／move／finish 協作契約，隔離手勢與檔案操作。 |
| TouchDropTarget | [src/touch_drag.ts](src/touch_drag.ts) | kind、target、row、after 記錄已驗證排序或搬移落點。 |

```mermaid
classDiagram
	Plugin <|-- FlatExplorerPlugin
	ItemView <|-- FlatExplorerView
	HoverParent <|.. FlatExplorerView
	ItemView <|-- NativeExplorer
	HoverParent <|-- NativeExplorer
	Menu <|-- NativeMenu
	FlatExplorerPlugin --> ExplorerPreferences : 持有與保存
	FlatExplorerPlugin ..> FlatExplorerView : 註冊建立工廠
	FlatExplorerView --> FlatExplorerPlugin : 共用偏好
	FlatExplorerView --> NativeExplorer : Adapter 代理
	FlatExplorerView ..> DailyNotesHost : getFileIcon 讀取每日筆記設定
	Component <|-- TouchContextMenu
	FlatExplorerView *-- TouchContextMenu : 行動端 addChild 生命週期
	Component <|-- TouchFileDrag
	FlatExplorerView *-- TouchFileDrag : 行動端物件拖曳
	TouchFileDrag --> TouchDragHandlers : 手勢回呼
	FlatExplorerView --> TouchDropTarget : 驗證後的落點
	NativeExplorer --> NativeTree : 隔離多選與焦點
	NativeExplorer --> NativeRow : 列索引
	Workspace o-- FlatExplorerView : 管理生命週期
```

原生相容層是 Adapter：代理繼承現有檔案總管，只覆寫本面板所需的 DOM 映射、多選、重新命名與建立後處理。原生核心 view 與其樹狀狀態不被改寫。選單及 hover 行為依賴內部 API，已確認 Obsidian 1.14.5；其他版本須驗證。沒有聲稱支援多選或樹狀拖放。

## 啟動與事件同步

```mermaid
flowchart TD
	Load[Plugin.onload] --> Read[loadData → parsePreferences]
	Read --> Register[registerView / registerHoverLinkSource / 入口回呼]
	Register --> Activate[activateView]
	Activate --> Exists{已有面板}
	Exists -->|否| New[getLeftLeaf → setViewState]
	Exists -->|是| Reveal[revealLeaf]
	New --> Reveal
	New --> Open[View.onOpen]
	Open --> Root[設定根目錄]
	Root --> Render[render]
	Open --> Events[create / delete / rename / modify / file-open 回呼]
	Events --> Refresh[refresh]
	Open --> Interval[每秒檢查 sortOrder 的回呼]
	Interval --> Changed{排序代碼改變}
	Changed -->|是| Refresh
	Refresh --> Editing{正在重新命名}
	Editing -->|是| Wait[延後至編輯結束]
	Editing -->|否| Valid{當前目錄仍存在}
	Valid -->|否| Reset[回根目錄]
	Valid -->|是| Render
	Reset --> Render
```

Plugin.onload 的 rename／delete 回呼使用 remapPaths 更新 pinned、hidden 與 manualOrder，再呼叫 savePreferences。祖先改名會同步後代；刪除清理偏好。View.onClose 清理浮窗與拖曳來源，registerEvent／registerInterval 由宿主清理訂閱與計時器。refresh 在編輯或拖曳期間延後重繪，避免移除來源 DOM。activateView 無可用側欄即返回；宿主載入錯誤向外傳遞。

## 平面顯示與排序

```mermaid
flowchart TD
	Render[render] --> Clear[清理浮窗與舊 DOM]
	Clear --> Adapter[createNativeContext → nativeExplorer → asNativeExplorer]
	Adapter --> Ancestors[parent 回溯後反轉]
	Ancestors --> Toolbar[頂部 createToolbarButton 排序與隱藏項目按鈕]
	Toolbar --> Path[路徑標題分隔線與 renderRow]
	Path --> Header[當前目錄標題分隔線]
	Header --> Filter[children.filter：showHidden 或未隱藏]
	Filter --> Sort[compareEntries]
	Sort --> Empty{沒有項目}
	Empty -->|是| Message[空目錄文字]
	Empty -->|否| Rows[renderRow]
	Rows --> Click[click / auxclick / keydown activate 回呼]
	Path --> Click
	Click --> Folder{資料夾}
	Folder -->|是| Navigate[navigate → render]
	Folder -->|否| File[openFile → workspace.openFile]
	Toolbar --> SortMenu[showSortMenu]
	SortMenu --> Mode[選定模式回呼 → savePreferences]
	Toolbar --> Hidden[眼睛回呼切換 showHidden → render]
```

compareEntries 先比較 pinned。manual 模式接著比較 manualOrder 路徑索引，允許資料夾與檔案混排；沒有保存索引的項目排在已保存項目之後，再使用原有資料夾優先及自然名稱序。其他模式維持資料夾優先，檔案與置頂群組套用六種名稱／時間排序；時間相同以名稱穩定排序。sortOrder 在 native 模式讀取核心 view 的代碼，否則讀偏好。render 的 filter／sort 回呼僅處理直屬項目。路徑區不受隱藏列表影響，確保能返回。

## 手動排序

```mermaid
flowchart TD
	Menu[showSortMenu 的模式選擇回呼] --> Existing{此目錄是否已有保存順序}
	Existing -->|否| Seed[依目前排序保存全部直屬項目，含隱藏項]
	Existing -->|是| Keep[保留 manualOrder]
	Seed --> Save[savePreferences → render]
	Keep --> Save
	Save --> Bind[renderRow → bindManualDragging]
	Bind --> Start[dragstart：設定 draggedPath 與內部 DataTransfer]
	Start --> Over[dragover → canReorder]
	Over --> Valid{同一目錄、手動模式、相同置頂分組}
	Valid -->|否| Reject[不接受落點]
	Valid -->|是| Indicator[clearDragIndicators false，依游標上半或下半顯示插入線]
	Indicator --> Drop[drop：清除拖曳來源 → moveEntry]
	Drop --> Check[canReorder 再驗證]
	Check --> Full[排序全部直屬項目，含隱藏項]
	Full --> Reorder[reorderPaths：移除來源，再插入目標前後]
	Reorder --> Merge[保留其他目錄記錄，替換此目錄順序]
	Merge --> Persist[savePreferences 保存快照並重繪]
	Start --> End[dragend：清除來源、指示線並 refresh]
```

manualOrder 為全 Vault 的唯一完整路徑序列；每次比較僅取目前目錄的項目，因此各目錄相對順序獨立。parsePreferences 的 paths 回呼驗證與去重 manualOrder，舊版無此欄位時使用空陣列。showSortMenu 僅在此目錄尚未保存任何順序時初始化，避免切回手動模式覆蓋歷史。

bindManualDragging 只綁定當前目錄列，路徑區不綁定。dragstart 保存面板內的來源並使用 application/x-flat-explorer-order，不提供宿主搬移檔案的格式；dragover 清除舊插入線但保留來源半透明外觀；dragleave 在真正離開列後清除該列指示；drop 重驗來源與目標後保存；dragend 支援取消並補做延後的重繪。canReorder 拒絕外來路徑、不同目錄、自己、非手動模式、編輯中及跨置頂分組。moveEntry 以完整 children 保存順序，包含隱藏項目；reorderPaths 不修改輸入陣列，無效來源或目標則回傳不變的副本。clearDragIndicators(clearSource=true) 控制是否一併移除來源外觀。不呼叫 Vault 的搬移或寫入檔案 API。

renderRow 的 activate 回呼區分資料夾及檔案，支援 Enter／Space、Ctrl／Cmd 與滑鼠中鍵新分頁；F2 啟動改名。列使用 nav-file／nav-folder 原生類別，標題以 ellipsis 截斷。Markdown 隱藏副檔名，其他檔案保留；資料夾無斜線，所有列沒有樹狀深度。getViewType、getDisplayText、getIcon 提供宿主中繼資料。

createToolbarButton 建立原生同款 div.clickable-icon.nav-action-button，補上 role、tabindex 與 Enter／Space 觸發 click 的回呼。排序使用原生 sort-asc 圖示。根 view-content 以限定 data-type 的 CSS 覆寫主題預設內距為 0，避免外層 12px 留白將工具列下推。工具列不捲動，兩個區段位於獨立 nav-files-container。標題以 ::after 產生同行分隔線，文字使用 --text-muted。

## 行動端與觸控

```mermaid
flowchart TD
	Activate[Plugin.activateView] --> Core[核心側欄 loadIfDeferred，存在時才呼叫]
	Core --> Leaf[重用 FlatExplorer 或 getLeftLeaf true 新建獨立面板]
	Leaf --> Reveal[revealLeaf 顯示側欄或手機抽屜]
	Open[View.onOpen] --> Mobile{Platform.isMobile}
	Mobile -->|是| Touch[addChild TouchContextMenu]
	Mobile -->|否| Desktop[維持滑鼠及 HTML 手動拖曳]
	Touch --> Down[pointerdown → start]
	Down --> Skip{多指、滑鼠、按鈕或輸入欄}
	Skip -->|是| Cancel[cancel 清理計時器]
	Skip -->|否| Timer[550ms 計時器]
	Timer --> Connected{目標仍在文件}
	Connected -->|是| Dispatch[發出 bubbling contextmenu]
	Dispatch --> Menu[既有項目或空白選單]
	Timer --> Movement[pointermove 超過 10px / scroll / pointerup / pointercancel]
	Movement --> Cancel
	Menu --> Suppress[800ms 抑制放開後 click 與重複系統選單]
	More[手機更多按鈕] --> Menu
	Create[手機頂部新增按鈕] --> Menu
	Manual[手機手動排序選單] --> Moves[addMoveMenuItems]
	Moves --> Target[getMoveTarget：過濾隱藏、套用排序、取得相鄰項]
	Target --> Guard[canReorder 檢查同層與置頂分組]
	Guard --> Move[moveEntry 保存共用手動順序]
	File[openFile] --> Workspace[宿主開檔]
	Workspace --> Collapse[行動端 leftSplit.collapse]
```

TouchContextMenu.constructor 註冊 root 與 root.doc 的事件；pointermove 回呼只處理空白區觸點，scroll 採 capture，pointerup／pointercancel 取消尚未完成的長按。start 排除非主要 touch／pen 及 input／textarea／clickable-icon；物件列不啟動選單計時器，只記錄 objectPointerId 以抑制系統長按右鍵，釋放後延續 800ms；新滑鼠按下會清除物件觸控抑制。空白區計時回呼確認 isConnected，以 dispatching 區分自行送出的 contextmenu。click capture 阻止空白區長按釋放造成誤點；contextmenu capture 去除物件長按選單與空白區重複事件。cancel 清除 timer／target／pointerId；onunload 清理所有計時與物件觸控狀態，Component 解除事件。

renderRow 在手機加入可鍵盤操作的更多按鈕，click 回呼停止冒泡；createToolbarButton 的 Enter／Space 也停止冒泡，避免同時導航。觸控 pointerover 不觸發桌面預覽；手機不註冊 HTML 拖曳。addMoveMenuItems 產生上移／下移項目，getMoveTarget 只接受直屬且同置頂分組的可見鄰項，沒有可用位置時禁用；操作時再次計算位置。hide／pin／manualOrder 與桌面共用，不另建資料格式。

行動 CSS 將項目、工具列與更多按鈕的觸控範圍設為至少 44px，允許垂直 pan，停用文字長按選取；rename input 保留文字選取。手機原生 nav-header 預設置底，因此明確指定工具列 order=0、內容 order=1。置頂圖示不受觸控產生的黏著 hover 影響；桌面在 hover 媒體條件下沿用切換。執行來源僅匯入 obsidian，不使用 Node.js／Electron；manifest 的 isDesktopOnly=false。

0.7.0 僅在 .is-mobile .flat-explorer 範圍，將檔案／資料夾列與更多按鈕圓角設為 --radius-s，避免行動原生 --nav-item-radius 的 30px 觸控圓角讓檔案列看似 dropdown。列的 padding-block 設為 0，避免內部 44px 更多按鈕加上上下留白撐高整列；列與更多按鈕的觸控範圍仍至少 44px。工具列、宿主的視圖切換 dropdown 與桌面列不受此範圍影響。

## 行動長按拖曳與放置

```mermaid
flowchart TD
	Down[TouchFileDrag.start：直屬物件主要 touch / pen] --> Wait[550ms 候選]
	Wait -->|啟動前移動逾 10px 或捲動| Cancel[finish true 取消]
	Wait --> Begin[startTouchDrag 建立來源與預覽]
	Begin --> Move[TouchFileDrag.move → updateTouchDrag]
	Move --> Hit[elementFromPoint 找同面板列]
	Hit --> Kind[getTouchDropKind]
	Kind -->|手動排序的列邊緣| Reorder[canReorder 檢查置頂分組與同層]
	Kind -->|資料夾中央或路徑列| Into[getMovePath 檢查原地、自身與子孫]
	Into --> Conflict{目的地已有同名項目}
	Conflict -->|是| Reject[無落點，預覽原因]
	Conflict -->|否| Highlight[資料夾高亮與移動預覽]
	Reorder --> Line[插入線與排序預覽]
	Move --> Scroll[autoScroll：邊緣 36px 每幀捲動 10px 並重算落點]
	Highlight --> Up[pointerup 再更新最終落點]
	Line --> Up
	Up --> Finish[先清理手勢，再 finishTouchDrag]
	Finish -->|reorder| Save[moveEntry 保存順序]
	Finish -->|move| Validate[重新驗證來源、資料夾與衝突]
	Validate --> Rename[fileManager.renameFile]
	Rename -->|失敗| Notice[通知，不覆寫]
	Rename --> Refresh[finally 清除 movingFile 並 refresh]
```

TouchFileDrag.constructor 註冊 pointerdown／doc pointermove／pointerup／pointercancel、scroll、非 passive touchmove 與 click capture。start 只接受直屬內容列，排除按鈕與輸入欄；move 在啟動前維持原生捲動，啟動後透過 handlers 更新落點。active touchmove 阻止捲動；autoScroll 使用 requestAnimationFrame，只有手指位於內容上下 36px 邊緣才捲動。finish 先清除 timer／frame／觸點與 dragging，再通知協作者，避免重繪遞迴；cancel 與 onunload 不提交操作。啟動後以 suppressUntil 抑制放開後的點擊。

startTouchDrag 驗證目前直屬來源，設定 draggedPath、半透明來源與 body 中的非互動預覽；其圖層使用 --layer-dragged-item。updateTouchDrag 只接受本面板的列，以 getTouchDropKind 判斷區域：手動模式資料夾中間 50% 為移入、上下各 25% 為排序；檔案以前後半部排序；非手動模式只有資料夾接受搬移。路徑區資料夾整列都是搬移目標，故可移到父層或祖先。描述文字與高亮只在通過驗證時更新 touchDrop，無效落點顯示原因。

getMovePath 拒絕根目錄來源、原地、自身與來源資料夾的真正後代，保留原檔名，根目錄目的地不加斜線前綴。rowFiles 記錄每列的原始物件身分，touchSource 保存拖曳來源；預覽及放置均核對 Vault 物件身分與列的路徑，避免刪除後同路徑重建造成誤搬。finishTouchDrag 重驗所有來源與目標，排序沿用 moveEntry，搬移使用公開 FileManager.renameFile 讓宿主處理連結更新；同名既有項目不覆寫。movingFile 在實際搬移期間延後重繪與阻止新拖曳；rename 事件仍同步 pinned／hidden／manualOrder。取消、無落點及完成都會移除預覽與所有插入／移入標記。

## 類型圖示與置頂 hover

```mermaid
flowchart TD
	Row[renderRow] --> Icon[getFileIcon]
	Icon --> Folder{TFolder}
	Folder -->|是| FolderIcon[folder 資料夾圖示]
	Folder -->|否| Daily[isDailyNote]
	Daily --> Enabled{每日筆記核心啟用且為 Markdown}
	Enabled -->|否| Extension[按副檔名分類]
	Enabled -->|是| Prefix[normalizePath 設定目錄並檢查路徑前綴]
	Prefix --> Date[Moment 嚴格解析相對路徑與自訂格式]
	Date --> Match{有效日期且格式化後完全一致}
	Match -->|是| Calendar[calendar-days]
	Match -->|否| Extension
	Extension --> Types[筆記 file-text / 畫布 layout-dashboard / 圖片 image / 音訊 file-audio / 影片 file-video / PDF file-type / 其他 file]
	Row --> Pin{是否置頂檔案}
	Pin -->|是| Rest[原圖示隱藏，主題輔色 pin 顯示]
	Rest --> Hover[CSS :hover]
	Hover --> Swap[原圖示顯示，pin 隱藏，套用原生 hover 背景]
	Pin -->|否| Normal[顯示原圖示，hover 使用相同背景]
```

file_icons.ts 的 getFileIcon 與 isDailyNote 為純讀取分類函式。每日筆記讀取 DailyNotesHost.internalPlugins.getPluginById；enabled=false 或缺少 API 時不猜測日期檔案。目錄尾斜線由 normalizePath 處理；日期格式預設 YYYY-MM-DD，可包含子目錄。所有列都有固定寬度的 flat-explorer-icons 欄位，內含 flat-explorer-type-icon；置頂檔案額外含同一 grid 位置的 flat-explorer-pin，CSS visibility 切換不造成文字移位。資料夾直接使用資料夾圖示，不再顯示箭頭；圖示皆由 Obsidian setIcon 提供。

列的圖示與文字 gap 使用 calc(var(--size-4-1) + 2px)。大頭針採 hsl(var(--accent-h), var(--accent-s), var(--accent-l))，與參考的 File Explorer Plus Pin 圖示使用相同輔色來源；區段標題仍採 --text-muted，兩者語意不同。

## 原生 hover 與選單

```mermaid
flowchart TD
	Row[renderRow] --> Mapping[NativeRow.getTitle / isFullTitleShown 回呼與 files 映射]
	Mapping --> Over[pointerover → 原生 onFilePointerover]
	Over --> Tooltip[原生 tooltip：名稱截斷與時間或資料夾計數]
	Over --> Preview[hover-link：file-explorer 來源與原生設定]
	Mapping --> Out[pointerout → 原生 onFilePointerout]
	Row --> Context[contextmenu → showContext]
	Context --> Native{相容層可用}
	Native -->|是| Subscribe[短期訂閱 file-menu]
	Subscribe --> Core[原生 onFileContextMenu]
	Core --> Extensions[核心與其他外掛建立選單]
	Extensions --> Custom[addMenuItems]
	Custom --> Find[findDisplayMenuItem]
	Find --> Reuse{已有 Pin 或 Hide}
	Reuse -->|是| Bind[configurePin / configureHide 接上本面板偏好]
	Reuse -->|否| Add[新增控制項]
	Core --> Finally[finally 解除短期訂閱]
	Native -->|否| Fallback[提示並顯示自訂選單；hover 改用公開 hover-link]
```

asNativeExplorer 驗證三個必要原生處理器。createNativeContext 使用 Object.create 借用處理器；files 為 WeakMap、fileItems 為路徑到 NativeRow 的索引，tree 的 selectedDoms 為空集合、setFocusedItem 為空回呼。hoverPopover 歸該代理所有，重繪時卸載。afterCreate 回呼開啟新檔案，或回到新資料夾的父層後啟動改名；startRenameFile 改接本面板。

showContext 的臨時 file-menu 回呼只接受同一目標檔案；try/finally 保證解除訂閱。findDisplayMenuItem 只辨識 Pin／Unpin、Pin File／Unpin File、Pin Folder／Unpin Folder、Hide／Hide File／Hide Folder 等確切標題，在這次選單中替換對應回呼，防止 File Explorer Plus 產生重複項目；其他項目保留。Pin 與 Hide 均用於檔案與資料夾，根目錄不提供顯示控制。資料夾在置頂群組中仍適用一般排序或手動排序，圖示切換共用原有 CSS。

## 空白區原生新增選單

```mermaid
flowchart TD
	Open[onOpen] --> Listen[registerDomEvent contentEl contextmenu 回呼]
	Listen --> Blank{目標是否在項目列、工具列或輸入欄外}
	Blank -->|否| Existing[沿用該元素自己的行為]
	Blank -->|是| Show[showBackgroundContext]
	Show --> Ready{有原生代理與當前目錄}
	Ready -->|否| Notice[提示核心檔案列表不可用]
	Ready -->|是| Subscribe[短期訂閱 file-menu]
	Subscribe --> Core[原生 onFileContextMenu：傳入真實當前目錄]
	Core --> Plugins[核心與其他外掛加入選單]
	Plugins --> Retain[retainCreationItems：filter 保留 action-primary]
	Retain --> Items[新增筆記、資料夾、畫布、Base 原始回呼]
	Items --> Create[以實際當前目錄建立項目]
	Core --> Finally[finally offref 解除短期訂閱]
```

retainCreationItems 位於 native_explorer.ts，透過 NativeMenu.items 的 section 判斷分區，filter 回呼移除其他分區及分隔線的 DOM；保留項目的原生文字、圖示及回呼。直接傳入真實 TFolder，避免模擬根目錄導致新資料夾或畫布建立到錯誤位置。空白區不追加本套件的 Pin／Hide。項目列的 contextmenu 本來就停止冒泡，因此不會同時開啟兩個選單。核心畫布或 Bases 未啟用時，選單依原生實際提供的項目呈現。

## 儲存與重新命名

```mermaid
flowchart TD
	Toggle[Pin / Unpin / Hide / Unhide 回呼] --> Change[更新 preferences]
	Change --> Save[savePreferences]
	Save --> Snapshot[parsePreferences 複製快照]
	Snapshot --> Refresh[refreshViews → refresh]
	Snapshot --> Queue[saveQueue.then → saveData]
	Queue -->|失敗| Notice[catch：通知並記錄，佇列可繼續]
	Rename[原生重新命名 / F2] --> Input[renameFile 建立輸入欄並設定 editing]
	Input --> Finish[blur / Enter / Escape → finish 回呼]
	Finish --> Cancel{取消或未變更}
	Cancel -->|否| Validate[驗證名稱與路徑字元]
	Validate --> Host[fileManager.renameFile]
	Validate -->|失敗| Error[通知]
	Host -->|失敗| Error
	Cancel -->|是| Clear[finally 清除 editing → refresh]
	Host --> Clear
	Error --> Clear
```

parsePreferences 的 paths 回呼只保留唯一字串，無效排序回 native。remapPaths 的 flatMap 回呼比對完整路徑或「舊路徑/」後代，避免誤判同名前綴。renameFile 的 row find 回呼按 data-path 找列；input click 防冒泡，finish 防止 blur 與 Enter 重複提交，Escape 不寫入。重新命名交由 FileManager 更新連結，失敗顯示通知。openFile 透過 Workspace 開啟，失敗顯示通知並記錄。

## 工具與測試

[esbuild.config.mjs](esbuild.config.mjs) 頂層選擇單次 build 或 context.watch，無自訂函式；產出 CommonJS main.js，obsidian 保留為宿主依賴。

[tests/explorer_preferences.test.mjs](tests/explorer_preferences.test.mjs) 使用 esbuild 記憶體產出及 vm 載入純偏好模組；require 回呼只注入 instanceof 所需的 TFile／TFolder 替身。file 函式建立含 path、name、basename、stat.mtime／ctime 的檔案替身。八個 test 回呼驗證置頂及取消、六種排序的兩個優先群組、改名刪除後代邊界、無效設定、手動混排與新項目、前後拖放及不變性、模式切換與跨目錄保存、資料夾置頂與筆記混排；sort／map 回呼比較實際輸出順序。

[tests/file_icons.test.mjs](tests/file_icons.test.mjs) 以相同載入策略測試圖示分類；normalizePath 替身僅處理測試需要的尾斜線。file 函式建立含 path／name／basename／extension 的替身，dailyHost 建立 enabled／folder／format 設定替身。三個 test 回呼驗證類型區分、有效日期與精確目錄邊界、日期子目錄及 Vault 根目錄；Moment 使用實際日期解析實作。

[tests/touch_drag.test.mjs](tests/touch_drag.test.mjs) 使用相同記憶體載入方式，folder 函式建立 path／name／parent／isRoot 替身。四個 test 回呼驗證落點中央與邊緣、非手動模式、子層／父層／根目錄路徑，以及自身與子孫保護和同名前綴邊界。

本機 .qa 為忽略版本控制的實機驗證暫存區。0.2.0 已通過 15 項 Obsidian 1.14.5 檢查：核心與第三方選單保留、不重複顯示控制、置頂順序及圖示、設定保存、Hide／Unhide、原生 hover-link、改名啟動與 Escape 取消、資料夾無斜線。測試前後還原偏好，不改名或刪除使用者筆記。實際視覺已由原生面板與選單截圖檢查；行動版與舊版本尚未實測。

0.3.0 重新通過上述 15 項檢查及七個單元案例。實機測量原生與本套件按鈕均為 28 × 24 CSS px、內距 4px 6px、圖示 16px，工具列頂端與內容頂端相同。離屏 DOM 另確認筆記／每日筆記／畫布圖示，並以 CDP 強制 :hover 驗證 pin 隱藏、原圖示顯示及非透明的主題背景。驗證後移除臨時 DOM。

0.4.0 通過十個單元案例與十六項手動排序實機檢查：選單模式、初次順序、draggable 範圍、插入線與來源外觀、拖放事件、磁碟保存、跨目錄保留、實體路徑不變、模式切換、隱藏項保留、置頂邊界與拒絕外部來源。面板已截圖檢查，插入線由實際計算樣式確認為主題色的 2px inset shadow；測試前後還原偏好與導覽狀態。

0.5.0 通過十一個單元案例與十二項空白選單／資料夾置頂實機檢查：空白選單與分區、四種原生建立回呼的當前目錄參數、根目錄選單、資料夾 Pin／Unpin、磁碟保存、圖示及排序位置與不重複控制。新增回呼由測試攔截並立即還原，不建立實體測試檔案。選單項目由實際 DOM 確認，測試後還原偏好與目錄。

0.6.0 通過十一個單元案例、十八項官方行動模擬檢查，以及桌面十二項新增／資料夾置頂與十六項手動排序回歸。行動檢查涵蓋長按、移動與捲動取消、誤點／選單去重、更多及新增入口、44px 點擊區域、不依賴 HTML 拖曳的上移保存、側欄收合及展開後實際可見。390 × 844 viewport 無水平溢出，工具列幾何位置在內容上方。側欄開關驗證等待原生動畫完成。依官方行動開發文件使用 app.emulateMobile，測試前保存編輯與版面，結束後還原桌面模式與工作區。Android／iOS 實機尚未驗證。

0.7.0 通過十五個單元案例與四十八項行動模擬檢查。測試在唯一命名的臨時 Vault 子目錄建立筆記與資料夾，實際經 FileManager 搬移，驗證資料夾中央／路徑父層的搬移、資料夾與其後代、列邊緣排序、同名不覆寫、來源與目標同路徑重建保護、取消後無異動及觸控尺寸。確認有效資料夾高亮與跟隨手指的動作預覽已繪製，並檢查小圓角文件列截圖。測試結束只清理自己建立且身分與唯一路徑相符的臨時目錄，再還原偏好及版面；不移動使用者原有檔案。Android／iPadOS／iOS 實機尚未驗證。

## 設定檔欄位

| 檔案 | 契約 |
| --- | --- |
| package.json | name／version／description 識別套件；author 為 MiuDog；repository.type／url 指向 GitHub Git 儲存庫；private 防止 npm 意外發佈；main 指定產物；type 指定工具 ESM；scripts.dev 監看、build 型別檢查與建置、test 執行 Node 測試；devDependencies 為 esbuild／obsidian／typescript。 |
| manifest.json | id 安裝目錄與識別；name 顯示名稱；version 發行版；minAppVersion 為套件最低目標，完整內部 API 僅確認 1.14.5；description 用途；author 為 MiuDog，authorUrl 為作者 GitHub；isDesktopOnly=false 支援行動載入，已模擬驗證，實機待驗證。 |
| versions.json | 版本字串為鍵，最低 Obsidian 版本為值；0.6.0 與 0.7.0 對應 1.5.0，與 manifest 契約一致。 |
| tsconfig.json | compilerOptions.target／module／moduleResolution 編譯環境；lib ES／DOM 型別；strict／noImplicitReturns／noUncheckedIndexedAccess 檢查；isolatedModules 配合 esbuild；skipLibCheck 跳過依賴；include 限定 src。 |
| esbuild options | entryPoints 入口；bundle 合併；external 排除宿主；format／target 產物格式；outfile 檔名；sourcemap 開發啟用。 |

data.json 使用 ExplorerPreferences 契約；package-lock.json 為 npm 依賴快照；dist 是可安裝三檔資料夾與 ZIP。自行維護的程式碼使用 Tab 縮排，由 .editorconfig 設定顯示寬度 2。

## GitHub 發布

公開儲存庫為 MiuDog/FlatExplorer，Release 標籤與 manifest.version 一致，目前使用 0.7.0。發行附件為 main.js、manifest.json、styles.css 與含 flat-explorer 資料夾的 flat-explorer.zip。main.js／dist／node_modules／.qa 由 .gitignore 排除，不將本機測試資料、Vault 偏好、截圖或依賴套件提交到原始碼儲存庫。

## 行動裝置下載文件與發行附件

[安裝入口](docs/install/README.md) 連結 [Android](docs/install/android.md)、[iPadOS](docs/install/ipados.md)、[iOS](docs/install/ios.md)、[Sync](docs/install/sync.md) 與 [更新復原](docs/install/updates.md) 文件。這些是安裝文件，沒有新增執行期類別或函式。

目前推薦 BRAT：公開 Release 已提供其所需的三個單獨資產，manifest.isDesktopOnly=false。BRAT 可接受 MiuDog/FlatExplorer 或完整 GitHub 儲存庫 URL。平台 ZIP 為 flat-explorer-android.zip、flat-explorer-ipados.zip、flat-explorer-ios.zip，各自包含同一個 flat-explorer/ 三檔資料夾，另於 ZIP 根目錄附 install-android.md、install-ipados.md 或 install-ios.md。三份指南也作為 Release 獨立附件，與現有 0.6.0 發行版並存，不變更已發布標籤與主程式。

平台文件依 BRAT、Obsidian 官方文件於 2026-11-02 查證；下載資產驗證格式與雜湊，不宣稱 Android／iPadOS／iOS 實機安裝已測試。指南中 iOS／iPadOS 以 BRAT 為主、電腦同步為備用，不假設系統「檔案」App 可直接操作 Vault 的隱藏資料夾。
