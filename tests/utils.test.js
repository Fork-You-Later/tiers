/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { rgb_to_hex, is_url, get_item_index } from '../src/utils.js';

describe('utils.js unit tests', () => {
	describe('rgb_to_hex', () => {
		it('should convert standard RGB values to hex correctly', () => {
			expect(rgb_to_hex(255, 102, 102)).toBe('#ff6666');
			expect(rgb_to_hex(240, 167, 49)).toBe('#f0a731');
			expect(rgb_to_hex(0, 0, 0)).toBe('#000000');
			expect(rgb_to_hex(255, 255, 255)).toBe('#ffffff');
		});

		it('should handle string input for RGB components', () => {
			expect(rgb_to_hex('255', '102', '102')).toBe('#ff6666');
		});
	});

	describe('is_url', () => {
		it('should return true for valid HTTP and HTTPS URLs', () => {
			expect(is_url('https://example.com')).toBe(true);
			expect(is_url('http://localhost:8080/file.json')).toBe(true);
			expect(is_url('https://raw.githubusercontent.com/user/repo/main/data.json')).toBe(true);
		});

		it('should return false for invalid URLs or empty input', () => {
			expect(is_url('not a url')).toBe(false);
			expect(is_url('')).toBe(false);
			expect(is_url(null)).toBe(false);
			expect(is_url(undefined)).toBe(false);
			expect(is_url(123)).toBe(false);
		});
	});

	describe('get_item_index', () => {
		let tierlistDiv, row, itemsContainer, itemSpan, img;

		beforeEach(() => {
			document.body.innerHTML = `
				<div class="tierlist">
					<div class="row">
						<span class="header"></span>
						<span class="items">
							<span class="item"><img id="img1" src="img1.png" /></span>
							<span class="item"><img id="img2" src="img2.png" /></span>
						</span>
					</div>
				</div>
				<div class="toggleable-container">
					<div class="bottom-container">
						<div class="buttons-container">
							<div class="button"><input /></div>
							<div class="button"><input /></div>
							<div class="button"><input /></div>
							<div class="button"><input /></div>
						</div>
						<section class="images">
							<img id="untiered1" src="u1.png" />
						</section>
					</div>
				</div>
			`;
			tierlistDiv = document.querySelector('.tierlist');
		});

		it('should return correct index for an item inside a tier row', () => {
			const img1 = document.getElementById('img1');
			const img2 = document.getElementById('img2');

			expect(get_item_index(img1, tierlistDiv)).toBe(0);
			expect(get_item_index(img2, tierlistDiv)).toBe(1);
		});

		it('should return null for element with no parent structure', () => {
			const detachedImg = document.createElement('img');
			expect(get_item_index(detachedImg, tierlistDiv)).toBeNull();
		});
	});
});
