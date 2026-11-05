import { TAbstractFile, TFile, TFolder } from "obsidian";

/*
ExplorerPreferences：可序列化的個別 Vault 顯示偏好。

pinned: string[]，置頂檔案或資料夾路徑，改名時同步更新；Vault 根目錄不提供置頂。
hidden: string[]，隱藏項目路徑，不修改實體檔案。
sortOrder: string，native、manual 或原生六種排序代碼；未知值回到 native。
restoreTabOnStartup: boolean，啟動時還原作用中分頁的瀏覽狀態。
manualOrder: string[]，Vault 路徑的自訂順序，各目錄只比較自身直屬項目；未排序的新項目排在已保存項目之後。

*/
export interface ExplorerPreferences {
	pinned: string[];
	hidden: string[];
	sortOrder: string;
	manualOrder: string[];
	restoreTabOnStartup: boolean;
}

/* 排序代碼對應顯示名稱；native 表示讀取原生檔案總管目前排序。 */
export const SORT_LABELS: Readonly<Record<string, string>> = {
	native: "跟隨原生檔案總管",
	manual: "手動排序（拖曳調整）",
	alphabetical: "檔案名稱（A → Z）",
	alphabeticalReverse: "檔案名稱（Z → A）",
	byModifiedTime: "修改時間（新 → 舊）",
	byModifiedTimeReverse: "修改時間（舊 → 新）",
	byCreatedTime: "建立時間（新 → 舊）",
	byCreatedTimeReverse: "建立時間（舊 → 新）"
};

export function parsePreferences(value: unknown): ExplorerPreferences {
	// 驗證儲存資料，避免舊設定或手動編輯使載入中斷。
	const data = (value && typeof value === "object" ? value : {}) as Partial<ExplorerPreferences>;
	const paths = (items: unknown): string[] => Array.isArray(items) ? [...new Set(items.filter((item): item is string => typeof item === "string"))] : [];
	return {
		pinned: paths(data.pinned),
		hidden: paths(data.hidden),
		sortOrder: typeof data.sortOrder === "string" && Object.prototype.hasOwnProperty.call(SORT_LABELS, data.sortOrder) ? data.sortOrder : "native",
		manualOrder: paths(data.manualOrder),
		restoreTabOnStartup: data.restoreTabOnStartup === true
	};
}

export function compareEntries(left: TAbstractFile, right: TAbstractFile, preferences: ExplorerPreferences): number {
	// 置頂優先於資料夾；同級項目仍採用目前排序，取消置頂自然回到原位置。
	const pinOrder = Number(preferences.pinned.includes(right.path)) - Number(preferences.pinned.includes(left.path));
	if (pinOrder)
		return pinOrder;

	// 手動順序允許資料夾與檔案交錯，但不能越過置頂群組。
	if (preferences.sortOrder === "manual") {
		const leftIndex = preferences.manualOrder.indexOf(left.path);
		const rightIndex = preferences.manualOrder.indexOf(right.path);
		const leftRank = leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex;
		const rightRank = rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex;
		if (leftRank !== rightRank)
			return leftRank - rightRank;
	}

	const folderOrder = Number(right instanceof TFolder) - Number(left instanceof TFolder);
	if (folderOrder)
		return folderOrder;

	const byName = left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
	if (!(left instanceof TFile) || !(right instanceof TFile))
		return byName;

	const order = preferences.sortOrder;
	const reverse = order.endsWith("Reverse") ? -1 : 1;
	if (order.startsWith("byModifiedTime"))
		return (right.stat.mtime - left.stat.mtime) * reverse || byName;

	if (order.startsWith("byCreatedTime"))
		return (right.stat.ctime - left.stat.ctime) * reverse || byName;

	return left.basename.localeCompare(right.basename, undefined, { numeric: true, sensitivity: "base" }) * reverse || byName;
}

export function remapPaths(paths: string[], oldPath: string, newPath: string | null): string[] {
	// 同步資料夾後代路徑；避免誤判同名前綴，刪除則清理偏好。
	return paths.flatMap((path) => {
		if (path !== oldPath && !path.startsWith(`${oldPath}/`))
			return [path];

		return newPath === null ? [] : [newPath + path.slice(oldPath.length)];
	});
}

export function reorderPaths(paths: string[], source: string, target: string, after: boolean): string[] {
	// 僅改動既有順序，不接受外來項目；先移除來源再定位目標，避免向下拖曳的索引偏移。
	const result = [...paths];
	if (source === target || !paths.includes(source) || !paths.includes(target))
		return result;

	result.splice(result.indexOf(source), 1);
	result.splice(result.indexOf(target) + Number(after), 0, source);
	return result;
}
