import { HoverParent, HoverPopover, ItemView, Keymap, Menu, MenuItem, Notice, Platform, setIcon, setTooltip, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import type FlatExplorerPlugin from "./FlatExplorerPlugin";
import { compareEntries, reorderPaths, SORT_LABELS } from "./explorer_preferences";
import { findNativeExplorer, loadNativeExplorer, findDisplayMenuItem, NativeExplorer, retainCreationItems } from "./native_explorer";
import { getFileIcon } from "./file_icons";
import { TouchContextMenu } from "./TouchContextMenu";
import { TouchFileDrag } from "./TouchFileDrag";
import { getMovePath, getTouchDropKind, TouchDragHandlers, TouchDropTarget } from "./touch_drag";

export const VIEW_TYPE = "flat-explorer-view";

/*
FlatExplorerView：以原生導覽列呈現平面目錄，繼承 ItemView 與 HoverParent 契約。

plugin: FlatExplorerPlugin，顯示偏好與儲存協作者。
currentFolder: TFolder | null，目前目錄，未開啟為 null。
hoverPopover: HoverPopover | null，公開 API 降級預覽的生命週期。
nativeContext: NativeExplorer | null，隔離原生選取狀態與本面板 DOM 的橋接物件。
showHidden: boolean，暫時顯示隱藏項目以便取消隱藏，不跨重啟保存。
editing: boolean，重新命名期間避免重繪拆除輸入欄。
lastNativeSort: string，輪詢時只在原生排序改變時重繪。
draggedPath: string | null，本面板正在拖曳的直屬項目；不接受外部檔案拖放。
touchMenus: TouchContextMenu | null，行動裝置長按事件管理器，由子元件生命週期清理。
touchDrag: TouchFileDrag | null，物件長按拖曳管理器。
touchDrop: TouchDropTarget | null，目前通過驗證的放置目標。
dragPreview: HTMLElement | null，跟隨手指的檔名與動作預覽。
movingFile: boolean，是否正在由宿主搬移實體檔案，期間不接受新拖曳。
touchSource: TAbstractFile | null，原始拖曳物件身分，避免刪除後同路徑重建被誤搬移。
nativeLoading: Promise<void> | null，合併原生面板的非同步恢復，避免重複建立。
rowFiles: WeakMap<HTMLElement, TAbstractFile>，列對應的原始物件身分，拒絕拖曳期間已變更的列。

constructor(leaf: WorkspaceLeaf，宿主面板；plugin: FlatExplorerPlugin，偏好協作者)：建立視圖。
getViewType()、getDisplayText()、getIcon()：無輸入；string，分別回傳識別、名稱、圖示。
onOpen()：無輸入；Promise<void>，行動端註冊長按，喚醒延遲載入的核心側欄，訂閱檔案與作用中文件事件並繪製。
onClose()：無輸入；Promise<void>，清理預覽。
refresh()：無輸入；void，驗證目錄並重繪；編輯或拖曳中延後至完成。
nativeExplorer()：無輸入；NativeExplorer | null，掃描可用核心檔案總管。
ensureNativeContext()：無輸入；Promise<void>，延遲載入或補建已啟用的核心面板並重繪；失敗保留主題提示降級。
sortOrder()：無輸入；string，解析偏好或目前原生排序。
navigate(folder: TFolder，目的目錄)：void，切換目錄並重設隱藏項目暫顯狀態。
render()：無輸入；void，繪製頂部工具列、標題分隔線與排序後直屬項目。
createToolbarButton(parent: HTMLElement，按鈕列；label: string，無障礙名稱；icon: string，圖示識別)：HTMLElement，建立與原生同樣尺寸的導覽操作元素，補齊 Enter／Space 操作。
renderRow(parent: HTMLElement，父容器；file: TAbstractFile，項目；isPath: boolean，路徑列)：void，建立含類型圖示與置頂圖示的平面列，綁定滑鼠、鍵盤、選單、hover 回呼。
createNativeContext()：無輸入；NativeExplorer | null，建立隔離選取狀態、重新命名與建立後流程的原生代理。
showContext(event: MouseEvent，位置；file: TAbstractFile，目標)：Promise<void>，借用原生選單並追加自訂項；缺少內部 API 時提示。
showBackgroundContext(event: MouseEvent，空白區位置)：Promise<void>，沿用當前目錄的原生新增分區，包含啟用中的核心外掛新增項目；原生不可用時提示。
addMenuItems(menu: Menu，宿主選單；file: TAbstractFile，目標)：void，追加 pin/unpin、hide/unhide，根目錄除外。
addMoveMenuItems(menu: Menu，宿主選單；file: TAbstractFile，目標)：void，行動端手動模式提供同分組上移／下移。
getMoveTarget(file: TAbstractFile，目標；direction: number，-1 上移、1 下移)：TAbstractFile | undefined，取得可見同層且同置頂分組的相鄰項目。
showSortMenu(event: MouseEvent，位置)：void，顯示八種排序選擇並保存；首次手動模式保留原有排序。
bindManualDragging(row: HTMLElement，目標列；file: TAbstractFile，直屬項目)：void，手動模式綁定拖曳與前後插入指示，不搬移實體檔案。
canReorder(source: string，來源路徑；target: TAbstractFile，目的項目)：boolean，檢查手動模式、直屬同層與置頂分組，不接受外來項目。
moveEntry(source: string，來源路徑；target: TAbstractFile，目的項目；after: boolean，是否插入其後)：void，保存包含隱藏項的目錄順序，其他目錄順序不受影響。
clearDragIndicators(clearSource: boolean = true，是否一併清除來源外觀)：void，移除插入線，結束拖曳時也清除來源狀態。
showInsertionLine(row: HTMLElement，參考列；after: boolean，是否插在後方)：void，保留列的落點標記，在外層容器顯示不受圓角裁切的獨立橫線。
startTouchDrag(row: HTMLElement，來源列；x: number，水平 CSS px；y: number，垂直 CSS px)：boolean，啟動來源預覽與落點判斷。
updateTouchDrag(x: number，水平 CSS px；y: number，垂直 CSS px)：void，依位置判斷排序或搬移，驗證後高亮並更新預覽。
finishTouchDrag(cancelled: boolean，是否取消)：Promise<void>，重驗放置目標並保存排序或透過 FileManager 搬移；衝突或錯誤通知且不覆寫。
renameFile(file: TAbstractFile，目標)：Promise<void>，在平面列編輯；Enter 或失焦提交、Escape 取消；失敗通知。
openFile(file: TFile，目的檔案；newLeaf: boolean，是否新分頁)：Promise<void>，宿主開啟，行動端收起側欄，失敗通知。

*/
export class FlatExplorerView extends ItemView implements HoverParent {

	private readonly plugin: FlatExplorerPlugin;
	private currentFolder: TFolder | null = null;

	hoverPopover: HoverPopover | null = null;
	private nativeContext: NativeExplorer | null = null;

	private showHidden = false;
	private editing = false;
	private lastNativeSort = "";
	private draggedPath: string | null = null;
	private touchMenus: TouchContextMenu | null = null;
	private touchDrag: TouchFileDrag | null = null;
	private touchDrop: TouchDropTarget | null = null;
	private dragPreview: HTMLElement | null = null;
	private movingFile = false;
	private touchSource: TAbstractFile | null = null;
	private nativeLoading: Promise<void> | null = null;
	private rowFiles = new WeakMap<HTMLElement, TAbstractFile>();

	constructor(leaf: WorkspaceLeaf, plugin: FlatExplorerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "FlatExplorer";
	}

	getIcon(): string {
		return "folder-open";
	}

	async onOpen(): Promise<void> {
		// 監看 Vault 與作用中文件；排序只在實際改變時觸發重繪。
		this.currentFolder = this.app.vault.getRoot();
		if (Platform.isMobile) {
			this.touchMenus = new TouchContextMenu(this.contentEl);
			this.addChild(this.touchMenus);

			// TouchDragHandlers 將手勢與資料操作分開，預覽期間不修改 Vault。
			const handlers: TouchDragHandlers = {
				start: (row, x, y) => this.startTouchDrag(row, x, y),
				move: (x, y) => this.updateTouchDrag(x, y),
				finish: (cancelled) => void this.finishTouchDrag(cancelled)
			};
			this.touchDrag = new TouchFileDrag(this.contentEl, handlers);
			this.addChild(this.touchDrag);
		}

		for (const nativeLeaf of this.app.workspace.getLeavesOfType("file-explorer")) {
			if (typeof nativeLeaf.loadIfDeferred === "function")
				await nativeLeaf.loadIfDeferred();
		}

		this.registerDomEvent(this.contentEl, "contextmenu", (event) => {
			if (event.target instanceof Element && !event.target.closest(".flat-explorer-row, .flat-explorer-toolbar, input"))
				this.showBackgroundContext(event);
		});
		this.registerEvent(this.app.vault.on("create", () => this.refresh()));
		this.registerEvent(this.app.vault.on("delete", () => this.refresh()));
		this.registerEvent(this.app.vault.on("rename", () => this.refresh()));
		this.registerEvent(this.app.vault.on("modify", () => this.refresh()));
		this.registerEvent(this.app.workspace.on("file-open", () => this.refresh()));
		this.registerInterval(window.setInterval(() => {
			const order = this.sortOrder();
			if (order !== this.lastNativeSort || this.nativeExplorer() !== (this.nativeContext ? Object.getPrototypeOf(this.nativeContext) : null))
				this.refresh();
		}, 1000));
		this.render();
		this.app.workspace.onLayoutReady(() => void this.ensureNativeContext());
	}

	async onClose(): Promise<void> {
		// 關閉面板時一併清理預覽浮窗。
		this.draggedPath = null;
		this.touchMenus?.cancel();
		this.touchDrag?.cancel();
		this.dragPreview?.remove();
		this.hoverPopover?.unload();
		this.nativeContext?.hoverPopover?.unload();
	}

	refresh(): void {
		if (this.editing || this.draggedPath || this.movingFile)
			return;

		// 祖先改名後仍保留物件身分；刪除後回到根目錄。
		const folder = this.currentFolder;
		if (!folder || this.app.vault.getAbstractFileByPath(folder.path) !== folder)
			this.currentFolder = this.app.vault.getRoot();

		this.render();
	}

	private nativeExplorer(): NativeExplorer | null {
		// 不依賴面板順序或目前是否顯示。
		return findNativeExplorer(this.app);
	}

	private async ensureNativeContext(): Promise<void> {
		if (this.nativeLoading)
			return this.nativeLoading;

		// 載入完成才重建列映射，移除先前的降級提示與事件處理器。
		this.nativeLoading = loadNativeExplorer(this.app).then(() => this.refresh()).catch((error) => {
			console.error("FlatExplorer: 原生面板載入失敗", error);
		}).finally(() => this.nativeLoading = null);
		return this.nativeLoading;
	}

	private sortOrder(): string {
		const order = this.plugin.preferences.sortOrder;
		return order === "native" ? this.nativeExplorer()?.sortOrder ?? "alphabetical" : order;
	}

	private navigate(folder: TFolder): void {
		this.currentFolder = folder;
		this.showHidden = false;
		this.render();
	}

	private render(): void {
		const folder = this.currentFolder;
		if (!folder)
			return;

		// 步驟 1：清理舊浮窗與 DOM，建立本輪列的原生映射。
		this.touchMenus?.cancel();
		this.touchDrag?.cancel();
		this.nativeContext?.hoverPopover?.unload();
		this.contentEl.empty();
		this.rowFiles = new WeakMap();
		this.contentEl.removeClass("nav-files-container");
		this.contentEl.addClass("flat-explorer");
		this.nativeContext = this.createNativeContext();
		this.lastNativeSort = this.sortOrder();
		const ancestors: TFolder[] = [];
		let ancestor: TFolder | null = folder;
		while (ancestor) {
			ancestors.unshift(ancestor);
			ancestor = ancestor.parent;
		}

		// 步驟 2：沿用原生導覽工具列類別，操作按鈕固定於捲動內容上方。
		const toolbar = this.contentEl.createDiv("nav-header flat-explorer-toolbar");
		const buttons = toolbar.createDiv({ cls: "nav-buttons-container", attr: { role: "toolbar", "aria-label": "FlatExplorer 操作" } });
		if (Platform.isMobile) {
			const create = this.createToolbarButton(buttons, "新增項目", "plus");
			create.addEventListener("click", (event) => this.showBackgroundContext(event));
		}

		const sort = this.createToolbarButton(buttons, "排序模式", "sort-asc");
		sort.addEventListener("click", (event) => this.showSortMenu(event));
		const hiddenPaths = this.plugin.preferences.hidden;
		if (folder.children.some((item) => hiddenPaths.includes(item.path))) {
			const hidden = this.createToolbarButton(buttons, "顯示或收起隱藏項目", this.showHidden ? "eye" : "eye-off");
			hidden.setAttribute("aria-pressed", String(this.showHidden));
			hidden.addEventListener("click", () => {
				this.showHidden = !this.showHidden;
				this.render();
			});
		}

		// 步驟 3：兩區標題與分隔線同行，所有項目保持平面對齊。
		const sections = this.contentEl.createDiv("nav-files-container flat-explorer-sections");
		const headingId = `flat-explorer-${Math.random().toString(36).slice(2)}`;
		const pathSection = sections.createEl("nav", { cls: "flat-explorer-path", attr: { "aria-labelledby": `${headingId}-path` } });
		pathSection.createEl("h3", { text: "路徑", cls: "flat-explorer-heading", attr: { id: `${headingId}-path` } });
		for (const item of ancestors)
			this.renderRow(pathSection, item, true);

		const contents = sections.createEl("section", { cls: "flat-explorer-contents", attr: { "aria-labelledby": `${headingId}-contents` } });
		contents.createEl("h3", { text: "當前目錄", cls: "flat-explorer-heading", attr: { id: `${headingId}-contents` } });

		// 步驟 4：過濾隱藏項，套用置頂與排序；preferences 沿用既有契約。
		const preferences = { ...this.plugin.preferences, sortOrder: this.lastNativeSort };
		const children = folder.children.filter((item) => this.showHidden || !hiddenPaths.includes(item.path));
		children.sort((left, right) => compareEntries(left, right, preferences));
		if (children.length === 0)
			contents.createEl("p", { text: "此目錄沒有可顯示的項目。", cls: "flat-explorer-empty" });

		for (const item of children)
			this.renderRow(contents, item, false);
	}

	private createToolbarButton(parent: HTMLElement, label: string, icon: string): HTMLElement {
		// 原生導覽動作使用 div，避免 button 的字型與高度規則改變實際點擊範圍。
		const button = parent.createDiv({ cls: "clickable-icon nav-action-button", attr: { role: "button", tabindex: "0", "aria-label": label } });
		setIcon(button, icon);
		setTooltip(button, label);
		button.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				event.stopPropagation();
				button.click();
			}
		});
		return button;
	}

	private renderRow(parent: HTMLElement, file: TAbstractFile, isPath: boolean): void {
		// 使用原生類別與文字容器，沿用主題的字型、間距、選取與 hover 外觀。
		const isFolder = file instanceof TFolder;
		const wrapper = parent.createDiv(isFolder ? "nav-folder tree-item" : "nav-file tree-item");
		wrapper.addClass("flat-explorer-item");
		const row = wrapper.createDiv(isFolder ? "nav-folder-title tree-item-self flat-explorer-row" : "nav-file-title tree-item-self flat-explorer-row");
		row.dataset.path = file.path;
		this.rowFiles.set(row, file);
		row.tabIndex = 0;
		row.setAttribute("role", "button");

		// 每列保留固定圖示欄位；置頂大頭針與類型圖示共用位置，由 CSS 切換。
		const icons = row.createSpan({ cls: "flat-explorer-icons", attr: { "aria-hidden": "true" } });
		const typeIcon = icons.createSpan("flat-explorer-type-icon");
		setIcon(typeIcon, getFileIcon(this.app, file));

		if (isPath && file === this.currentFolder)
			row.setAttribute("aria-current", "location");

		if (!isPath && file === this.app.workspace.getActiveFile())
			row.addClass("is-active");

		if (!isPath && this.plugin.preferences.hidden.includes(file.path))
			row.addClass("flat-explorer-hidden");

		if (!isPath && this.plugin.preferences.pinned.includes(file.path)) {
			row.addClass("is-pinned");
			const pin = icons.createSpan("flat-explorer-pin");
			setIcon(pin, "pin");
		}

		let label = file.name;
		if (file instanceof TFolder && file.isRoot())
			label = this.app.vault.getName();
		else if (file instanceof TFile && file.extension === "md")
			label = file.basename;

		const title = row.createDiv({ cls: isFolder ? "nav-folder-title-content" : "nav-file-title-content", text: label });
		if (Platform.isMobile) {
			const more = this.createToolbarButton(row, `${label}：更多操作`, "ellipsis");
			more.addClass("flat-explorer-more");
			more.addEventListener("click", (event) => {
				event.stopPropagation();
				this.showContext(event, file);
			});
		}

		const activate = (event: MouseEvent | KeyboardEvent): void => {
			if (this.editing)
				return;

			if (file instanceof TFolder)
				this.navigate(file);
			else if (file instanceof TFile)
				void this.openFile(file, Boolean(Keymap.isModEvent(event)) || event instanceof MouseEvent && event.button === 1);
		};
		row.addEventListener("click", activate);
		row.addEventListener("auxclick", (event) => {
			if (event.button === 1) {
				event.preventDefault();
				activate(event);
			}
		});
		row.addEventListener("keydown", (event) => {
			if (this.editing)
				return;

			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				activate(event);
			}
			else if (event.key === "F2") {
				event.preventDefault();
				void this.renameFile(file);
			}
		});
		row.addEventListener("contextmenu", (event) => this.showContext(event, file));
		if (!isPath && this.sortOrder() === "manual" && !Platform.isMobile)
			this.bindManualDragging(row, file);

		// NativeRow 契約提供本面板的定位元素與文字截斷資訊。
		const native = this.nativeContext;
		if (native) {
			native.files.set(wrapper, file);
			native.fileItems[file.path] = {
				selfEl: row,
				getTitle: () => label,
				isFullTitleShown: () => title.scrollWidth <= title.clientWidth
			};
		}
		if (native?.onFilePointerover && native.onFilePointerout) {
			row.addEventListener("pointerover", (event) => {
				if (!this.draggedPath && event.pointerType !== "touch")
					native.onFilePointerover?.(event, row);
			});
			row.addEventListener("pointerout", (event) => native.onFilePointerout?.(event, row));
		}
		else {
			// 公開 tooltip API 沿用主題樣式，不使用瀏覽器原生 title 方框。
			const info = file instanceof TFolder ? `${file.children.filter((child) => child instanceof TFile).length} 個檔案, ${file.children.filter((child) => child instanceof TFolder).length} 個資料夾` : file.path;
			setTooltip(row, info, { placement: "right" });
			row.addEventListener("mouseover", (event) => {
				if (file instanceof TFile)
					this.app.workspace.trigger("hover-link", { event, source: VIEW_TYPE, hoverParent: this, targetEl: row, linktext: file.path });
			});
		}
	}

	private createNativeContext(): NativeExplorer | null {
		const native = this.nativeExplorer();
		if (!native)
			return null;

		// 代理借用原生處理器；隔離檔案映射、焦點與多選，避免波及原生樹。
		const context = Object.create(native) as NativeExplorer;
		context.files = new WeakMap();
		context.fileItems = Object.create(null) as NativeExplorer["fileItems"];
		context.containerEl = this.containerEl;
		context.hoverPopover = null;
		context.tree = { selectedDoms: new Set(), setFocusedItem: () => {} };
		context.startRenameFile = (file) => this.renameFile(file);
		context.afterCreate = async (file, newLeaf) => {
			if (file instanceof TFile) {
				await this.openFile(file, newLeaf);
				return;
			}

			if (file.parent)
				this.navigate(file.parent);

			await this.renameFile(file);
		};
		return context;
	}

	private async showContext(event: MouseEvent, file: TAbstractFile): Promise<void> {
		event.preventDefault();
		event.stopPropagation();
		if (!this.nativeContext)
			await this.ensureNativeContext();

		const native = this.nativeContext;
		if (!native) {
			new Notice("FlatExplorer：無法載入核心檔案列表的選單處理器，請重新載入套件。");
			const menu = new Menu();
			this.addMenuItems(menu, file);
			menu.showAtMouseEvent(event);
			return;
		}

		// 只在此次同步建立選單期間追加項目，保留核心與其他外掛的 file-menu 回呼。
		const ref = this.app.workspace.on("file-menu", (menu, target) => {
			if (target === file)
				this.addMenuItems(menu, file);
		});
		try {
			native.onFileContextMenu(event, file);
		}
		finally {
			this.app.workspace.offref(ref);
		}
	}

	private addMenuItems(menu: Menu, file: TAbstractFile): void {
		if (file instanceof TFolder && file.isRoot())
			return;

		// 狀態保存在本套件，隱藏不會搬移或刪除檔案。
		const preferences = this.plugin.preferences;
		const hidden = preferences.hidden.includes(file.path);
		if (file instanceof TFile || file instanceof TFolder) {
			const pinned = preferences.pinned.includes(file.path);
			const kind = file instanceof TFolder ? "Folder" : "File";
			const configurePin = (item: MenuItem): void => {
				item.setSection("").setTitle(`${pinned ? "Unpin" : "Pin"} ${kind}`).setIcon(pinned ? "pin-off" : "pin").onClick(() => {
					preferences.pinned = pinned ? preferences.pinned.filter((path) => path !== file.path) : [...preferences.pinned, file.path];
					this.plugin.savePreferences();
				});
			};
			const existing = findDisplayMenuItem(menu, "pin");
			if (existing)
				configurePin(existing);
			else
				menu.addItem(configurePin);
		}

		const configureHide = (item: MenuItem): void => {
			item.setSection("").setTitle(hidden ? "Unhide" : "Hide").setIcon(hidden ? "eye" : "eye-off").onClick(() => {
				preferences.hidden = hidden ? preferences.hidden.filter((path) => path !== file.path) : [...preferences.hidden, file.path];
				this.plugin.savePreferences();
			});
		};
		const existing = findDisplayMenuItem(menu, "hide");
		if (existing)
			configureHide(existing);
		else
			menu.addItem(configureHide);

		if (Platform.isMobile && this.sortOrder() === "manual")
			this.addMoveMenuItems(menu, file);
	}

	private addMoveMenuItems(menu: Menu, file: TAbstractFile): void {
		// 行動瀏覽器不依賴 HTML 拖曳，以同一套保存邏輯提供觸控排序。
		for (const direction of [-1, 1]) {
			const target = this.getMoveTarget(file, direction);
			menu.addItem((item) => item.setSection("").setTitle(direction < 0 ? "上移" : "下移").setIcon(direction < 0 ? "arrow-up" : "arrow-down").setDisabled(!target).onClick(() => {
				const neighbor = this.getMoveTarget(file, direction);
				if (neighbor)
					this.moveEntry(file.path, neighbor, direction > 0);
			}));
		}
	}

	private getMoveTarget(file: TAbstractFile, direction: number): TAbstractFile | undefined {
		if (!this.currentFolder || this.sortOrder() !== "manual" || !this.currentFolder.children.includes(file))
			return undefined;

		const preferences = this.plugin.preferences;
		const visible = this.currentFolder.children.filter((item) => this.showHidden || !preferences.hidden.includes(item.path));
		visible.sort((left, right) => compareEntries(left, right, preferences));
		const target = visible[visible.indexOf(file) + direction];
		return target && this.canReorder(file.path, target) ? target : undefined;
	}

	private async showBackgroundContext(event: MouseEvent): Promise<void> {
		event.preventDefault();
		event.stopPropagation();
		if (!this.nativeContext)
			await this.ensureNativeContext();

		const native = this.nativeContext;
		const folder = this.currentFolder;
		if (!native || !folder) {
			new Notice("FlatExplorer：無法載入核心檔案列表的新增選單，請重新載入套件。");
			return;
		}

		// 以真實當前目錄建立原生選單，確保新增資料夾、畫布與 Base 的目的地正確。
		const ref = this.app.workspace.on("file-menu", (menu, target) => {
			if (target === folder)
				retainCreationItems(menu);
		});
		try {
			native.onFileContextMenu(event, folder);
		}
		finally {
			this.app.workspace.offref(ref);
		}
	}

	private showSortMenu(event: MouseEvent): void {
		// 使用宿主 Menu，維持與參考截圖一致的選單外觀。
		const menu = new Menu();
		for (const [order, label] of Object.entries(SORT_LABELS)) {
			const title = Platform.isMobile && order === "manual" ? "手動排序（長按拖曳／選單調整）" : label;
			menu.addItem((item) => item.setTitle(title).setChecked(this.plugin.preferences.sortOrder === order).onClick(() => {
				// 首次進入手動模式時記住此目錄完整順序；切換回來則沿用已保存的編排。
				const folder = this.currentFolder;
				const preferences = this.plugin.preferences;
				if (order === "manual" && folder && !folder.children.some((file) => preferences.manualOrder.includes(file.path))) {
					const current = { ...preferences, sortOrder: this.sortOrder() };
					const entries = [...folder.children].sort((left, right) => compareEntries(left, right, current));
					preferences.manualOrder.push(...entries.map((file) => file.path));
				}

				this.plugin.preferences.sortOrder = order;
				this.plugin.savePreferences();
			}));
		}

		menu.showAtMouseEvent(event);
	}

	private bindManualDragging(row: HTMLElement, file: TAbstractFile): void {
		// 只在手動模式提供本面板內部的排列拖曳，不使用宿主的檔案搬移資料格式。
		row.draggable = true;
		row.addEventListener("dragstart", (event) => {
			if (this.editing || this.sortOrder() !== "manual") {
				event.preventDefault();
				return;
			}

			event.stopPropagation();
			this.draggedPath = file.path;
			row.addClass("is-dragging");
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("application/x-flat-explorer-order", file.path);
			}
		});
		row.addEventListener("dragover", (event) => {
			if (!this.draggedPath || !this.canReorder(this.draggedPath, file))
				return;

			event.preventDefault();
			event.stopPropagation();
			this.clearDragIndicators(false);
			const rect = row.getBoundingClientRect();
			const after = event.clientY >= rect.top + rect.height / 2;
			this.showInsertionLine(row, after);
			if (event.dataTransfer)
				event.dataTransfer.dropEffect = "move";
		});
		row.addEventListener("dragleave", (event) => {
			if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget))
				return;

			row.removeClass("flat-explorer-drop-before", "flat-explorer-drop-after");
			row.parentElement?.removeClass("flat-explorer-insert-before", "flat-explorer-insert-after");
		});
		row.addEventListener("drop", (event) => {
			if (!this.draggedPath)
				return;

			event.preventDefault();
			event.stopPropagation();
			const source = this.draggedPath;
			const rect = row.getBoundingClientRect();
			this.draggedPath = null;
			this.clearDragIndicators();
			this.moveEntry(source, file, event.clientY >= rect.top + rect.height / 2);
		});
		row.addEventListener("dragend", () => {
			this.draggedPath = null;
			this.clearDragIndicators();
			this.refresh();
		});
	}

	private canReorder(source: string, target: TAbstractFile): boolean {
		const children = this.currentFolder?.children;
		if (this.editing || this.sortOrder() !== "manual" || source === target.path || !children?.includes(target))
			return false;

		const preferences = this.plugin.preferences;
		return children.some((file) => file.path === source) && preferences.pinned.includes(source) === preferences.pinned.includes(target.path);
	}

	private moveEntry(source: string, target: TAbstractFile, after: boolean): void {
		if (!this.canReorder(source, target) || !this.currentFolder)
			return;

		// 保存整個目錄的順序，包括暫時隱藏的項目，避免重新顯示時遺失位置。
		const preferences = this.plugin.preferences;
		const children = [...this.currentFolder.children].sort((left, right) => compareEntries(left, right, preferences));
		const paths = children.map((file) => file.path);
		const updated = reorderPaths(paths, source, target.path, after);
		preferences.manualOrder = [...preferences.manualOrder.filter((path) => !paths.includes(path)), ...updated];
		this.plugin.savePreferences();
	}

	private clearDragIndicators(clearSource = true): void {
		for (const row of Array.from(this.contentEl.querySelectorAll(".flat-explorer-row"))) {
			row.removeClass("flat-explorer-drop-before", "flat-explorer-drop-after", "flat-explorer-drop-into");
			row.parentElement?.removeClass("flat-explorer-insert-before", "flat-explorer-insert-after");
			if (clearSource)
				row.removeClass("is-dragging");
		}
	}

	private showInsertionLine(row: HTMLElement, after: boolean): void {
		// 橫線繪製在圓角檔案列之外；列標記仍供落點與拖曳驗證使用。
		row.removeClass("flat-explorer-drop-before", "flat-explorer-drop-after");
		row.parentElement?.removeClass("flat-explorer-insert-before", "flat-explorer-insert-after");
		row.addClass(after ? "flat-explorer-drop-after" : "flat-explorer-drop-before");
		row.parentElement?.addClass(after ? "flat-explorer-insert-after" : "flat-explorer-insert-before");
	}

	private startTouchDrag(row: HTMLElement, x: number, y: number): boolean {
		if (this.editing || this.movingFile || this.draggedPath)
			return false;

		const source = this.currentFolder?.children.find((file) => file.path === row.dataset.path);
		if (!source || source !== this.rowFiles.get(row))
			return false;

		// 提供來源與動作預覽；固定定位不攔截 elementFromPoint 的落點偵測。
		this.draggedPath = source.path;
		this.touchSource = source;
		row.addClass("is-dragging");
		this.dragPreview = this.contentEl.doc.body.createDiv({ cls: "flat-explorer-drag-preview", attr: { "aria-hidden": "true" } });
		this.dragPreview.createDiv({ cls: "flat-explorer-drag-name", text: source.name });
		this.dragPreview.createDiv({ cls: "flat-explorer-drag-action", text: "拖至資料夾以移動" });
		this.updateTouchDrag(x, y);
		return true;
	}

	private updateTouchDrag(x: number, y: number): void {
		this.clearDragIndicators(false);
		this.touchDrop = null;
		const candidate = this.draggedPath ? this.app.vault.getAbstractFileByPath(this.draggedPath) : null;
		const source = candidate === this.touchSource ? candidate : null;
		const element = this.contentEl.doc.elementFromPoint(x, y);
		const row = element?.closest<HTMLElement>(".flat-explorer-row");
		let description = "拖至資料夾以移動";
		if (source && row && this.contentEl.contains(row)) {
			const target = this.rowFiles.get(row);
			if (target && target !== source && target.path === row.dataset.path && this.app.vault.getAbstractFileByPath(target.path) === target) {
				const rect = row.getBoundingClientRect();
				const isPath = !!row.closest(".flat-explorer-path");
				const ratio = rect.height > 0 ? (y - rect.top) / rect.height : 0.5;
				const kind = getTouchDropKind(target instanceof TFolder, ratio, !isPath && this.sortOrder() === "manual");
				if (kind === "move" && target instanceof TFolder) {
					const path = getMovePath(source, target);
					if (path && !this.app.vault.getAbstractFileByPath(path)) {
						this.touchDrop = { kind: "move", target, row, after: false };
						row.addClass("flat-explorer-drop-into");
						description = `移動至：${target.isRoot() ? this.app.vault.getName() : target.name}`;
					}
					else
						description = path ? "目標已有同名項目，不能放置" : "不能移入原位置、自身或子孫資料夾";
				}
				else if (kind === "before" || kind === "after") {
					if (this.canReorder(source.path, target)) {
						this.touchDrop = { kind: "reorder", target, row, after: kind === "after" };
						this.showInsertionLine(row, kind === "after");
						description = `排序：放在「${target.name}」${kind === "after" ? "之後" : "之前"}`;
					}
					else
						description = "不能跨置頂群組調整順序";
				}
				else
					description = "此排序模式請拖至資料夾以移動";
			}
		}

		// 依有效操作更新文字，並將預覽限制在視窗內。
		const preview = this.dragPreview;
		if (preview) {
			preview.querySelector(".flat-explorer-drag-action")?.setText(description);
			preview.style.left = `${Math.max(8, Math.min(x + 16, this.contentEl.win.innerWidth - preview.offsetWidth - 8))}px`;
			preview.style.top = `${Math.max(8, Math.min(y + 20, this.contentEl.win.innerHeight - preview.offsetHeight - 8))}px`;
		}
	}

	private async finishTouchDrag(cancelled: boolean): Promise<void> {
		const sourcePath = this.draggedPath;
		const expectedSource = this.touchSource;
		const drop = this.touchDrop;
		this.draggedPath = null;
		this.touchSource = null;
		this.touchDrop = null;
		this.dragPreview?.remove();
		this.dragPreview = null;
		this.clearDragIndicators();
		if (cancelled || !sourcePath || !drop) {
			this.refresh();
			return;
		}

		if (drop.kind === "reorder") {
			this.moveEntry(sourcePath, drop.target, drop.after);
			return;
		}

		// 放開時再次驗證來源、目的資料夾及同名衝突，避免拖曳期間的 Vault 變動造成誤操作。
		const source = this.app.vault.getAbstractFileByPath(sourcePath);
		const target = this.app.vault.getAbstractFileByPath(drop.target.path);
		const destination = source === expectedSource && source && target === drop.target && target instanceof TFolder ? getMovePath(source, target) : null;
		if (!source || !destination || this.app.vault.getAbstractFileByPath(destination)) {
			new Notice("無法移動：來源或目標已變更，或目標已有同名項目。");
			this.refresh();
			return;
		}

		this.movingFile = true;
		try {
			await this.app.fileManager.renameFile(source, destination);
		}
		catch (error) {
			new Notice(`移動失敗：${error instanceof Error ? error.message : String(error)}`);
		}
		finally {
			this.movingFile = false;
			this.refresh();
		}
	}

	private async renameFile(file: TAbstractFile): Promise<void> {
		if (this.editing || file instanceof TFolder && file.isRoot())
			return;

		// 原生選單在本面板就地命名，仍由宿主更新連結。
		const row = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".flat-explorer-row")).find((element) => element.dataset.path === file.path);
		if (!row)
			return;

		this.editing = true;
		const input = row.createEl("input", { cls: "flat-explorer-rename", value: file.name, attr: { "aria-label": "重新命名" } });
		const title = row.querySelector<HTMLElement>(".nav-file-title-content, .nav-folder-title-content");
		if (title)
			title.hidden = true;

		let finished = false;
		const finish = async (cancel: boolean): Promise<void> => {
			if (finished)
				return;

			finished = true;
			const name = input.value.trim();
			try {
				if (!cancel && name !== file.name) {
					if (!name || name.startsWith(".") || /[\\/:*?"<>|\u0000-\u001f]/.test(name))
						throw new Error("檔名不得為空、以句點開頭或包含路徑與無效字元。");

					const parentPath = file.parent?.isRoot() ? "" : `${file.parent?.path ?? ""}/`;
					await this.app.fileManager.renameFile(file, parentPath + name);
				}
			}
			catch (error) {
				new Notice(`重新命名失敗：${error instanceof Error ? error.message : String(error)}`);
			}
			finally {
				this.editing = false;
				this.refresh();
			}
		};
		input.addEventListener("click", (event) => event.stopPropagation());
		input.addEventListener("blur", () => void finish(false));
		input.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Enter" || event.key === "Escape") {
				event.preventDefault();
				void finish(event.key === "Escape");
			}
		});
		input.focus();
		input.setSelectionRange(0, file instanceof TFile ? file.basename.length : file.name.length);
	}

	private async openFile(file: TFile, newLeaf: boolean): Promise<void> {
		// 沿用宿主對各類檔案的處理。
		try {
			await this.app.workspace.getLeaf(newLeaf ? "tab" : false).openFile(file);
			if (Platform.isMobile)
				this.app.workspace.leftSplit.collapse();
		}
		catch (error) {
			new Notice(`無法開啟 ${file.name}`);
			console.error("FlatExplorer: 無法開啟檔案", error);
		}
	}
}
