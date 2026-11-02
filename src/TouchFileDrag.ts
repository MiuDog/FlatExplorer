import { Component } from "obsidian";
import type { TouchDragHandlers } from "./touch_drag";

/*
TouchFileDrag：物件長按拖曳，保留短按與拖曳前的原生垂直捲動。

root: HTMLElement，檔案面板與事件生命週期範圍。
handlers: TouchDragHandlers，開始、預覽與放置的協作者。
timer: number | null，550ms 長按計時器。
frame: number | null，邊緣自動捲動的 animation frame。
pointerId: number | null，主要觸點識別。
row: HTMLElement | null，待啟動的直屬來源列。
startX: number，按下時水平 CSS px。
startY: number，按下時垂直 CSS px。
x: number，目前水平 CSS px。
y: number，目前垂直 CSS px。
dragging: boolean，是否已啟動拖曳。
suppressUntil: number，抑制放開後的誤點；拖曳中為 Infinity。

constructor(root: HTMLElement，面板；handlers: TouchDragHandlers，操作協作者)：註冊 Pointer／Touch Events，不依賴 HTML drag API。
start(event: PointerEvent，主要觸點按下)：void，僅對直屬列建立長按候選，按鈕與輸入欄除外。
move(event: PointerEvent，觸點移動)：void，啟動前移動逾 10px 取消；啟動後更新預覽。
autoScroll()：無輸入；void，靠近內容上下邊緣時每幀捲動並重新計算落點。
finish(cancelled: boolean，是否取消)：void，先清除手勢，再通知協作者，避免重繪時遞迴結束。
cancel()：無輸入；void，取消手勢與預覽。
onunload()：無輸入；void，清理尚未完成的計時器與拖曳。

*/
export class TouchFileDrag extends Component {

	private readonly root: HTMLElement;
	private readonly handlers: TouchDragHandlers;
	private timer: number | null = null;
	private frame: number | null = null;
	private pointerId: number | null = null;
	private row: HTMLElement | null = null;
	private startX = 0;
	private startY = 0;
	private x = 0;
	private y = 0;
	private dragging = false;
	private suppressUntil = 0;

	constructor(root: HTMLElement, handlers: TouchDragHandlers) {
		super();
		this.root = root;
		this.handlers = handlers;

		// 啟動前不阻止預設捲動，啟動後才攔截觸控捲動與釋放點擊。
		this.registerDomEvent(root, "pointerdown", (event) => this.start(event));
		this.registerDomEvent(root.doc, "pointermove", (event) => this.move(event), { passive: false });
		this.registerDomEvent(root.doc, "pointerup", (event) => {
			if (event.pointerId === this.pointerId) {
				if (this.dragging)
					this.handlers.move(event.clientX, event.clientY);

				this.finish(false);
			}
		});
		this.registerDomEvent(root.doc, "pointercancel", () => this.cancel());
		this.registerDomEvent(root, "scroll", () => {
			if (!this.dragging)
				this.cancel();
		}, { capture: true });
		this.registerDomEvent(root, "touchmove", (event) => {
			if (this.dragging) {
				event.preventDefault();
				event.stopPropagation();
			}
		}, { passive: false, capture: true });
		this.registerDomEvent(root, "click", (event) => {
			if (Date.now() < this.suppressUntil) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		}, { capture: true });
	}

	private start(event: PointerEvent): void {
		this.cancel();
		if (!event.isPrimary || !["touch", "pen"].includes(event.pointerType) || !(event.target instanceof Element))
			return;

		if (event.target.closest("input, textarea, .clickable-icon"))
			return;

		const row = event.target.closest<HTMLElement>(".flat-explorer-contents .flat-explorer-row");
		if (!row || !this.root.contains(row))
			return;

		this.row = row;
		this.pointerId = event.pointerId;
		this.startX = this.x = event.clientX;
		this.startY = this.y = event.clientY;
		this.timer = this.root.win.setTimeout(() => {
			this.timer = null;
			if (!this.row?.isConnected) {
				this.cancel();
				return;
			}

			this.suppressUntil = Date.now() + 800;
			this.dragging = this.handlers.start(this.row, this.x, this.y);
			if (this.dragging) {
				this.suppressUntil = Infinity;
				this.root.addClass("flat-explorer-touch-dragging");
				this.autoScroll();
			}
		}, 550);
	}

	private move(event: PointerEvent): void {
		if (event.pointerId !== this.pointerId)
			return;

		this.x = event.clientX;
		this.y = event.clientY;
		if (this.dragging) {
			event.preventDefault();
			this.handlers.move(this.x, this.y);
		}
		else if (Math.hypot(this.x - this.startX, this.y - this.startY) > 10)
			this.cancel();
	}

	private autoScroll(): void {
		if (!this.dragging)
			return;

		// 邊緣捲動讓使用者能拖回路徑區的父層，或拖到長列表的遠端項目。
		const scroller = this.root.querySelector<HTMLElement>(".flat-explorer-sections");
		if (scroller) {
			const rect = scroller.getBoundingClientRect();
			const previous = scroller.scrollTop;
			if (this.y >= rect.top && this.y < rect.top + 36)
				scroller.scrollTop -= 10;
			else if (this.y <= rect.bottom && this.y > rect.bottom - 36)
				scroller.scrollTop += 10;

			if (scroller.scrollTop !== previous)
				this.handlers.move(this.x, this.y);
		}

		this.frame = this.root.win.requestAnimationFrame(() => this.autoScroll());
	}

	private finish(cancelled: boolean): void {
		const wasDragging = this.dragging;
		if (this.timer !== null)
			this.root.win.clearTimeout(this.timer);

		if (this.frame !== null)
			this.root.win.cancelAnimationFrame(this.frame);

		this.timer = null;
		this.frame = null;
		this.pointerId = null;
		this.row = null;
		this.dragging = false;
		this.root.removeClass("flat-explorer-touch-dragging");
		if (wasDragging) {
			this.suppressUntil = Date.now() + 800;
			this.handlers.finish(cancelled);
		}
	}

	cancel(): void {
		this.finish(true);
	}

	onunload(): void {
		this.cancel();
	}
}
