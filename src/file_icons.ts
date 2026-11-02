import { App, moment, normalizePath, TAbstractFile, TFile, TFolder } from "obsidian";

/*
DailyNotesHost：將每日筆記核心設定的內部 API 限定在圖示判斷邊界。

繼承 App 的公開契約。
internalPlugins: 可選的核心外掛管理器；缺少時不猜測每日筆記。
internalPlugins.getPluginById(id: string，核心外掛識別)：回傳可選外掛設定。
回傳值 enabled: boolean，外掛是否啟用；instance.options.folder?: string，儲存目錄；
instance.options.format?: string，Moment 日期格式，省略採 YYYY-MM-DD。

*/
interface DailyNotesHost extends App {
	internalPlugins?: {
		getPluginById(id: string): {
			enabled: boolean;
			instance?: {
				options?: {
					folder?: string;
					format?: string;
				};
			};
		} | undefined;
	};
}

export function isDailyNote(app: App, file: TFile): boolean {
	// 只依啟用中的每日筆記設定判斷，支援日期格式包含子目錄。
	const daily = (app as DailyNotesHost).internalPlugins?.getPluginById("daily-notes");
	if (!daily?.enabled || file.extension !== "md")
		return false;

	const options = daily.instance?.options;
	const folder = normalizePath(options?.folder || "/");
	const prefix = folder === "/" ? "" : `${folder}/`;
	if (!file.path.startsWith(prefix))
		return false;

	const relativeName = file.path.slice(prefix.length, -3);
	const format = options?.format || "YYYY-MM-DD";
	const date = moment(relativeName, format, true);
	return date.isValid() && date.format(format) === relativeName;
}

export function getFileIcon(app: App, file: TAbstractFile): string {
	// 類型圖示與置頂顯示分開，滑過置頂列時能還原這裡判斷的原圖示。
	if (file instanceof TFolder)
		return "folder";

	if (!(file instanceof TFile))
		return "file";

	if (isDailyNote(app, file))
		return "calendar-days";

	const extension = file.extension.toLowerCase();
	if (extension === "canvas")
		return "layout-dashboard";

	if (extension === "md")
		return "file-text";

	if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "avif"].includes(extension))
		return "image";

	if (["mp3", "wav", "ogg", "m4a", "flac"].includes(extension))
		return "file-audio";

	if (["mp4", "webm", "mov", "mkv"].includes(extension))
		return "file-video";

	if (extension === "pdf")
		return "file-type";

	return "file";
}
