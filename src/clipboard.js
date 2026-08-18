'use strict';

import { showToast } from './utils.js';
import { blobToDataURL } from './zipLoader.js';

/**
 * Attempts to read an image blob from the system clipboard.
 * Works on both mobile and desktop browsers via Async Clipboard API.
 * @returns {Promise<Blob|null>}
 */
export async function readImageFromClipboard() {
	if (typeof navigator === 'undefined' || !navigator.clipboard) {
		showToast('⚠️ Clipboard API not supported on this browser');
		return null;
	}

	try {
		// Modern Async Clipboard API
		if (navigator.clipboard.read) {
			const items = await navigator.clipboard.read();
			for (const item of items) {
				const imageType = item.types.find(t => t.startsWith('image/'));
				if (imageType) {
					const blob = await item.getType(imageType);
					return blob;
				}
			}
		}
	} catch (err) {
		// Fallback or permission prompt
		console.warn('Clipboard read error:', err);
	}

	showToast('📋 No image found in clipboard. Copy an image first!');
	return null;
}
