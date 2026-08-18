'use strict';

export class MysteryMode {
	constructor(onRevealComplete) {
		this.enabled = false;
		this.revealedSet = new WeakSet();
		this.onRevealComplete = onRevealComplete || (() => {});
		this._modal = null;
		this._pendingResolve = null;
	}

	_getModal() {
		if (this._modal) return this._modal;
		this._modal = document.getElementById('mystery-modal');
		return this._modal;
	}

	enable() {
		this.enabled = true;
		// Wrap all current pool images
		document.querySelectorAll('.images img.draggable').forEach(img => {
			this._wrapAsMysteryCard(img);
		});
	}

	disable() {
		this.enabled = false;
		// Unwrap all remaining face-down cards and make them visible
		document.querySelectorAll('.mystery-wrapper').forEach(wrapper => {
			const img = wrapper.querySelector('img.draggable');
			if (img) {
				this.revealedSet.add(img);
				img.draggable = true;
				img.style.display = ''; // Restore visibility
				if (wrapper.parentNode) {
					wrapper.parentNode.insertBefore(img, wrapper);
				}
				wrapper.remove();
			}
		});
	}

	/**
	 * Wraps a newly added pool image as a mystery card face-down tile.
	 */
	wrapNewImage(img) {
		if (!this.enabled) return;
		this._wrapAsMysteryCard(img);
	}

	_wrapAsMysteryCard(img) {
		if (!img || this.revealedSet.has(img)) return;
		if (img.closest('.mystery-wrapper')) return;
		if (!img.parentNode) return; // Guard against detached elements

		// Disable dragging while unrevealed
		img.draggable = false;

		const wrapper = document.createElement('div');
		wrapper.className = 'mystery-wrapper';

		// Face-down card
		const faceDown = document.createElement('div');
		faceDown.className = 'mystery-face-down';
		faceDown.innerHTML = `<span class="mystery-question">?</span>`;
		faceDown.title = 'Click to reveal!';

		faceDown.addEventListener('click', () => {
			this._triggerReveal(img, wrapper);
		});

		wrapper.appendChild(faceDown);
		if (img.parentNode) {
			img.parentNode.insertBefore(wrapper, img);
		}
		wrapper.appendChild(img);
		img.style.display = 'none';
	}

	/**
	 * Run the Clash Royale multi-stage reveal animation.
	 * Uses a SINGLE card face element — we swap content mid-animation via JS
	 * (when card is edge-on at ~90°) to avoid CSS backface-visibility bugs in Chromium.
	 */
	async _triggerReveal(img, wrapper) {
		const modal = this._getModal();
		if (!modal) return;

		const cardFace = modal.querySelector('#mystery-card-face');
		const revealImg = modal.querySelector('#mystery-reveal-img');
		const questionMark = modal.querySelector('.mystery-question');
		const inner = modal.querySelector('.mystery-card-inner');
		const shockwave = modal.querySelector('#mystery-shockwave');

		// Pre-load the image source before animation starts
		if (revealImg) revealImg.src = img.dataset.animatedSrc || img.src;

		// Reset card to back state
		if (cardFace) {
			cardFace.classList.remove('mystery-card-face--front');
			cardFace.classList.add('mystery-card-face--back');
		}

		// Show modal
		modal.classList.remove('hidden');
		modal.classList.add('mystery-active');

		// Step 1: Kick off the spin animation
		if (inner) {
			inner.classList.remove('spinning');
			void inner.offsetWidth; // Force reflow to restart animation
			inner.classList.add('spinning');
		}

		// Step 2: At 45% of 2.2s = ~990ms, card is at 720deg (facing forward).
		// This is the PERFECT moment to swap: card has just finished the spin-up stage
		// and is briefly facing front before the wind-up tilt starts.
		// We swap content here — totally invisible because the card immediately tilts away.
		await this._delay(990);
		if (cardFace) {
			cardFace.classList.remove('mystery-card-face--back');
			cardFace.classList.add('mystery-card-face--front');
		}

		// Step 3: Shockwave burst at impact (85% of 2.2s = ~1870ms)
		await this._delay(880); // 990 + 880 = 1870ms total
		if (shockwave) {
			shockwave.classList.remove('shockwave-burst');
			void shockwave.offsetWidth;
			shockwave.classList.add('shockwave-burst');
		}

		// Step 4: Wait for user to click modal to dismiss
		await new Promise(resolve => {
			this._pendingResolve = resolve;
			modal.addEventListener('click', resolve, { once: true });
		});

		modal.classList.remove('mystery-active');
		modal.classList.add('hidden');
		if (inner) inner.classList.remove('spinning');

		// Reset card face back for next use
		if (cardFace) {
			cardFace.classList.remove('mystery-card-face--front');
			cardFace.classList.add('mystery-card-face--back');
		}

		// Reveal the actual image in the pool
		this.revealedSet.add(img);
		img.style.display = '';
		img.draggable = true;

		const faceDown = wrapper.querySelector('.mystery-face-down');
		if (faceDown) faceDown.remove();

		// Unwrap: move img out of wrapper
		if (wrapper.parentNode) {
			wrapper.parentNode.insertBefore(img, wrapper);
			wrapper.remove();
		}

		this.onRevealComplete(img);
	}

	async previewCard(img) {
		if (!img) return;
		const modal = this._getModal();
		if (!modal) return;

		const cardFace = modal.querySelector('#mystery-card-face');
		const revealImg = modal.querySelector('#mystery-reveal-img');
		const inner = modal.querySelector('.mystery-card-inner');
		const shockwave = modal.querySelector('#mystery-shockwave');

		if (revealImg) revealImg.src = img.dataset.animatedSrc || img.src;

		// For preview: card is already revealed — show image immediately (no swap needed)
		if (cardFace) {
			cardFace.classList.remove('mystery-card-face--back');
			cardFace.classList.add('mystery-card-face--front');
		}

		modal.classList.remove('hidden');
		modal.classList.add('mystery-active');

		// Play the short tilt-only animation (no spin-up phase)
		if (inner) {
			inner.classList.remove('spinning', 'previewing');
			void inner.offsetWidth;
			inner.classList.add('previewing');
		}

		// Shockwave fires at 80% of 0.9s = ~720ms (at slam impact point)
		await this._delay(720);
		if (shockwave) {
			shockwave.classList.remove('shockwave-burst');
			void shockwave.offsetWidth;
			shockwave.classList.add('shockwave-burst');
		}

		await new Promise(resolve => {
			modal.addEventListener('click', resolve, { once: true });
		});

		modal.classList.remove('mystery-active');
		modal.classList.add('hidden');
		if (inner) inner.classList.remove('spinning', 'previewing');

		// Reset for next use
		if (cardFace) {
			cardFace.classList.remove('mystery-card-face--front');
			cardFace.classList.add('mystery-card-face--back');
		}
	}

	attachPreviewOnClick(img) {
		if (!img || img.dataset.hasPreviewListener) return;
		img.dataset.hasPreviewListener = 'true';
		img.addEventListener('click', (e) => {
			// Only trigger preview when mystery mode is enabled
			// AND the card is already revealed or is in the tier list
			if (!this.enabled) return;
			if (this.revealedSet.has(img) || img.closest('.tierlist')) {
				this.previewCard(img);
			}
		});
	}

	_delay(ms) {
		return new Promise(r => setTimeout(r, ms));
	}

	isRevealed(img) {
		return this.revealedSet.has(img);
	}
}
