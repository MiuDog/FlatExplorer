import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const TFile = function () {};
const TFolder = function () {};
const bundle = await build({ entryPoints: ["src/tab_state.ts"], bundle: true, external: ["obsidian"], format: "cjs", write: false });

/* sandbox：module.exports 接收純分頁狀態邏輯；require 僅提供 explorer_preferences 所需的宿主型別替身。 */
const sandbox = {
	module: { exports: {} },
	require: (name) => {
		assert.equal(name, "obsidian");
		return { TFile, TFolder };
	}
};
runInNewContext(bundle.outputFiles[0].text, sandbox);
const { FALLBACK_TAB_ID, remapTabStateMap, restoreTabStates } = sandbox.module.exports;

test("預設啟動同時還原目前分頁與背景分頁，並清理已關閉分頁", () => {
	const saved = {
		"tab-active": { folderPath: "Projects/App", showHidden: true },
		"tab-bg": { folderPath: "Notes", showHidden: false },
		"tab-closed": { folderPath: "Archive", showHidden: false }
	};
	const restored = restoreTabStates(saved, ["tab-active", "tab-bg"], "tab-active", false);
	assert.equal(restored.size, 2);
	assert.deepEqual({ ...restored.get("tab-active") }, { folderPath: "Projects/App", showHidden: true });
	assert.deepEqual({ ...restored.get("tab-bg") }, { folderPath: "Notes", showHidden: false });
	assert.equal(restored.has("tab-closed"), false);
});

test("停用啟動還原時只略過目前分頁，仍還原其他背景分頁", () => {
	const saved = {
		"tab-active": { folderPath: "Projects/App", showHidden: true },
		"tab-bg": { folderPath: "Notes", showHidden: true }
	};
	const restored = restoreTabStates(saved, ["tab-active", "tab-bg"], "tab-active", true);
	assert.equal(restored.size, 1);
	assert.equal(restored.has("tab-active"), false);
	assert.deepEqual({ ...restored.get("tab-bg") }, { folderPath: "Notes", showHidden: true });
});

test("無開啟編輯分頁時透過預設鍵保存與還原，重設選項為真時略過", () => {
	const saved = {
		[FALLBACK_TAB_ID]: { folderPath: "Inbox", showHidden: true }
	};
	const restored = restoreTabStates(saved, [], undefined, false);
	assert.deepEqual({ ...restored.get(FALLBACK_TAB_ID) }, { folderPath: "Inbox", showHidden: true });
	const skipped = restoreTabStates(saved, [], undefined, true);
	assert.equal(skipped.has(FALLBACK_TAB_ID), false);
});

test("保留版面就緒前的操作狀態並安全處理無效本機資料", () => {
	const existing = new Map([["tab-active", { folderPath: "JustNavigated", showHidden: false }]]);
	const saved = {
		"tab-active": { folderPath: "StaleFolder", showHidden: true },
		"tab-bad": { folderPath: 123, showHidden: true }
	};
	const restored = restoreTabStates(saved, ["tab-active", "tab-bad"], "tab-active", false, existing);
	assert.deepEqual({ ...restored.get("tab-active") }, { folderPath: "JustNavigated", showHidden: false });
	assert.equal(restored.has("tab-bad"), false);
	assert.equal(restoreTabStates(null, ["tab-active"], "tab-active", false).size, 0);
	assert.equal(restoreTabStates([], ["tab-active"], "tab-active", false).size, 0);
});

test("資料夾改名、搬移與刪除同步更新所有分頁記錄且不誤判同名前綴", () => {
	const states = new Map([
		["a", { folderPath: "A", showHidden: true }],
		["b", { folderPath: "A/Sub", showHidden: false }],
		["c", { folderPath: "AA", showHidden: false }]
	]);
	const renamed = remapTabStateMap(states, "A", "Target/A");
	assert.equal(renamed.changed, true);
	assert.deepEqual({ ...renamed.states.get("a") }, { folderPath: "Target/A", showHidden: true });
	assert.deepEqual({ ...renamed.states.get("b") }, { folderPath: "Target/A/Sub", showHidden: false });
	assert.deepEqual({ ...renamed.states.get("c") }, { folderPath: "AA", showHidden: false });

	const deleted = remapTabStateMap(renamed.states, "Target/A", null);
	assert.equal(deleted.changed, true);
	assert.equal(deleted.states.has("a"), false);
	assert.equal(deleted.states.has("b"), false);
	assert.deepEqual({ ...deleted.states.get("c") }, { folderPath: "AA", showHidden: false });
});
