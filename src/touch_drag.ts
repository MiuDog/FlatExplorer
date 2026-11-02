import { TAbstractFile, TFolder } from "obsidian";

/*
TouchDragHandlers：觸控手勢與檔案操作之間的回呼契約。

start(row: HTMLElement，來源列；x: number，水平座標；y: number，垂直座標)：boolean，是否成功啟動拖曳，座標為 CSS px。
move(x: number，水平座標；y: number，垂直座標)：void，更新落點預覽，不修改檔案。
finish(cancelled: boolean，是否取消)：void，結束手勢，只有有效放置才執行操作。

*/
export interface TouchDragHandlers {
	start(row: HTMLElement, x: number, y: number): boolean;
	move(x: number, y: number): void;
	finish(cancelled: boolean): void;
}

/*
TouchDropTarget：已通過驗證的觸控落點。

kind: "reorder" | "move"，分別為手動順序與實體移動。
target: TAbstractFile，排序參考項目或目的資料夾。
row: HTMLElement，高亮顯示的列。
after: boolean，排序是否插入目標後方；移動時固定 false。

*/
export interface TouchDropTarget {
	kind: "reorder" | "move";
	target: TAbstractFile;
	row: HTMLElement;
	after: boolean;
}

export function getTouchDropKind(isFolder: boolean, ratio: number, manual: boolean): "move" | "before" | "after" | null {
	// 資料夾中間一半為移入；手動模式的上下四分之一保留作排序落點。
	if (isFolder && (!manual || ratio >= 0.25 && ratio <= 0.75))
		return "move";

	if (manual)
		return ratio < 0.5 ? "before" : "after";

	return null;
}

export function getMovePath(source: TAbstractFile, target: TFolder): string | null {
	// 拒絕根目錄、原地放置與資料夾循環；檔名保留原樣，衝突由呼叫端檢查。
	if (!source.parent || source.parent === target || source === target)
		return null;

	if (source instanceof TFolder && target.path.startsWith(`${source.path}/`))
		return null;

	return target.isRoot() ? source.name : `${target.path}/${source.name}`;
}
