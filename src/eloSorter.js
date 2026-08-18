'use strict';

import { ELO_DEFAULT_RATING, ELO_K_FACTOR, TIER_COLORS, DEFAULT_TIERS } from './constants.js';

function expectedScore(ratingA, ratingB) {
	return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function updateElo(winnerRating, loserRating) {
	const expWinner = expectedScore(winnerRating, loserRating);
	const expLoser = expectedScore(loserRating, winnerRating);
	return {
		winner: Math.round(winnerRating + ELO_K_FACTOR * (1 - expWinner)),
		loser: Math.round(loserRating + ELO_K_FACTOR * (0 - expLoser)),
	};
}

export { updateElo, expectedScore };

export class EloSorter {
	constructor(tierlistManager) {
		this.tierlistManager = tierlistManager;
		this.ratings = new Map(); // img -> rating
		this.queue = [];         // pairs of imgs to compare
		this.matchCount = 0;
		this.totalMatches = 0;
		this._modal = null;
		this._keyHandler = null;
		this._active = false;
	}

	_getModal() {
		if (!this._modal) this._modal = document.getElementById('elo-modal');
		return this._modal;
	}

	start() {
		const images = Array.from(document.querySelectorAll('.images img.draggable'));
		if (images.length < 2) {
			import('./utils.js').then(({ showToast }) => {
				showToast('⚔️ Need at least 2 images in the pool for Elo mode!');
			});
			return;
		}

		this._active = true;
		this.ratings.clear();
		this.queue = [];
		this.matchCount = 0;

		// Initialize ratings
		images.forEach(img => this.ratings.set(img, ELO_DEFAULT_RATING));

		// Build pairs: each image faces each other once (round-robin)
		for (let i = 0; i < images.length; i++) {
			for (let j = i + 1; j < images.length; j++) {
				this.queue.push([images[i], images[j]]);
			}
		}

		// Shuffle for variety
		this.queue.sort(() => Math.random() - 0.5);
		this.totalMatches = this.queue.length;

		const modal = this._getModal();
		if (!modal) return;
		modal.classList.remove('hidden');

		this._keyHandler = (e) => {
			if (!this._active) return;
			if (e.key === 'ArrowLeft') this._vote('left');
			if (e.key === 'ArrowRight') this._vote('right');
			if (e.key === 'Escape') this.finish();
		};
		document.addEventListener('keydown', this._keyHandler);

		// Button listeners
		const leftBtn = modal.querySelector('#elo-pick-left');
		const rightBtn = modal.querySelector('#elo-pick-right');
		if (leftBtn) leftBtn.onclick = () => this._vote('left');
		if (rightBtn) rightBtn.onclick = () => this._vote('right');

		const closeBtn = modal.querySelector('#elo-close');
		if (closeBtn) closeBtn.onclick = () => this.finish();

		this._showNext();
	}

	_showNext() {
		const modal = this._getModal();
		if (!modal) return;

		if (this.queue.length === 0) {
			this.finish();
			return;
		}

		const [imgA, imgB] = this.queue[this.queue.length - 1];
		this._currentPair = [imgA, imgB];

		const leftImg = modal.querySelector('#elo-left img');
		const rightImg = modal.querySelector('#elo-right img');
		const leftScore = modal.querySelector('#elo-left .elo-score');
		const rightScore = modal.querySelector('#elo-right .elo-score');
		const progress = modal.querySelector('#elo-progress');

		if (leftImg) leftImg.src = imgA.dataset.animatedSrc || imgA.src;
		if (rightImg) rightImg.src = imgB.dataset.animatedSrc || imgB.src;
		if (leftScore) leftScore.textContent = `⚡ ${this.ratings.get(imgA) ?? ELO_DEFAULT_RATING}`;
		if (rightScore) rightScore.textContent = `⚡ ${this.ratings.get(imgB) ?? ELO_DEFAULT_RATING}`;

		const done = this.totalMatches - this.queue.length;
		if (progress) progress.textContent = `Match ${done + 1} / ${this.totalMatches}`;
	}

	_vote(side) {
		if (!this._active || !this._currentPair) return;
		const [imgA, imgB] = this._currentPair;
		const winner = side === 'left' ? imgA : imgB;
		const loser = side === 'left' ? imgB : imgA;

		const wRating = this.ratings.get(winner) ?? ELO_DEFAULT_RATING;
		const lRating = this.ratings.get(loser) ?? ELO_DEFAULT_RATING;
		const { winner: newW, loser: newL } = updateElo(wRating, lRating);
		this.ratings.set(winner, newW);
		this.ratings.set(loser, newL);

		// Animate winner
		const modal = this._getModal();
		const winnerSide = side === 'left' ? modal.querySelector('#elo-left') : modal.querySelector('#elo-right');
		if (winnerSide) {
			winnerSide.classList.add('elo-winner-flash');
			setTimeout(() => winnerSide.classList.remove('elo-winner-flash'), 400);
		}

		this.queue.pop();
		this.matchCount++;

		setTimeout(() => this._showNext(), 300);
	}

	finish() {
		this._active = false;
		if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);

		const modal = this._getModal();
		if (modal) modal.classList.add('hidden');

		// Sort images by Elo rating descending
		const sorted = Array.from(this.ratings.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([img]) => img);

		if (sorted.length === 0) return;

		// Auto-place into tiers based on percentile bands
		const tiers = Array.from(this.tierlistManager.tierlistDiv.querySelectorAll('.row'));
		if (tiers.length === 0) return;

		const bandsCount = tiers.length;
		const chunkSize = Math.ceil(sorted.length / bandsCount);

		sorted.forEach((img, i) => {
			const tierIdx = Math.min(Math.floor(i / chunkSize), bandsCount - 1);
			const targetRow = tiers[tierIdx];
			const itemsContainer = targetRow.querySelector('.items');
			if (!itemsContainer) return;

			// Remove from current parent
			const parent = img.parentNode;
			if (parent) parent.removeChild(img);

			const td = document.createElement('span');
			td.classList.add('item');
			td.appendChild(img);
			itemsContainer.appendChild(td);
		});

		import('./utils.js').then(({ showToast }) => {
			showToast(`⚔️ Elo complete! ${this.matchCount} battles sorted ${sorted.length} images.`);
		});
	}
}
