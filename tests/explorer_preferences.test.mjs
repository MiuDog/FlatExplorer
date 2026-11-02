import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

// 宿主型別僅需要 instanceof；偏好演算法不依賴 Vault 或 DOM。
const TFile = function () {};
const TFolder = function () {};
const bundle = await build({ entryPoints: ["src/explorer_preferences.ts"], bundle: true, external: ["obsidian"], format: "cjs", write: false });

/* sandbox：module.exports 接收編譯後 API；require 僅注入宿主型別替身，其他依賴一律拒絕。 */
const sandbox = {
	module: { exports: {} },
	require: (name) => {
		assert.equal(name, "obsidian");
		return { TFile, TFolder };
	}
};
runInNewContext(bundle.outputFiles[0].text, sandbox);
const { compareEntries, parsePreferences, remapPaths, reorderPaths } = sandbox.module.exports;

function file(path, mtime = 0, ctime = mtime) {
	// 檔案替身的 path/name/basename 提供顯示識別，stat.mtime/ctime 提供時間排序。
	const name = path.split("/").at(-1);
	return Object.assign(Object.create(TFile.prototype), { path, name, basename: name.replace(/\.[^.]+$/, ""), stat: { mtime, ctime } });
}

test("置頂檔案先於資料夾，取消置頂後恢復原排序", () => {
	// 資料夾替身只需要 path/name；其型別提供資料夾優先分組。
	const folder = Object.assign(Object.create(TFolder.prototype), { path: "A", name: "A" });
	const items = [file("B10.md"), file("Z.md"), folder, file("B2.md")];
	const preferences = parsePreferences({ pinned: ["Z.md"], sortOrder: "alphabetical" });
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["Z.md", "A", "B2.md", "B10.md"]);
	preferences.pinned = [];
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["A", "B2.md", "B10.md", "Z.md"]);
});

test("置頂群組與一般群組皆跟隨六種排序", () => {
	const items = [file("A.md", 10, 40), file("B.md", 30, 20), file("C.md", 20, 30)];
	/* 每個排序代碼對應預期檔名順序，時間與名稱採不同順序以偵測錯用欄位。 */
	const expected = {
		alphabetical: ["A.md", "B.md", "C.md"],
		alphabeticalReverse: ["C.md", "B.md", "A.md"],
		byModifiedTime: ["B.md", "C.md", "A.md"],
		byModifiedTimeReverse: ["A.md", "C.md", "B.md"],
		byCreatedTime: ["A.md", "C.md", "B.md"],
		byCreatedTimeReverse: ["B.md", "C.md", "A.md"]
	};
	for (const [sortOrder, order] of Object.entries(expected)) {
		for (const pinned of [[], items.map((item) => item.path)]) {
			const preferences = parsePreferences({ sortOrder, pinned });
			assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), order);
		}
	}
});

test("資料夾改名與刪除只影響真正後代", () => {
	const paths = ["A", "A/B.md", "A/B/C.md", "AA/B.md"];
	assert.deepEqual(Array.from(remapPaths(paths, "A", "New")), ["New", "New/B.md", "New/B/C.md", "AA/B.md"]);
	assert.deepEqual(Array.from(remapPaths(paths, "A", null)), ["AA/B.md"]);
});

test("無效儲存資料有預設值且路徑去重", () => {
	const preferences = parsePreferences({ pinned: ["A.md", 4, "A.md"], hidden: false, sortOrder: "toString" });
	assert.deepEqual(Array.from(preferences.pinned), ["A.md"]);
	assert.deepEqual(Array.from(preferences.hidden), []);
	assert.equal(preferences.sortOrder, "native");
	assert.equal(parsePreferences(null).sortOrder, "native");
	assert.deepEqual(Array.from(parsePreferences({ manualOrder: ["A", null, "A"] }).manualOrder), ["A"]);
});

test("手動排序可混排資料夾與檔案，置頂仍優先且新項目排在最後", () => {
	// folder 的 path/name 提供資料夾身分與名稱，其他項目為檔案替身。
	const folder = Object.assign(Object.create(TFolder.prototype), { path: "Folder", name: "Folder" });
	const items = [folder, file("A.md"), file("B.md"), file("New.md"), file("Pinned.md")];
	const preferences = parsePreferences({ sortOrder: "manual", manualOrder: ["B.md", "Folder", "A.md"], pinned: ["Pinned.md"] });
	assert.deepEqual(items.sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["Pinned.md", "B.md", "Folder", "A.md", "New.md"]);
});

test("拖曳可向上或向下插入，保留隱藏項且不修改原陣列", () => {
	const paths = ["A", "Hidden", "B", "C"];
	assert.deepEqual(Array.from(reorderPaths(paths, "A", "C", true)), ["Hidden", "B", "C", "A"]);
	assert.deepEqual(Array.from(reorderPaths(paths, "C", "A", false)), ["C", "A", "Hidden", "B"]);
	assert.deepEqual(Array.from(reorderPaths(paths, "B", "C", false)), paths);
	assert.deepEqual(Array.from(reorderPaths(paths, "External", "A", false)), paths);
	assert.deepEqual(Array.from(reorderPaths(paths, "A", "A", true)), paths);
	assert.deepEqual(paths, ["A", "Hidden", "B", "C"]);
});

test("手動排序切換模式後仍保留，各目錄只使用自身相對順序", () => {
	const preferences = parsePreferences({ sortOrder: "manual", manualOrder: ["Other/B.md", "B.md", "Other/A.md", "A.md"] });
	const items = [file("A.md"), file("B.md")];
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["B.md", "A.md"]);
	preferences.sortOrder = "alphabetical";
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["A.md", "B.md"]);
	preferences.sortOrder = "manual";
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["B.md", "A.md"]);
	assert.deepEqual(Array.from(remapPaths(preferences.manualOrder, "Other", "Renamed")), ["Renamed/B.md", "B.md", "Renamed/A.md", "A.md"]);
});

test("資料夾置頂先於一般項目，手動模式可與置頂筆記混排", () => {
	// 資料夾與檔案共用 pinned 路徑契約，不為資料夾建立另一套排序。
	const folder = Object.assign(Object.create(TFolder.prototype), { path: "ZFolder", name: "ZFolder" });
	const other = Object.assign(Object.create(TFolder.prototype), { path: "AFolder", name: "AFolder" });
	const items = [other, file("A.md"), folder, file("Pinned.md")];
	const preferences = parsePreferences({ pinned: [folder.path, "Pinned.md"], sortOrder: "alphabetical" });
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["ZFolder", "Pinned.md", "AFolder", "A.md"]);
	preferences.sortOrder = "manual";
	preferences.manualOrder = ["Pinned.md", "ZFolder", "A.md", "AFolder"];
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["Pinned.md", "ZFolder", "A.md", "AFolder"]);
	preferences.pinned = [];
	preferences.sortOrder = "alphabetical";
	assert.deepEqual([...items].sort((a, b) => compareEntries(a, b, preferences)).map((item) => item.path), ["AFolder", "ZFolder", "A.md", "Pinned.md"]);
});
