/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isDuplicate, clearHashes, hashCount } from '../src/deduplication.js';

describe('deduplication.js unit tests', () => {
	beforeEach(() => {
		clearHashes();
	});

	it('should return false for the first time a blob is seen', async () => {
		const blob = new Blob(['test image data'], { type: 'image/png' });
		expect(await isDuplicate(blob)).toBe(false);
	});

	it('should return true for an identical blob seen twice', async () => {
		const data = 'identical image content';
		const blob1 = new Blob([data], { type: 'image/png' });
		const blob2 = new Blob([data], { type: 'image/png' });

		expect(await isDuplicate(blob1)).toBe(false);
		expect(await isDuplicate(blob2)).toBe(true);
	});

	it('should return false for two different blobs', async () => {
		const blob1 = new Blob(['image-data-A'], { type: 'image/png' });
		const blob2 = new Blob(['image-data-B'], { type: 'image/png' });

		expect(await isDuplicate(blob1)).toBe(false);
		expect(await isDuplicate(blob2)).toBe(false);
	});

	it('should track hash count correctly', async () => {
		clearHashes();
		expect(hashCount()).toBe(0);

		await isDuplicate(new Blob(['aaa']));
		await isDuplicate(new Blob(['bbb']));
		await isDuplicate(new Blob(['aaa'])); // duplicate, should not add

		expect(hashCount()).toBe(2);
	});

	it('clearHashes should reset the seen set', async () => {
		const data = 'reset test';
		const blob = new Blob([data]);

		await isDuplicate(blob);
		expect(hashCount()).toBe(1);

		clearHashes();
		expect(hashCount()).toBe(0);

		// Should be accepted again after clear
		expect(await isDuplicate(blob)).toBe(false);
	});

	it('should return false for non-Blob input', async () => {
		expect(await isDuplicate(null)).toBe(false);
		expect(await isDuplicate('not a blob')).toBe(false);
		expect(await isDuplicate(undefined)).toBe(false);
	});
});
