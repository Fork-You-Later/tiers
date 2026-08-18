'use strict';

import { BADGES } from './constants.js';

// Map: imgElement → Set of badge IDs
const cardBadges = new WeakMap();

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
 * Makes an image element trackable for badges.
 */
export function enableBadgesOnImage(imgElem) {
	cardBadges.set(imgElem, new Set());
}

/**
 * Renders an inline UI for badge selection (for mobile/mystery mode).
 */
export function showBadgeUIForCard(imgElem, container) {
	if (!container) return;
	container.innerHTML = '';
	const currentBadges = cardBadges.get(imgElem) || new Set();

	BADGES.forEach(badge => {
		const btn = document.createElement('button');
		btn.className = 'badge-menu-item' + (currentBadges.has(badge.id) ? ' active' : '');
		btn.innerHTML = `<span class="badge-emoji">${badge.emoji}</span> ${badge.label}`;
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			toggleBadge(imgElem, badge.id);
			btn.classList.toggle('active', cardBadges.get(imgElem).has(badge.id));
		});
		container.appendChild(btn);
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
