/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { serialize_tierlist, save_tierlist, load_tierlist } from '../src/serializer.js';

describe('serializer.js unit tests', () => {
	let tierlistDiv, untieredImages, titleLabel;

	beforeEach(() => {
		document.body.innerHTML = `
			<div class="title">
				<label class="title-label">My Cool TierList</label>
			</div>
			<div class="tierlist">
				<div class="row">
					<span class="header" style="background-color: rgb(255, 102, 102);">
						<label>S</label>
						<input class="row-color-picker" value="#ff6666" />
					</span>
					<span class="items">
						<span class="item"><img src="data:image/png;base64,aaa" /></span>
					</span>
				</div>
				<div class="row">
					<span class="header" style="background-color: #f0a731;">
						<label>A</label>
						<input class="row-color-picker" value="#f0a731" />
					</span>
					<span class="items"></span>
				</div>
			</div>
			<section class="images">
				<img src="data:image/png;base64,bbb" />
			</section>
		`;
		tierlistDiv = document.querySelector('.tierlist');
		untieredImages = document.querySelector('.images');
		titleLabel = document.querySelector('.title-label');
	});

	it('should correctly serialize a tierlist DOM structure', () => {
		const serialized = serialize_tierlist(tierlistDiv, untieredImages, titleLabel);

		expect(serialized.title).toBe('My Cool TierList');
		expect(serialized.rows).toHaveLength(2);
		expect(serialized.rows[0].name).toBe('S');
		expect(serialized.rows[0].color).toBe('#ff6666');
		expect(serialized.rows[0].imgs).toEqual(['data:image/png;base64,aaa']);
		expect(serialized.rows[1].name).toBe('A');
		expect(serialized.rows[1].color).toBe('#f0a731');
		expect(serialized.rows[1].imgs).toEqual([]);
		expect(serialized.untiered).toEqual(['data:image/png;base64,bbb']);
	});

	it('should handle load_tierlist to restore title and structure', () => {
		const mockAddRow = vi.fn((idx, name) => {
			const div = document.createElement('div');
			div.classList.add('row');
			div.innerHTML = `
				<span class="header"><label>${name}</label><input class="row-color-picker" /></span>
				<span class="items"></span>
			`;
			return div;
		});

		const mockCreateImg = vi.fn((src) => {
			const img = document.createElement('img');
			img.src = src;
			return img;
		});

		const mockResizeHeaders = vi.fn();
		const mockRecomputeColors = vi.fn();
		const setUnsavedChanges = vi.fn();

		const testData = {
			title: 'Restored Tierlist',
			rows: [
				{ name: 'God Tier', color: '#ff0000', imgs: ['img1.png', 'img2.png'] }
			],
			untiered: ['img3.png']
		};

		const testUntiered = document.createElement('div');

		load_tierlist(
			testData,
			titleLabel,
			mockAddRow,
			mockCreateImg,
			mockResizeHeaders,
			mockRecomputeColors,
			testUntiered,
			setUnsavedChanges
		);

		expect(titleLabel.innerText).toBe('Restored Tierlist');
		expect(mockAddRow).toHaveBeenCalledWith('0', 'God Tier');
		expect(mockCreateImg).toHaveBeenCalledWith('img1.png');
		expect(mockCreateImg).toHaveBeenCalledWith('img2.png');
		expect(mockCreateImg).toHaveBeenCalledWith('img3.png');
		expect(testUntiered.children).toHaveLength(1);
		expect(mockResizeHeaders).toHaveBeenCalled();
		expect(setUnsavedChanges).toHaveBeenCalledWith(false);
	});
});
