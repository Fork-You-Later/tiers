/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enableBadgesOnImage, getBadgesForImage, restoreBadgesOnImage } from '../src/badges.js';

function makeImg() {
	const img = document.createElement('img');
	img.src = 'test.png';
	const item = document.createElement('span');
	item.className = 'item';
	item.appendChild(img);
	document.body.appendChild(item);
	return img;
}

describe('badges.js unit tests', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should return empty badges for a freshly enabled image', () => {
		const img = makeImg();
		enableBadgesOnImage(img);
		expect(getBadgesForImage(img)).toEqual([]);
	});

	it('should restore badges from an array and reflect in getBadgesForImage', () => {
		const img = makeImg();
		enableBadgesOnImage(img);
		restoreBadgesOnImage(img, ['peak', 'goat']);
		const badges = getBadgesForImage(img);
		expect(badges).toContain('peak');
		expect(badges).toContain('goat');
		expect(badges.length).toBe(2);
	});

	it('should render badge overlay on the parent .item span after restore', () => {
		const img = makeImg();
		enableBadgesOnImage(img);
		restoreBadgesOnImage(img, ['peak']);

		const item = img.closest('.item');
		const overlay = item.querySelector('.card-badges-overlay');
		expect(overlay).not.toBeNull();
		expect(overlay.querySelector('.card-badge')).not.toBeNull();
	});

	it('should handle empty badge array (no overlay rendered)', () => {
		const img = makeImg();
		enableBadgesOnImage(img);
		restoreBadgesOnImage(img, []);

		const item = img.closest('.item');
		const overlay = item.querySelector('.card-badges-overlay');
		expect(overlay).toBeNull();
	});

	it('should clear existing overlay when badges are restored as empty', () => {
		const img = makeImg();
		enableBadgesOnImage(img);
		restoreBadgesOnImage(img, ['overrated']);

		// Now clear
		restoreBadgesOnImage(img, []);
		const item = img.closest('.item');
		expect(item.querySelector('.card-badges-overlay')).toBeNull();
	});
});
