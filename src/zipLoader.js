'use strict';

import { isDuplicate } from './deduplication.js';
import { showToast } from './utils.js';

const IMAGE_EXTENSIONS = /\.(webp|png|jpe?g|gif)$/i;

/**
 * Loads a ZIP file and extracts image entries from it.
 * @param {File} file - The ZIP File object.
 * @param {function(Blob, string): void} onImageReady - Called for each unique image blob.
 * @returns {Promise<{total: number, loaded: number, dupes: number}>}
 */
export async function loadZip(file, onImageReady) {
	// JSZip is loaded globally via importmap CDN
	const JSZip = (await import('jszip')).default;

	let total = 0;
	let loaded = 0;
	let dupes = 0;

	const zip = await JSZip.loadAsync(file);
	const entries = Object.entries(zip.files).filter(
		([name, entry]) => !entry.dir && IMAGE_EXTENSIONS.test(name)
	);

	total = entries.length;

	for (const [name, entry] of entries) {
		const blob = await entry.async('blob');
		const duplicate = await isDuplicate(blob);
		if (duplicate) {
			dupes++;
			continue;
		}
		// Preserve the filename as metadata
		const namedBlob = new File([blob], name.split('/').pop(), { type: blob.type });
		onImageReady(namedBlob, name);
		loaded++;
	}

	if (dupes > 0) {
		showToast(`📦 ZIP loaded — ${loaded} images added, ${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped`);
	} else if (loaded > 0) {
		showToast(`📦 ZIP loaded — ${loaded} image${loaded !== 1 ? 's' : ''} added`);
	} else {
		showToast('📦 ZIP loaded — no new images found');
	}

	return { total, loaded, dupes };
}
