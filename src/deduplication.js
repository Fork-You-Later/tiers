'use strict';

const seenHashes = new Set();
const imgHashMap = new WeakMap();

/**
 * Fast fallback: FNV-1a 32-bit hash over ArrayBuffer bytes.
 */
function fnv1aHash(buffer) {
	const bytes = new Uint8Array(buffer);
	let hash = 2166136261;
	for (let i = 0; i < bytes.length; i++) {
		hash ^= bytes[i];
		hash = (hash * 16777619) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}

/**
 * Computes a hash of a Blob.
 */
export async function computeHash(blob) {
	if (!(blob instanceof Blob)) return null;
	const buffer = await blob.arrayBuffer();
	if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
		try {
			const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
			return Array.from(new Uint8Array(hashBuffer))
				.map(b => b.toString(16).padStart(2, '0'))
				.join('');
		} catch {
			// Fallback
		}
	}
	return 'fnv:' + fnv1aHash(buffer);
}

/**
 * Checks if a Blob is a duplicate.
 */
export async function isDuplicate(blob) {
	if (!(blob instanceof Blob)) return false;
	try {
		const hash = await computeHash(blob);
		if (!hash) return false;
		if (seenHashes.has(hash)) return true;
		seenHashes.add(hash);
		return false;
	} catch {
		return false;
	}
}

/**
 * Associates an img element with its hash for deletion tracking.
 */
export function registerImageHash(img, hash) {
	if (img && hash) {
		imgHashMap.set(img, hash);
	}
}

/**
 * Untracks an image's hash when it is deleted from the tierlist.
 */
export function untrackImage(img) {
	if (!img) return;
	const hash = imgHashMap.get(img) || img.dataset.imageHash;
	if (hash) {
		seenHashes.delete(hash);
		imgHashMap.delete(img);
		delete img.dataset.imageHash;
	}
}

/**
 * Clears all tracked hashes.
 */
export function clearHashes() {
	seenHashes.clear();
}

/**
 * Returns total tracked hashes count.
 */
export function hashCount() {
	return seenHashes.size;
}
