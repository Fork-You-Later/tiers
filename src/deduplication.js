'use strict';

const seenHashes = new Set();

/**
 * Fast fallback: FNV-1a 32-bit hash over ArrayBuffer bytes.
 * Used when crypto.subtle is unavailable (e.g., in test environments).
 */
function fnv1aHash(buffer) {
	const bytes = new Uint8Array(buffer);
	let hash = 2166136261; // FNV offset basis
	for (let i = 0; i < bytes.length; i++) {
		hash ^= bytes[i];
		hash = (hash * 16777619) >>> 0; // FNV prime, keep as uint32
	}
	return hash.toString(16).padStart(8, '0');
}

/**
 * Computes a SHA-256 hash of a Blob.
 * Falls back to FNV-1a if crypto.subtle is unavailable.
 */
async function computeHash(blob) {
	const buffer = await blob.arrayBuffer();
	if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
		try {
			const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
			return Array.from(new Uint8Array(hashBuffer))
				.map(b => b.toString(16).padStart(2, '0'))
				.join('');
		} catch {
			// Fall through to FNV
		}
	}
	return 'fnv:' + fnv1aHash(buffer);
}

/**
 * Checks if a Blob has been seen before.
 * Returns true if duplicate, false if new (and registers it).
 */
export async function isDuplicate(blob) {
	if (!(blob instanceof Blob)) return false;
	try {
		const hash = await computeHash(blob);
		if (seenHashes.has(hash)) return true;
		seenHashes.add(hash);
		return false;
	} catch {
		return false;
	}
}

/**
 * Clears the seen-hashes set (e.g. on hard reset).
 */
export function clearHashes() {
	seenHashes.clear();
}

/**
 * Returns how many hashes are currently tracked.
 */
export function hashCount() {
	return seenHashes.size;
}
