import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import moment from "moment";

// 替身只提供圖示判斷所需的宿主型別與目錄尾斜線正規化。
const TFile = function () {};
const TFolder = function () {};
const normalizePath = (value) => value === "/" ? "/" : value.replace(/\/+$/, "");
const bundle = await build({ entryPoints: ["src/file_icons.ts"], bundle: true, external: ["obsidian"], format: "cjs", write: false });

/* sandbox：module.exports 接收圖示 API；require 提供宿主型別、日期解析及路徑 API 的測試邊界。 */
const sandbox = {
	module: { exports: {} },
	require: (name) => {
		assert.equal(name, "obsidian");
		return { TFile, TFolder, moment, normalizePath };
	}
};
runInNewContext(bundle.outputFiles[0].text, sandbox);
const { getFileIcon, isDailyNote } = sandbox.module.exports;

function file(path) {
	// path/name/basename/extension 對應 TFile 的辨識欄位，不建立實體筆記。
	const name = path.split("/").at(-1);
	const extension = name.split(".").at(-1);
	return Object.assign(Object.create(TFile.prototype), { path, name, basename: name.slice(0, -extension.length - 1), extension });
}

function dailyHost(folder, format = "YYYY-MM-DD", enabled = true) {
	// 測試每日筆記的 enabled 與 options.folder/format 設定契約。
	return { internalPlugins: { getPluginById: () => ({ enabled, instance: { options: { folder, format } } }) } };
}

test("區分一般筆記、畫布、資料夾及其他附件", () => {
	assert.equal(getFileIcon({}, file("Note.md")), "file-text");
	assert.equal(getFileIcon({}, file("Map.canvas")), "layout-dashboard");
	assert.equal(getFileIcon({}, Object.create(TFolder.prototype)), "folder");
	assert.equal(getFileIcon({}, file("Picture.png")), "image");
	assert.equal(getFileIcon({}, file("Archive.zip")), "file");
});

test("每日筆記須符合設定目錄與有效日期，不誤判其他筆記", () => {
	const app = dailyHost("Daily/");
	assert.equal(getFileIcon(app, file("Daily/2026-11-02.md")), "calendar-days");
	assert.equal(isDailyNote(app, file("Daily/2026-02-30.md")), false);
	assert.equal(isDailyNote(app, file("Other/2026-11-02.md")), false);
	assert.equal(isDailyNote(app, file("DailyExtra/2026-11-02.md")), false);
	assert.equal(isDailyNote(app, file("Daily/Meeting.md")), false);
	assert.equal(isDailyNote(dailyHost("Daily", "YYYY-MM-DD", false), file("Daily/2026-11-02.md")), false);
});

test("每日筆記支援自訂日期子目錄與根目錄", () => {
	assert.equal(isDailyNote(dailyHost("Journal", "YYYY/MM/YYYY-MM-DD"), file("Journal/2026/11/2026-11-02.md")), true);
	assert.equal(isDailyNote(dailyHost(""), file("2026-11-02.md")), true);
	assert.equal(isDailyNote(dailyHost(""), file("Other/2026-11-02.md")), false);
});
