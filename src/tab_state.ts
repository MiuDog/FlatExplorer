import { remapPaths } from "./explorer_preferences";

/*
ExplorerTabState：每個編輯區分頁獨立的瀏覽狀態。

folderPath: string，目前資料夾的 Vault 路徑。
showHidden: boolean，是否暫時顯示此分頁的隱藏項目。

*/
export interface ExplorerTabState {
	folderPath: string;
	showHidden: boolean;
}

/* 缺少分頁識別或無開啟編輯分頁時使用的本機預設鍵。 */
export const FALLBACK_TAB_ID = "__default__";

export function restoreTabStates(
	saved: unknown,
	leafIds: Iterable<string>,
	activeId: string | undefined,
	resetActiveOnStartup: boolean,
	existing?: ReadonlyMap<string, ExplorerTabState>
): Map<string, ExplorerTabState> {
	// 保留版面就緒前已產生的操作狀態，避免啟動還原覆蓋使用者切換。
	const restored = new Map<string, ExplorerTabState>(existing ?? []);
	if (!saved || typeof saved !== "object" || Array.isArray(saved))
		return restored;

	const entries = saved as Record<string, Partial<ExplorerTabState> | null>;
	for (const id of leafIds) {
		if (!id || restored.has(id) || id === activeId && resetActiveOnStartup)
			continue;

		const entry = entries[id];
		if (typeof entry?.folderPath === "string")
			restored.set(id, { folderPath: entry.folderPath, showHidden: entry.showHidden === true });
	}

	if (!resetActiveOnStartup && !restored.has(FALLBACK_TAB_ID)) {
		const fallback = entries[FALLBACK_TAB_ID];
		if (typeof fallback?.folderPath === "string")
			restored.set(FALLBACK_TAB_ID, { folderPath: fallback.folderPath, showHidden: fallback.showHidden === true });
	}

	return restored;
}

export function remapTabStateMap(
	states: ReadonlyMap<string, ExplorerTabState>,
	oldPath: string,
	newPath: string | null
): { states: Map<string, ExplorerTabState>; changed: boolean } {
	// 同步所有分頁記錄的目錄與祖先改名／刪除，不修改輸入 Map。
	const next = new Map<string, ExplorerTabState>();
	let changed = false;
	for (const [id, state] of states) {
		const [folderPath] = remapPaths([state.folderPath], oldPath, newPath);
		if (folderPath !== state.folderPath) {
			changed = true;
			if (folderPath !== undefined)
				next.set(id, { ...state, folderPath });
		}
		else {
			next.set(id, state);
		}
	}

	return { states: next, changed };
}
