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
		// Unwrap all remaining face-down cards, reveal them
		document.querySelectorAll('.mystery-wrapper').forEach(wrapper => {
			const img = wrapper.querySelector('img.draggable');
			if (img) {
				this.revealedSet.add(img);
				img.draggable = true;
				// Replace wrapper with original img
				wrapper.parentNode.insertBefore(img, wrapper);
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
		img.parentNode.insertBefore(wrapper, img);
		wrapper.appendChild(img);
		img.style.display = 'none';
	}

	async _triggerReveal(img, wrapper) {
		const modal = this._getModal();
		if (!modal) return;

		const revealImg = modal.querySelector('#mystery-reveal-img');
		if (revealImg) revealImg.src = img.dataset.animatedSrc || img.src;

		// Show modal
		modal.classList.remove('hidden');
		modal.classList.add('mystery-active');

		const inner = modal.querySelector('.mystery-card-inner');
		const shockwave = modal.querySelector('#mystery-shockwave');

		// Step 1: flip animation
		if (inner) {
			inner.classList.remove('flipped');
			// Force reflow
			void inner.offsetWidth;
			inner.classList.add('flipped');
		}

		// Step 2: shockwave after flip starts
		await this._delay(350);
		if (shockwave) {
			shockwave.classList.remove('shockwave-burst');
			void shockwave.offsetWidth;
			shockwave.classList.add('shockwave-burst');
		}

		// Step 3: Wait for user to click modal to dismiss
		await new Promise(resolve => {
			this._pendingResolve = resolve;
			modal.addEventListener('click', resolve, { once: true });
		});

		modal.classList.remove('mystery-active');
		modal.classList.add('hidden');
		if (inner) inner.classList.remove('flipped');

		// Reveal the actual image in the pool
		this.revealedSet.add(img);
		img.style.display = '';
		img.draggable = true;

		const faceDown = wrapper.querySelector('.mystery-face-down');
		if (faceDown) faceDown.remove();

		// Unwrap: move img out of wrapper
		wrapper.parentNode.insertBefore(img, wrapper);
		wrapper.remove();

		this.onRevealComplete(img);
	}

	_delay(ms) {
		return new Promise(r => setTimeout(r, ms));
	}

	isRevealed(img) {
		return this.revealedSet.has(img);
	}
}
