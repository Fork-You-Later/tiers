'use strict';

import { BADGES } from './constants.js';

// Map: imgElement → Set of badge IDs
const cardBadges = new WeakMap();

let _contextMenu = null;

function getContextMenu() {
	if (_contextMenu) return _contextMenu;
	_contextMenu = document.createElement('div');
	_contextMenu.id = 'badge-context-menu';
	_contextMenu.className = 'badge-context-menu hidden';

	const title = document.createElement('div');
	title.className = 'badge-menu-title';
	title.textContent = 'Add Badge';
	_contextMenu.appendChild(title);

	const list = document.createElement('div');
	list.className = 'badge-menu-list';
	_contextMenu.appendChild(list);

	document.body.appendChild(_contextMenu);

	// Close on outside click
	document.addEventListener('click', (e) => {
		if (!_contextMenu.contains(e.target)) {
			hideContextMenu();
		}
	});

	return _contextMenu;
}

function hideContextMenu() {
	if (_contextMenu) {
		_contextMenu.classList.add('hidden');
		_contextMenu.dataset.targetImg = '';
	}
}

function showContextMenu(x, y, imgElem) {
	const menu = getContextMenu();
	const list = menu.querySelector('.badge-menu-list');
	list.innerHTML = '';

	const currentBadges = cardBadges.get(imgElem) || new Set();

	BADGES.forEach(badge => {
		const btn = document.createElement('button');
		btn.className = 'badge-menu-item' + (currentBadges.has(badge.id) ? ' active' : '');
		btn.innerHTML = `<span class="badge-emoji">${badge.emoji}</span> ${badge.label}`;
		btn.addEventListener('click', () => {
			toggleBadge(imgElem, badge.id);
			hideContextMenu();
		});
		list.appendChild(btn);
	});

	// Remove all badges option
	if (currentBadges.size > 0) {
		const sep = document.createElement('hr');
		sep.className = 'badge-menu-sep';
		list.appendChild(sep);

		const clearBtn = document.createElement('button');
		clearBtn.className = 'badge-menu-item badge-menu-clear';
		clearBtn.textContent = '✕ Clear all badges';
		clearBtn.addEventListener('click', () => {
			clearBadges(imgElem);
			hideContextMenu();
		});
		list.appendChild(clearBtn);
	}

	// Position menu, keeping within viewport
	menu.classList.remove('hidden');
	const menuRect = menu.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	menu.style.left = Math.min(x, vw - menuRect.width - 8) + 'px';
	menu.style.top = Math.min(y, vh - menuRect.height - 8) + 'px';
}

function toggleBadge(imgElem, badgeId) {
	let badges = cardBadges.get(imgElem);
	if (!badges) {
		badges = new Set();
		cardBadges.set(imgElem, badges);
	}
	if (badges.has(badgeId)) {
		badges.delete(badgeId);
	} else {
		badges.add(badgeId);
	}
	renderBadgesOnCard(imgElem);
}

function clearBadges(imgElem) {
	cardBadges.set(imgElem, new Set());
	renderBadgesOnCard(imgElem);
}

function renderBadgesOnCard(imgElem) {
	// Badges are rendered on the parent .item span
	const item = imgElem.closest('.item');
	if (!item) return;

	// Remove existing badge overlay
	const existing = item.querySelector('.card-badges-overlay');
	if (existing) existing.remove();

	const badges = cardBadges.get(imgElem);
	if (!badges || badges.size === 0) return;

	const overlay = document.createElement('div');
	overlay.className = 'card-badges-overlay';

	badges.forEach(badgeId => {
		const def = BADGES.find(b => b.id === badgeId);
		if (!def) return;
		const span = document.createElement('span');
		span.className = 'card-badge';
		span.title = def.label;
		span.textContent = def.emoji;
		overlay.appendChild(span);
	});

	item.appendChild(overlay);
}

/**
 * Makes an image element support badge context menu on right-click.
 */
export function enableBadgesOnImage(imgElem) {
	cardBadges.set(imgElem, new Set());
	imgElem.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showContextMenu(e.clientX, e.clientY, imgElem);
	});

	// Mobile touch device tracking
	let isTouchDevice = false;
	imgElem.addEventListener('touchstart', () => {
		isTouchDevice = true;
	}, { passive: true });

	// On mobile, show badges context menu on simple click instead
	imgElem.addEventListener('click', (e) => {
		if (isTouchDevice) {
			e.preventDefault();
			e.stopPropagation();
			showContextMenu(e.clientX, e.clientY, imgElem);
		}
	});
}

/**
 * Gets badge IDs for an image as an array (for serialization).
 */
export function getBadgesForImage(imgElem) {
	const badges = cardBadges.get(imgElem);
	return badges ? Array.from(badges) : [];
}

/**
 * Restores badges from an array of badge IDs (from JSON import).
 */
export function restoreBadgesOnImage(imgElem, badgeIds = []) {
	const badges = new Set(badgeIds);
	cardBadges.set(imgElem, badges);
	renderBadgesOnCard(imgElem);
}
