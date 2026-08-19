/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragDropManager } from '../src/dragDrop.js';
import { TierlistManager } from '../src/tierlist.js';

describe('dragDrop.js DragDropManager unit tests', () => {
	let tierlistDiv, untieredImages, trashElem, tierlistManager, dragDropManager, onUnsavedChange;

	beforeEach(() => {
		document.body.innerHTML = `
			<div id="floating-trash-container">
				<img id="trash" src="assets/trash_bin.png" />
			</div>
			<main class="main-content">
				<div class="tierlist"></div>
				<section class="images"></section>
			</main>
		`;
		tierlistDiv = document.querySelector('.tierlist');
		untieredImages = document.querySelector('.images');
		trashElem = document.getElementById('floating-trash-container');

		onUnsavedChange = vi.fn();
		tierlistManager = new TierlistManager(tierlistDiv, untieredImages, onUnsavedChange);
		dragDropManager = new DragDropManager(tierlistManager, onUnsavedChange);
	});

	it('should create an draggable image element with proper attributes', () => {
		const img = dragDropManager.createImgWithSrc('test-img.png');

		expect(img.tagName).toBe('IMG');
		expect(img.src).toContain('test-img.png');
		expect(img.classList.contains('draggable')).toBe(true);
		expect(img.draggable).toBe(true);
		expect(img.style.userSelect).toBe('none');
	});

	it('should mark dragged image on dragstart', () => {
		const img = dragDropManager.createImgWithSrc('test-img.png');
		document.body.appendChild(img);

		const dragStartEvt = new Event('dragstart', { bubbles: true });
		dragStartEvt.dataTransfer = { setData: vi.fn() };
		img.dispatchEvent(dragStartEvt);

		expect(dragDropManager.draggedImage).toBe(img);
		expect(img.classList.contains('dragged')).toBe(true);
	});

	it('should reset dragged state on endDrag', () => {
		const img = dragDropManager.createImgWithSrc('test-img.png');
		dragDropManager.draggedImage = img;
		img.classList.add('dragged');

		dragDropManager.endDrag();

		expect(dragDropManager.draggedImage).toBeNull();
		expect(img.classList.contains('dragged')).toBe(false);
	});

	it('should handle trash bin drag and drop events', () => {
		dragDropManager.bindTrashEvents();

		const img = dragDropManager.createImgWithSrc('trash-me.png');
		const itemSpan = document.createElement('span');
		itemSpan.classList.add('item');
		itemSpan.appendChild(img);
		untieredImages.appendChild(itemSpan);

		dragDropManager.draggedImage = img;

		const dropEvt = new Event('drop', { bubbles: true });
		Object.defineProperty(dropEvt, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(dropEvt, 'stopPropagation', { value: vi.fn() });
		trashElem.dispatchEvent(dropEvt);

		expect(onUnsavedChange).toHaveBeenCalledWith(true);
	});
});
