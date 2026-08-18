/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TierlistManager } from '../src/tierlist.js';
import { LAYOUT_HORIZONTAL, LAYOUT_VERTICAL, TIER_COLORS } from '../src/constants.js';

describe('tierlist.js TierlistManager unit tests', () => {
	let tierlistDiv, untieredImages, manager, onUnsavedChange;

	beforeEach(() => {
		document.body.innerHTML = `
			<main class="main-content">
				<div class="tierlist"></div>
				<section class="images"></section>
			</main>
		`;
		tierlistDiv = document.querySelector('.tierlist');
		untieredImages = document.querySelector('.images');
		onUnsavedChange = vi.fn();
		manager = new TierlistManager(tierlistDiv, untieredImages, onUnsavedChange);
	});

	it('should add rows with header labels and buttons correctly', () => {
		const rowS = manager.addRow(0, 'S');
		expect(tierlistDiv.children).toHaveLength(1);
		expect(rowS.querySelector('.header label').innerText).toBe('S');
		expect(rowS.querySelector('.row-buttons')).not.toBeNull();

		const rowA = manager.addRow(1, 'A');
		expect(tierlistDiv.children).toHaveLength(2);
		expect(rowA.querySelector('.header label').innerText).toBe('A');
	});

	it('should recompute header colors for all rows or a single row', () => {
		manager.addRow(0, 'S');
		manager.addRow(1, 'A');
		manager.recomputeHeaderColors();

		const rows = tierlistDiv.querySelectorAll('.row');
		expect(rows[0].querySelector('.header').style.backgroundColor).toBe('rgb(192, 57, 43)');
		expect(rows[1].querySelector('.header').style.backgroundColor).toBe('rgb(211, 84, 0)');
	});

	it('should remove a row and move its images back to untiered pool', () => {
		const row = manager.addRow(0, 'S');
		const itemsContainer = row.querySelector('.items');

		const itemSpan = document.createElement('span');
		itemSpan.classList.add('item');
		const img = document.createElement('img');
		img.src = 'test.png';
		itemSpan.appendChild(img);
		itemsContainer.appendChild(itemSpan);

		expect(itemsContainer.children).toHaveLength(1);

		manager.removeRow(0);

		expect(tierlistDiv.children).toHaveLength(0);
		expect(untieredImages.children).toHaveLength(1);
		expect(untieredImages.children[0].src).toContain('test.png');
	});

	it('should perform hard reset (empty rows and untiered images)', () => {
		manager.addRow(0, 'S');
		const img = document.createElement('img');
		untieredImages.appendChild(img);

		expect(tierlistDiv.children).toHaveLength(1);
		expect(untieredImages.children).toHaveLength(1);

		manager.hardResetList();

		expect(tierlistDiv.children).toHaveLength(0);
		expect(untieredImages.children).toHaveLength(0);
	});

	it('should perform soft reset (return row images to untiered without deleting rows)', () => {
		const row = manager.addRow(0, 'S');
		const itemsContainer = row.querySelector('.items');
		const itemSpan = document.createElement('span');
		itemSpan.classList.add('item');
		const img = document.createElement('img');
		img.src = 'soft.png';
		itemSpan.appendChild(img);
		itemsContainer.appendChild(itemSpan);

		manager.softResetList();

		expect(tierlistDiv.children).toHaveLength(1); // Row remains
		expect(itemsContainer.children).toHaveLength(0); // Items cleared from row
		expect(untieredImages.children).toHaveLength(1); // Moved to untiered
		expect(onUnsavedChange).toHaveBeenCalledWith(true);
	});

	it('should toggle layout between horizontal and vertical', () => {
		const main = document.querySelector('.main-content');
		manager.setLayout(LAYOUT_VERTICAL, main);

		expect(main.classList.contains('vertical')).toBe(true);
		expect(manager.curLayout).toBe(LAYOUT_VERTICAL);

		manager.setLayout(LAYOUT_HORIZONTAL, main);
		expect(main.classList.contains('vertical')).toBe(false);
		expect(manager.curLayout).toBe(LAYOUT_HORIZONTAL);
	});
});
