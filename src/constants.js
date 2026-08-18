'use strict';

export const MAX_NAME_LEN = 200;
export const DEFAULT_TIERS = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
export const TIER_COLORS = [
	'#c0392b', // S — deep crimson
	'#d35400', // A — burnt amber
	'#b8860b', // B — dark gold
	'#1e8449', // C — forest green
	'#148f9a', // D — deep teal
	'#5b4cce', // E — indigo
	'#a83278', // F — magenta-wine
];

export const LAYOUT_HORIZONTAL = 0;
export const LAYOUT_VERTICAL = 1;

// Budget Mode defaults
export const DEFAULT_BUDGET = 15;
export const DEFAULT_TIER_COSTS = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0, F: -1 };

// Elo defaults
export const ELO_DEFAULT_RATING = 1000;
export const ELO_K_FACTOR = 32;

// Badge definitions
export const BADGES = [
	{ id: 'peak',       label: 'Peak',       emoji: '🔥' },
	{ id: 'overrated',  label: 'Overrated',  emoji: '📉' },
	{ id: 'underrated', label: 'Underrated', emoji: '📈' },
	{ id: 'carried',    label: 'Carried',    emoji: '👑' },
	{ id: 'slept-on',   label: 'Slept On',   emoji: '💤' },
	{ id: 'goat',       label: 'Goat',       emoji: '🐐' },
];
