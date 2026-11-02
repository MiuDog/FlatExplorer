import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

// 相容層只依賴宿主介面；替身驗證核心啟用與面板載入是不同狀態。
const bundle = await build({ entryPoints: ["src/native_explorer.ts"], bundle: true, external: ["obsidian"], format: "cjs", write: false });
const sandbox = { module: { exports: {} }, require: () => ({}) };
runInNewContext(bundle.outputFiles[0].text, sandbox);
const { asNativeExplorer, findNativeExplorer, loadNativeExplorer } = sandbox.module.exports;

function host(leaves, enabled = true) {
	// leaves 保存可變面板清單；created 記錄補建次數，active 記錄是否搶焦點。
	const state = { created: 0, active: undefined };
	const app = {
		internalPlugins: { getPluginById: () => ({ enabled }) },
		workspace: {
			getLeavesOfType: () => leaves,
			getLeftLeaf: (split) => {
				assert.equal(split, false);
				state.created++;
				const leaf = { view: {}, setViewState: async (value) => {
					state.active = value.active;
					leaf.view = { onFileContextMenu() {} };
				} };
				leaves.push(leaf);
				return leaf;
			}
		}
	};
	return { app, state };
}

test("hover 方法差異不應停用原生選單", () => {
	const view = { onFileContextMenu() {} };
	assert.equal(asNativeExplorer(view), view);
	assert.equal(asNativeExplorer({}), null);
});

test("掃描所有面板而非只取第一個延遲面板", () => {
	const ready = { onFileContextMenu() {} };
	assert.equal(findNativeExplorer(host([{ view: {} }, { view: ready }]).app), ready);
});

test("已啟用但沒有面板時補建且不搶焦點", async () => {
	const { app, state } = host([]);
	assert.ok(await loadNativeExplorer(app));
	assert.equal(state.created, 1);
	assert.equal(state.active, false);
	await loadNativeExplorer(app);
	assert.equal(state.created, 1);
});

test("既有延遲面板先載入而不重複補建", async () => {
	const ready = { onFileContextMenu() {} };
	const leaf = { view: {}, loadIfDeferred: async () => leaf.view = ready };
	const { app, state } = host([leaf]);
	assert.equal(await loadNativeExplorer(app), ready);
	assert.equal(state.created, 0);
});

test("核心停用時不擅自啟用或建立面板", async () => {
	const { app, state } = host([], false);
	assert.equal(await loadNativeExplorer(app), null);
	assert.equal(state.created, 0);
});


test("已有不相容面板時不持續建立重複頁籤", async () => {
	const { app, state } = host([{ view: {} }]);
	assert.equal(await loadNativeExplorer(app), null);
	assert.equal(state.created, 0);
});
