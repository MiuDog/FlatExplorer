import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const TFolder = function () {};
const bundle = await build({ entryPoints: ["src/touch_drag.ts"], bundle: true, external: ["obsidian"], format: "cjs", write: false });

/* sandbox：module.exports 接收純落點邏輯；require 僅提供 instanceof 所需的資料夾型別。 */
const sandbox = {
	module: { exports: {} },
	require: (name) => {
		assert.equal(name, "obsidian");
		return { TFolder };
	}
};
runInNewContext(bundle.outputFiles[0].text, sandbox);
const { getMovePath, getTouchDropKind } = sandbox.module.exports;

function folder(path, parent = null) {
	// 路徑、名稱、父層及根目錄判斷提供 getMovePath 的最小宿主契約。
	return Object.assign(Object.create(TFolder.prototype), { path, name: path.split("/").at(-1), parent, isRoot: () => path === "/" });
}

test("手動模式依資料夾中央或邊緣決定搬移與排序", () => {
	assert.equal(getTouchDropKind(true, 0.1, true), "before");
	assert.equal(getTouchDropKind(true, 0.5, true), "move");
	assert.equal(getTouchDropKind(true, 0.9, true), "after");
	assert.equal(getTouchDropKind(false, 0.25, true), "before");
	assert.equal(getTouchDropKind(false, 0.75, true), "after");
});

test("自動排序模式僅資料夾可接收搬移", () => {
	assert.equal(getTouchDropKind(true, 0.1, false), "move");
	assert.equal(getTouchDropKind(true, 0.9, false), "move");
	assert.equal(getTouchDropKind(false, 0.5, false), null);
});

test("可搬至子資料夾、父層與根目錄，保留完整檔名", () => {
	const root = folder("/");
	const parent = folder("A", root);
	const current = folder("A/B", parent);
	const child = folder("A/B/C", current);
	/* file 的 path/name/parent 提供來源識別；副檔名包含在 name 中，不另行重建。 */
	const file = { path: "A/B/Note.canvas", name: "Note.canvas", parent: current };
	assert.equal(getMovePath(file, child), "A/B/C/Note.canvas");
	assert.equal(getMovePath(file, parent), "A/Note.canvas");
	assert.equal(getMovePath(file, root), "Note.canvas");
	assert.equal(getMovePath(file, current), null);
});

test("禁止搬移根目錄、資料夾自身或子孫，不誤判同名前綴", () => {
	const root = folder("/");
	const source = folder("A", root);
	const child = folder("A/B", source);
	const descendant = folder("A/B/C", child);
	const sibling = folder("AA", root);
	assert.equal(getMovePath(root, source), null);
	assert.equal(getMovePath(source, source), null);
	assert.equal(getMovePath(source, child), null);
	assert.equal(getMovePath(source, descendant), null);
	assert.equal(getMovePath(source, sibling), "AA/A");
});
