import { Component } from "obsidian";

/*
TouchContextMenu：以 Pointer Events 補上空白區長按選單，物件長按不視為右鍵。

root: HTMLElement，觸控範圍，事件由 Component 卸載時清理。
timer: number | null，尚未完成的長按計時器。
target: Element | null，開始長按的原始元素；移除後不得觸發選單。
pointerId: number | null，追蹤單一主要觸點，多指操作取消長按。
startX: number，按下時的 clientX，單位 CSS px。
startY: number，按下時的 clientY，單位 CSS px。
suppressUntil: number，避免放開手指後誤觸點擊或重複原生選單的時間界線，單位毫秒。
dispatching: boolean，區分自行產生與系統產生的 contextmenu。
objectPointerId: number | null，物件觸控來源，只抑制該次長按的原生右鍵，不影響正常點擊。
objectContextUntil: number，物件觸控結束後的系統右鍵抑制期限，單位毫秒。

constructor(root: HTMLElement，觸控範圍)：註冊長按、捲動取消及事件去重。
start(event: PointerEvent，按下事件)：void，空白區主要 touch／pen 停留 550ms 後送出 contextmenu；物件只記錄右鍵抑制，操作按鈕與輸入欄除外。
cancel()：無輸入；void，清理計時器與觸點，不清除放開手指後的點擊抑制。
onunload()：無輸入；void，清理尚未完成的手勢。

*/
export class TouchContextMenu extends Component {

	private readonly root: HTMLElement;
	private timer: number | null = null;
	private target: Element | null = null;
	private pointerId: number | null = null;
	private startX = 0;
	private startY = 0;
	private suppressUntil = 0;
	private dispatching = false;
	private objectPointerId: number | null = null;
	private objectContextUntil = 0;

	constructor(root: HTMLElement) {
		super();
		this.root = root;

		// 只觀察手勢，不 preventDefault pointerdown，讓垂直捲動維持原生行為。
		this.registerDomEvent(root, "pointerdown", (event) => this.start(event));
		this.registerDomEvent(root, "pointermove", (event) => {
			if (event.pointerId === this.pointerId && Math.hypot(event.clientX - this.startX, event.clientY - this.startY) > 10)
				this.cancel();
		});
		this.registerDomEvent(root.doc, "pointerup", (event) => {
			if (event.pointerId === this.objectPointerId) {
				this.objectPointerId = null;
				this.objectContextUntil = Date.now() + 800;
			}

			if (event.pointerId === this.pointerId)
				this.cancel();
		});
		this.registerDomEvent(root.doc, "pointercancel", (event) => {
			if (event.pointerId === this.objectPointerId) {
				this.objectPointerId = null;
				this.objectContextUntil = Date.now() + 800;
			}

			this.cancel();
		});
		this.registerDomEvent(root, "scroll", () => this.cancel(), { capture: true });
		this.registerDomEvent(root, "click", (event) => {
			if (Date.now() < this.suppressUntil) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		}, { capture: true });
		this.registerDomEvent(root, "contextmenu", (event) => {
			if (event.target instanceof Element && event.target.closest(".flat-explorer-row") && (this.objectPointerId !== null || Date.now() < this.objectContextUntil)) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}

			if (this.dispatching)
				return;

			this.cancel();
			if (Date.now() < this.suppressUntil) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}

			this.suppressUntil = Date.now() + 800;
		}, { capture: true });
	}

	private start(event: PointerEvent): void {
		this.cancel();
		if (event.pointerType === "mouse") {
			this.objectPointerId = null;
			this.objectContextUntil = 0;
		}

		if (!event.isPrimary || !["touch", "pen"].includes(event.pointerType) || !(event.target instanceof Element))
			return;

		if (event.target.closest("input, textarea, .clickable-icon"))
			return;

		if (event.target.closest(".flat-explorer-row")) {
			this.objectPointerId = event.pointerId;
			return;
		}

		this.target = event.target;
		this.pointerId = event.pointerId;
		this.startX = event.clientX;
		this.startY = event.clientY;
		this.timer = this.root.win.setTimeout(() => {
			const target = this.target;
			this.timer = null;
			if (!target?.isConnected)
				return;

			this.suppressUntil = Date.now() + 800;
			this.dispatching = true;
			try {
				target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: this.startX, clientY: this.startY }));
			}
			finally {
				this.dispatching = false;
			}
		}, 550);
	}

	cancel(): void {
		if (this.timer !== null)
			this.root.win.clearTimeout(this.timer);

		this.timer = null;
		this.target = null;
		this.pointerId = null;
	}

	onunload(): void {
		this.cancel();
		this.objectPointerId = null;
		this.objectContextUntil = 0;
	}
}
