import { HoverParent, ItemView, Menu, MenuItem, TAbstractFile } from "obsidian";

/*
NativeExplorer：目前核心檔案總管的內部介面，集中於相容層。

繼承 ItemView 與 HoverParent 的宿主欄位及生命週期。
sortOrder: string，目前原生排序代碼。
files: WeakMap<HTMLElement, TAbstractFile>，由列容器找到檔案。
fileItems: Record<string, NativeRow>，列索引，提供 tooltip 與選單定位。
tree: NativeTree，原生樹的選取介面。
onFileContextMenu(event: MouseEvent，位置；file: TAbstractFile，目標)：void，建立原生選單並發出 file-menu。
onFilePointerover(event: PointerEvent，游標事件；row: HTMLElement，檔案列)：void，原生 tooltip 與 hover-link。
onFilePointerout(event: PointerEvent，游標事件；row: HTMLElement，檔案列)：void，清理 tooltip。
startRenameFile(file: TAbstractFile，目標)：Promise<void>，啟動重新命名。
afterCreate(file: TAbstractFile，新項目；newLeaf: boolean，是否另開)：Promise<void>，完成建立後互動。

*/
export interface NativeExplorer extends ItemView, HoverParent {
	sortOrder: string;
	files: WeakMap<HTMLElement, TAbstractFile>;
	fileItems: Record<string, NativeRow>;
	tree: NativeTree;
	onFileContextMenu(event: MouseEvent, file: TAbstractFile): void;
	onFilePointerover(event: PointerEvent, row: HTMLElement): void;
	onFilePointerout(event: PointerEvent, row: HTMLElement): void;
	startRenameFile(file: TAbstractFile): Promise<void>;
	afterCreate(file: TAbstractFile, newLeaf: boolean): Promise<void>;
}

/*
NativeRow：原生選單與 tooltip 需要的最小列契約。

selfEl: HTMLElement，選單定位元素。
getTitle()：輸入無；輸出 string，完整顯示名稱。
isFullTitleShown()：輸入無；輸出 boolean，是否沒有截斷文字。

*/
export interface NativeRow {
	selfEl: HTMLElement;
	getTitle(): string;
	isFullTitleShown(): boolean;
}

/*
NativeTree：隔離原生多選狀態與 FlatExplorer 單項目選單。

selectedDoms: Set<unknown>，空集合，避免誤操作原生樹的多選檔案。
setFocusedItem(item: NativeRow，目標列)：void，相容層不改變原生樹焦點。

*/
export interface NativeTree {
	selectedDoms: Set<unknown>;
	setFocusedItem(item: NativeRow): void;
}

/*
NativeMenu：對現有選單項目進行相容整合，避免其他外掛造成重複 Pin/Hide。

items: Array<MenuItem & { titleEl?: HTMLElement; section?: string; dom?: HTMLElement }>，含分隔線的選單項目；titleEl 為標題、section 為原生分區、dom 為可移除的元素。
繼承 Menu 的公開新增與顯示介面。僅同名顯示控制項會替換本選單的回呼。

*/
interface NativeMenu extends Menu {
	items: Array<MenuItem & { titleEl?: HTMLElement; section?: string; dom?: HTMLElement }>;
}

export function retainCreationItems(menu: Menu): void {
	// 空白區只保留原生新增分區，沿用原始回呼及實際目錄，不暴露該目錄的刪除等操作。
	const native = menu as NativeMenu;
	native.items = native.items.filter((item) => {
		if (item.section === "action-primary")
			return true;

		item.dom?.remove();
		return false;
	});
}

export function findDisplayMenuItem(menu: Menu, kind: "pin" | "hide"): MenuItem | undefined {
	// 其他外掛若已插入同名控制項，沿用該選單列並接上本面板的顯示狀態。
	const matcher = kind === "pin" ? /^(?:Unpin|Pin)(?: File| Folder)?$/ : /^(?:Unhide|Hide)(?: File| Folder)?$/;
	return (menu as NativeMenu).items?.find((item) => matcher.test(item.titleEl?.textContent ?? ""));
}

export function asNativeExplorer(view: ItemView | undefined): NativeExplorer | null {
	// 內部 API 不保證跨版本，僅在方法齊全時啟用原生橋接。
	const candidate = view as NativeExplorer | undefined;
	if (!candidate || typeof candidate.onFileContextMenu !== "function" || typeof candidate.onFilePointerover !== "function" || typeof candidate.onFilePointerout !== "function")
		return null;

	return candidate;
}
