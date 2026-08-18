'use strict';

import { untrackImage } from './deduplication.js';
import { showToast } from './utils.js';

export class TrashModalManager {
	constructor(onImagesDeleted) {
		this.onImagesDeleted = onImagesDeleted || (() => {});
		this._modal = null;
		this._selectedSet = new Set();
	}

	_getModal() {
		if (this._modal) return this._modal;
		this._modal = document.getElementById('trash-modal');
		return this._modal;
	}

	open() {
		const modal = this._getModal();
		if (!modal) return;

		// Collect all images in project
		const images = Array.from(document.querySelectorAll('.images img.draggable, .tierlist img.draggable'));

		if (images.length === 0) {
			showToast('🗑️ No images in project to delete!');
			return;
		}

		this._selectedSet.clear();
		modal.classList.remove('hidden');

		this._renderGrid(images);
		this._bindControls(images);
	}

	close() {
		const modal = this._getModal();
		if (modal) modal.classList.add('hidden');
		this._selectedSet.clear();
	}

	_renderGrid(images) {
		const modal = this._getModal();
		const grid = modal.querySelector('.trash-grid');
		if (!grid) return;

		grid.innerHTML = '';

		images.forEach((img, idx) => {
			const tile = document.createElement('div');
			tile.className = 'trash-tile';
			tile.dataset.imgIdx = idx;

			const thumb = document.createElement('img');
			thumb.src = img.dataset.animatedSrc || img.src;

			const check = document.createElement('input');
			check.type = 'checkbox';
			check.className = 'trash-checkbox';

			tile.appendChild(thumb);
			tile.appendChild(check);

			tile.addEventListener('click', (e) => {
				e.stopPropagation();
				const isSelected = this._selectedSet.has(img);
				if (isSelected) {
					this._selectedSet.delete(img);
					tile.classList.remove('selected');
					check.checked = false;
				} else {
					this._selectedSet.add(img);
					tile.classList.add('selected');
					check.checked = true;
				}
				this._updateCountDisplay();
			});

			grid.appendChild(tile);
		});

		this._updateCountDisplay();
	}

	_updateCountDisplay() {
		const modal = this._getModal();
		const countEl = modal.querySelector('#trash-selected-count');
		const deleteBtn = modal.querySelector('#trash-delete-selected-btn');
		const selectAllBtn = modal.querySelector('#trash-select-all-btn');

		const selectedCount = this._selectedSet.size;
		const totalCount = document.querySelectorAll('.images img.draggable, .tierlist img.draggable').length;

		if (countEl) countEl.textContent = `${selectedCount} of ${totalCount} selected`;
		if (deleteBtn) {
			deleteBtn.textContent = `🗑️ Delete Selected (${selectedCount})`;
			deleteBtn.disabled = selectedCount === 0;
		}
		if (selectAllBtn) {
			selectAllBtn.textContent = selectedCount === totalCount && totalCount > 0 ? 'Deselect All' : 'Select All';
		}
	}

	_bindControls(images) {
		const modal = this._getModal();
		const closeBtn = modal.querySelector('#trash-modal-close');
		const selectAllBtn = modal.querySelector('#trash-select-all-btn');
		const deleteSelectedBtn = modal.querySelector('#trash-delete-selected-btn');
		const deleteAllBtn = modal.querySelector('#trash-delete-all-btn');

		if (closeBtn) closeBtn.onclick = () => this.close();

		if (selectAllBtn) {
			selectAllBtn.onclick = () => {
				const currentImages = Array.from(document.querySelectorAll('.images img.draggable, .tierlist img.draggable'));
				if (this._selectedSet.size === currentImages.length) {
					// Deselect all
					this._selectedSet.clear();
				} else {
					// Select all
					currentImages.forEach(img => this._selectedSet.add(img));
				}
				this._renderGrid(currentImages);
			};
		}

		if (deleteSelectedBtn) {
			deleteSelectedBtn.onclick = () => {
				const toDelete = Array.from(this._selectedSet);
				if (toDelete.length === 0) return;

				if (confirm(`Delete ${toDelete.length} selected image${toDelete.length > 1 ? 's' : ''}?`)) {
					this._deleteImages(toDelete);
					this.close();
				}
			};
		}

		if (deleteAllBtn) {
			deleteAllBtn.onclick = () => {
				const allImgs = Array.from(document.querySelectorAll('.images img.draggable, .tierlist img.draggable'));
				if (allImgs.length === 0) return;

				if (confirm(`⚠️ Delete ALL ${allImgs.length} images from the project? This action cannot be undone.`)) {
					this._deleteImages(allImgs);
					this.close();
				}
			};
		}
	}

	_deleteImages(images) {
		let count = 0;
		images.forEach(img => {
			untrackImage(img);
			const parentItem = img.closest('.item');
			if (parentItem) {
				parentItem.remove();
			} else {
				img.remove();
			}
			count++;
		});

		showToast(`🗑️ Deleted ${count} image${count !== 1 ? 's' : ''}`);
		this.onImagesDeleted(count);
	}
}
