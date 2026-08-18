'use strict';

let loopEnabled = true;

/**
 * Freezes an animated image to its first frame by painting to a canvas.
 * Stores the original animated src in data-animated-src.
 */
export async function freezeImage(img) {
	if (!img || img.dataset.frozen) return;
	const animatedSrc = img.src;
	img.dataset.animatedSrc = animatedSrc;

	return new Promise((resolve) => {
		const tryFreeze = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth || img.width || 100;
			canvas.height = img.naturalHeight || img.height || 100;
			const ctx = canvas.getContext('2d');
			try {
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				const frozen = canvas.toDataURL('image/png');
				img.src = frozen;
				img.dataset.frozen = 'true';
			} catch {
				// Cross-origin or decode issues — skip silently
			}
			resolve();
		};

		if (img.complete && img.naturalWidth > 0) {
			tryFreeze();
		} else {
			img.addEventListener('load', tryFreeze, { once: true });
		}
	});
}

/**
 * Restores a frozen image to its original animated src.
 */
export function restoreAnimation(img) {
	if (!img || !img.dataset.frozen) return;
	if (img.dataset.animatedSrc) {
		img.src = img.dataset.animatedSrc;
	}
	delete img.dataset.frozen;
	delete img.dataset.animatedSrc;
}

/**
 * Applies the current loop setting to all images in the pool.
 */
export async function applyGlobalLoopSetting(enabled, allImages) {
	loopEnabled = enabled;
	for (const img of allImages) {
		if (!enabled) {
			await freezeImage(img);
		} else {
			restoreAnimation(img);
		}
	}
}

/**
 * Call on a newly added image to apply current global setting immediately.
 */
export async function applyLoopToNewImage(img) {
	if (!loopEnabled) {
		await freezeImage(img);
	}
	// Attach hover-to-preview on frozen images
	img.addEventListener('mouseenter', () => {
		if (!loopEnabled && img.dataset.animatedSrc) {
			img.src = img.dataset.animatedSrc;
		}
	});
	img.addEventListener('mouseleave', () => {
		if (!loopEnabled && img.dataset.frozen !== undefined && img.dataset.animatedSrc) {
			// Re-freeze after hover
			setTimeout(() => {
				if (!loopEnabled) freezeImage(img);
			}, 100);
		}
	});
}

export function isLoopEnabled() {
	return loopEnabled;
}
