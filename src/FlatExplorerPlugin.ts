import { Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from "obsidian";
import { FlatExplorerView, VIEW_TYPE } from "./FlatExplorerView";
import { ExplorerPreferences, parsePreferences, remapPaths } from "./explorer_preferences";
import { ExplorerTabState, FALLBACK_TAB_ID, remapTabStateMap, restoreTabStates } from "./tab_state";

export type { ExplorerTabState };

const TAB_STORAGE_KEY = "flat-explorer-tab-states";

/*
FlatExplorerPlugin：管理面板及可持久化顯示偏好，繼承 Plugin 的 app、儲存與生命週期。

preferences: ExplorerPreferences，當前 Vault 的置頂、隱藏與排序。
saveQueue: Promise<void>，序列化儲存，防止快速連點造成舊資料覆蓋新資料。
tabStates: Map<string, ExplorerTabState>，以宿主版面持久化的分頁識別區分瀏覽狀態。
tabStatesReady: boolean，是否已完成本次啟動的還原決策。
pendingTabPersist: boolean，版面就緒前若有異動，於初始化後補存本機儲存。
activeExplorerTab()：無輸入；WorkspaceLeaf | null，取得最近使用的編輯區分頁。
tabState()：無輸入；ExplorerTabState | undefined，取得當前分頁狀態。
rememberTabState(state: ExplorerTabState，瀏覽狀態；leaf: WorkspaceLeaf | null，目標分頁)：void，寫入此裝置 Vault 的分頁狀態。
initializeTabStates()：無輸入；void，版面就緒後載入仍存在的分頁，並依選項處理啟動分頁。
persistTabStates()：無輸入；void，寫入本機儲存。
remapTabStates(oldPath: string，原路徑；newPath: string | null，新路徑或刪除)：void，同步儲存的資料夾路徑。

onload()：輸入無；Promise<void>，載入設定、註冊入口與改名刪除同步；讀取失敗由宿主回報。
savePreferences()：輸入無；void，重繪並排隊存檔；失敗通知，可再次操作重試。
refreshViews()：輸入無；void，通知所有 FlatExplorer 面板更新。
activateView()：輸入無；Promise<void>，先載入 FlatExplorer，再重用或新建獨立面板，透過 revealLeaf 顯示桌面側欄或手機抽屜；宿主錯誤向外傳遞。

*/
export default class FlatExplorerPlugin extends Plugin {

	preferences: ExplorerPreferences = parsePreferences(null);
	private saveQueue: Promise<void> = Promise.resolve();
	private tabStates = new Map<string, ExplorerTabState>();
	private tabStatesReady = false;
	private pendingTabPersist = false;

	async onload(): Promise<void> {
		// 步驟 1：先還原顯示偏好，避免重啟時暫時顯示已隱藏項目。
		this.preferences = parsePreferences(await this.loadData());

		// 步驟 2：註冊面板、預覽來源與入口，清理由宿主生命週期管理。
		this.registerView(VIEW_TYPE, (leaf) => new FlatExplorerView(leaf, this));
		this.addSettingTab(new FlatExplorerSettings(this));
		this.app.workspace.onLayoutReady(() => {
			this.initializeTabStates();
			this.refreshViews();
		});
		this.registerHoverLinkSource(VIEW_TYPE, { display: "FlatExplorer", defaultMod: true });
		this.addRibbonIcon("folder-open", "開啟 FlatExplorer", () => this.activateView());
		this.addCommand({ id: "open-flat-explorer", name: "開啟檔案瀏覽器", callback: () => this.activateView() });
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			this.remapTabStates(oldPath, file.path);
			this.preferences.pinned = remapPaths(this.preferences.pinned, oldPath, file.path);
			this.preferences.hidden = remapPaths(this.preferences.hidden, oldPath, file.path);
			this.preferences.manualOrder = remapPaths(this.preferences.manualOrder, oldPath, file.path);
			this.savePreferences();
		}));
		this.registerEvent(this.app.vault.on("delete", (file) => {
			this.remapTabStates(file.path, null);
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

	activeExplorerTab(): WorkspaceLeaf | null {
		// 最近的編輯區分頁不會因使用者點擊側欄而被替換。
		return this.app.workspace.getMostRecentLeaf();
	}

	tabState(): ExplorerTabState | undefined {
		return this.tabStates.get(tabId(this.activeExplorerTab()) ?? FALLBACK_TAB_ID);
	}

	rememberTabState(state: ExplorerTabState, leaf = this.activeExplorerTab()): void {
		const id = tabId(leaf) ?? FALLBACK_TAB_ID;
		this.tabStates.set(id, state);
		if (this.tabStatesReady)
			this.persistTabStates();
		else
			this.pendingTabPersist = true;
	}

	private initializeTabStates(): void {
		if (this.tabStatesReady)
			return;

		// 只讀取仍存在於此裝置版面的分頁與預設鍵，不依賴檔名識別。
		const saved: unknown = typeof this.app.loadLocalStorage === "function" ? this.app.loadLocalStorage(TAB_STORAGE_KEY) : null;
		const leafIds: string[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			const id = tabId(leaf);
			if (id)
				leafIds.push(id);
		});

		this.tabStates = restoreTabStates(saved, leafIds, tabId(this.activeExplorerTab()), this.preferences.resetTabOnStartup, this.tabStates);
		this.tabStatesReady = true;
		if (this.pendingTabPersist) {
			this.pendingTabPersist = false;
			this.persistTabStates();
		}
	}

	private persistTabStates(): void {
		// 分頁識別隸屬本機工作區，與跨裝置同步的套件設定分開保存。
		if (typeof this.app.saveLocalStorage === "function")
			this.app.saveLocalStorage(TAB_STORAGE_KEY, Object.fromEntries(this.tabStates));
	}

	private remapTabStates(oldPath: string, newPath: string | null): void {
		const { states, changed } = remapTabStateMap(this.tabStates, oldPath, newPath);
		if (!changed)
			return;

		this.tabStates = states;
		if (this.tabStatesReady)
			this.persistTabStates();
		else
			this.pendingTabPersist = true;
	}

	async activateView(): Promise<void> {
		// 重用現有面板，避免每次開啟都新增側欄。
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (!leaf) {
			leaf = this.app.workspace.getLeftLeaf(false) ?? undefined;
			if (!leaf)
				return;

			await leaf.setViewState({ type: VIEW_TYPE, active: false });
		}

		// 原生 revealLeaf 會先展開行動抽屜。先完成延遲載入與繪製再顯示。
		if (typeof leaf.loadIfDeferred === "function")
			await leaf.loadIfDeferred();

		await this.app.workspace.revealLeaf(leaf);
	}
}

// 宿主將分頁 id 寫入工作區版面，重啟後保留；舊宿主缺少 id 時跳過保存。
function tabId(leaf: WorkspaceLeaf | null): string | undefined {
	const id = (leaf as (WorkspaceLeaf & { id?: unknown }) | null)?.id;
	return typeof id === "string" ? id : undefined;
}

/*
FlatExplorerSettings：顯示並保存 FlatExplorer 的啟動偏好。

plugin: FlatExplorerPlugin，讀取與保存設定。
constructor(plugin: FlatExplorerPlugin，設定持有者)：建立 Obsidian 設定頁。
display()：無輸入；void，繪製啟動還原開關。

*/
class FlatExplorerSettings extends PluginSettingTab {
	constructor(private readonly plugin: FlatExplorerPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		// 使用宿主設定元件，沿用桌面與行動端的開關樣式。
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("啟動時還原當前分頁")
			.setDesc("重新開啟 Obsidian 時，還原當前分頁的 FlatExplorer 目錄與顯示狀態。預設開啟；關閉此選項時從根目錄開始。")
			.addToggle((toggle) => toggle.setValue(!this.plugin.preferences.resetTabOnStartup).onChange((value) => {
				this.plugin.preferences.resetTabOnStartup = !value;
				this.plugin.savePreferences();
			}));
	}
}
