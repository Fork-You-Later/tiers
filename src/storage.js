'use strict';

const STORAGE_KEY = 'tiermaker_autosave_v1';

/**
 * Saves current tierlist data object to localStorage.
 */
export function saveToStorage(data) {
	if (typeof window === 'undefined' || !window.localStorage) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch (e) {
		console.warn('Failed to save tierlist to localStorage:', e);
	}
}

/**
 * Loads cached tierlist data object from localStorage.
 */
export function loadFromStorage() {
	if (typeof window === 'undefined' || !window.localStorage) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (e) {
		console.warn('Failed to load tierlist from localStorage:', e);
		return null;
	}
}

/**
 * Clears auto-saved tierlist from localStorage.
 */
export function clearStorage() {
	if (typeof window === 'undefined' || !window.localStorage) return;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.warn('Failed to clear localStorage:', e);
	}
}
