import { Notice, Plugin } from "obsidian";
import { FlatExplorerView, VIEW_TYPE } from "./FlatExplorerView";
import { ExplorerPreferences, parsePreferences, remapPaths } from "./explorer_preferences";

/*
FlatExplorerPlugin：管理面板及可持久化顯示偏好，繼承 Plugin 的 app、儲存與生命週期。

preferences: ExplorerPreferences，當前 Vault 的置頂、隱藏與排序。
saveQueue: Promise<void>，序列化儲存，防止快速連點造成舊資料覆蓋新資料。

onload()：輸入無；Promise<void>，載入設定、註冊入口與改名刪除同步；讀取失敗由宿主回報。
savePreferences()：輸入無；void，重繪並排隊存檔；失敗通知，可再次操作重試。
refreshViews()：輸入無；void，通知所有 FlatExplorer 面板更新。
activateView()：輸入無；Promise<void>，先喚醒核心側欄，重用或新建獨立面板，透過 revealLeaf 顯示桌面側欄或手機抽屜；宿主錯誤向外傳遞。

*/
export default class FlatExplorerPlugin extends Plugin {

	preferences: ExplorerPreferences = parsePreferences(null);
	private saveQueue: Promise<void> = Promise.resolve();

	async onload(): Promise<void> {
		// 步驟 1：先還原顯示偏好，避免重啟時暫時顯示已隱藏項目。
		this.preferences = parsePreferences(await this.loadData());

		// 步驟 2：註冊面板、預覽來源與入口，清理由宿主生命週期管理。
		this.registerView(VIEW_TYPE, (leaf) => new FlatExplorerView(leaf, this));
		this.registerHoverLinkSource(VIEW_TYPE, { display: "FlatExplorer", defaultMod: true });
		this.addRibbonIcon("folder-open", "開啟 FlatExplorer", () => this.activateView());
		this.addCommand({ id: "open-flat-explorer", name: "開啟檔案瀏覽器", callback: () => this.activateView() });
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			this.preferences.pinned = remapPaths(this.preferences.pinned, oldPath, file.path);
			this.preferences.hidden = remapPaths(this.preferences.hidden, oldPath, file.path);
			this.preferences.manualOrder = remapPaths(this.preferences.manualOrder, oldPath, file.path);
			this.savePreferences();
		}));
		this.registerEvent(this.app.vault.on("delete", (file) => {
			this.preferences.pinned = remapPaths(this.preferences.pinned, file.path, null);
			this.preferences.hidden = remapPaths(this.preferences.hidden, file.path, null);
			this.preferences.manualOrder = remapPaths(this.preferences.manualOrder, file.path, null);
			this.savePreferences();
		}));
	}

	savePreferences(): void {
		// 保存獨立快照，錯誤不會使後續佇列永久中斷。
		const snapshot = parsePreferences(this.preferences);
		this.refreshViews();
		this.saveQueue = this.saveQueue.then(() => this.saveData(snapshot)).catch((error) => {
			new Notice("FlatExplorer：設定儲存失敗，請再次操作重試。");
			console.error("FlatExplorer: 設定儲存失敗", error);
		});
	}

	refreshViews(): void {
		// 只更新本套件視圖，不影響原生檔案總管。
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			if (leaf.view instanceof FlatExplorerView)
				leaf.view.refresh();
		}
	}

	async activateView(): Promise<void> {
		// 手機可能尚未載入核心側欄；先喚醒其視圖，保留原生選單整合。
		for (const nativeLeaf of this.app.workspace.getLeavesOfType("file-explorer")) {
			if (typeof nativeLeaf.loadIfDeferred === "function")
				await nativeLeaf.loadIfDeferred();
		}

		// 重用現有面板，避免每次開啟都新增側欄。
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (!leaf) {
			leaf = this.app.workspace.getLeftLeaf(true) ?? undefined;
			if (!leaf)
				return;

			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}

		await this.app.workspace.revealLeaf(leaf);
	}
}
