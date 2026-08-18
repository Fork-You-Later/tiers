'use strict';

import { isDuplicate, computeHash } from './deduplication.js';
import { showToast } from './utils.js';

const IMAGE_EXTENSIONS = /\.(webp|png|jpe?g|gif)$/i;

/**
 * Converts a Blob to a persistent Base64 Data URL.
 */
export function blobToDataURL(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = (e) => reject(e);
		reader.readAsDataURL(blob);
	});
}

/**
 * Loads a ZIP file and extracts image entries as persistent Data URLs.
 * @param {File} file - The ZIP File object.
 * @param {function(string, string, string): void} onImageReady - Called with (dataUrl, filename, hash).
 * @returns {Promise<{total: number, loaded: number, dupes: number}>}
 */
export async function loadZip(file, onImageReady) {
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
		const hash = await computeHash(blob);
		const dataUrl = await blobToDataURL(blob);
		const filename = name.split('/').pop();
		onImageReady(dataUrl, filename, hash);
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
