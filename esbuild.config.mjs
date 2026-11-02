import * as esbuild from "esbuild";

const production = process.argv[2] === "production";

/* 設定：entryPoints 為入口；bundle 合併程式；external 保留宿主提供的 API；
format 為 CommonJS；target 為執行環境；outfile 為載入檔；sourcemap 協助開發除錯。 */
const options = {
	entryPoints: ["src/FlatExplorerPlugin.ts"],
	bundle: true,
	external: ["obsidian"],
	format: "cjs",
	target: "es2021",
	outfile: "main.js",
	sourcemap: production ? false : "inline"
};

// 將建置交給 esbuild；開發模式持續監看來源檔案。
if (production) {
	await esbuild.build(options);
}
else {
	const context = await esbuild.context(options);
	await context.watch();
}
