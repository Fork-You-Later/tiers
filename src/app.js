'use strict';

import { DEFAULT_TIERS, LAYOUT_HORIZONTAL, LAYOUT_VERTICAL } from './constants.js';
import { is_url, showToast } from './utils.js';
import { serialize_tierlist, save_tierlist, load_tierlist } from './serializer.js';
import { TierlistManager } from './tierlist.js';
import { DragDropManager } from './dragDrop.js';
import { loadZip } from './zipLoader.js';
import { isDuplicate, clearHashes, computeHash, registerImageHash } from './deduplication.js';
import { applyLoopToNewImage, applyGlobalLoopSetting, isLoopEnabled } from './animationControl.js';
import { enableBadgesOnImage, getBadgesForImage, restoreBadgesOnImage } from './badges.js';
import { BudgetMode } from './budgetMode.js';
import { MysteryMode } from './mysteryMode.js';
import { EloSorter } from './eloSorter.js';
import { saveToStorage, loadFromStorage, clearStorage } from './storage.js';

export class App {
	constructor() {
		this.unsavedChanges = false;
		this.untieredImages = null;
		this.tierlistDiv = null;
		this.titleLabel = null;
		this.tierlistManager = null;
		this.dragDropManager = null;
		this.budgetMode = new BudgetMode();
		this.mysteryMode = new MysteryMode((img) => {
			enableBadgesOnImage(img);
		});
		this.eloSorter = null;
		this._autoSaveTimer = null;
	}

	setUnsavedChanges(val) {
		this.unsavedChanges = val;
		if (val) {
			this.triggerAutoSave();
		}
	}

	triggerAutoSave() {
		if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
		this._autoSaveTimer = setTimeout(() => {
			if (this.tierlistDiv && this.untieredImages && this.titleLabel) {
				const data = serialize_tierlist(
					this.tierlistDiv,
					this.untieredImages,
					this.titleLabel,
					getBadgesForImage
				);
				saveToStorage(data);
			}
		}, 600);
	}

	init() {
		this.untieredImages = document.querySelector('.images');
		this.tierlistDiv = document.querySelector('.tierlist');
		this.titleLabel = document.querySelector('.title-label');

		this.tierlistManager = new TierlistManager(
			this.tierlistDiv,
			this.untieredImages,
			(val) => {
				this.setUnsavedChanges(val);
				this.budgetMode.update(this.tierlistDiv);
			}
		);

		this.dragDropManager = new DragDropManager(
			this.tierlistManager,
			(val) => {
				this.setUnsavedChanges(val);
				this.budgetMode.update(this.tierlistDiv);
			}
		);

		this.tierlistManager.setMakeAcceptDrop((elem) => this.dragDropManager.makeAcceptDrop(elem));
		this.eloSorter = new EloSorter(this.tierlistManager);

		for (let i = 0; i < DEFAULT_TIERS.length; ++i) {
			this.tierlistManager.addRow(i, DEFAULT_TIERS[i]);
		}
		this.tierlistManager.recomputeHeaderColors();

		if (this.untieredImages) {
			this.dragDropManager.makeAcceptDrop(this.untieredImages);
		}

		// Budget display
		const budgetDisplay = document.getElementById('budget-display');
		if (budgetDisplay) this.budgetMode.setDisplayElement(budgetDisplay);

		this.bindTitleEvents();
		this.bindFileInputEvents();
		this.bindClipboardEvents();
		this.bindButtonEvents();
		this.bindToolbarEvents();
		this.dragDropManager.bindTrashEvents();
		this.bindToggleLayoutEvents();
		this.bindBeforeUnload();

		// Auto-restore from localStorage or URL parameter
		const restored = this.tryRestoreCachedOrUrlState();
		if (!restored) {
			this.tierlistManager.resizeHeaders();
		}
	}

	bindTitleEvents() {
		let title = document.querySelector('.title');
		let title_input = document.getElementById('title-input');
		if (title && title_input && this.titleLabel) {
			this.tierlistManager.enableEditOnClick(title, title_input, this.titleLabel);
		}
	}

	// ── Image creation with all feature hooks ──────────────────────────────
	createImage(src, hash = null) {
		const img = this.dragDropManager.createImgWithSrc(src);
		if (hash) {
			registerImageHash(img, hash);
			img.dataset.imageHash = hash;
		}
		applyLoopToNewImage(img);
		enableBadgesOnImage(img);
		return img;
	}

	/**
	 * Appends an image to the untiered pool and applies mystery mode wrapping if active.
	 */
	appendImageToPool(img) {
		if (!this.untieredImages || !img) return;
		this.untieredImages.appendChild(img);
		if (this.mysteryMode.enabled) {
			this.mysteryMode.wrapNewImage(img);
		}
		this.setUnsavedChanges(true);
	}

	// ── File input (images + ZIP) ──────────────────────────────────────────
	bindFileInputEvents() {
		const loadImgInput = document.getElementById('load-img-input');
		if (loadImgInput) {
			loadImgInput.addEventListener('input', async (evt) => {
				let added = 0;
				let dupes = 0;
				for (let file of evt.target.files) {
					if (file.type.startsWith('image/')) {
						const isDupe = await isDuplicate(file);
						if (isDupe) { dupes++; continue; }
						const hash = await computeHash(file);
						const reader = new FileReader();
						reader.addEventListener('load', (load_evt) => {
							const img = this.createImage(load_evt.target.result, hash);
							this.appendImageToPool(img);
						});
						reader.readAsDataURL(file);
						added++;
					}
				}
				if (dupes > 0) showToast(`🖼️ ${added} added, ${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped`);
				evt.target.value = '';
			});
		}

		const loadZipInput = document.getElementById('load-zip-input');
		if (loadZipInput) {
			loadZipInput.addEventListener('input', async (evt) => {
				const file = evt.target.files[0];
				if (!file) return;
				showToast('📦 Extracting ZIP…');
				try {
					await loadZip(file, async (blob) => {
						const hash = await computeHash(blob);
						const url = URL.createObjectURL(blob);
						const img = this.createImage(url, hash);
						this.appendImageToPool(img);
					});
				} catch (e) {
					showToast('❌ Failed to extract ZIP: ' + e.message);
					console.error(e);
				}
				evt.target.value = '';
			});
		}

		const importInput = document.getElementById('import-input');
		if (importInput) {
			importInput.addEventListener('input', (evt) => {
				if (!evt.target.files || !evt.target.files.length) return;
				let file = evt.target.files[0];
				let reader = new FileReader();
				reader.addEventListener('load', (load_evt) => {
					let parsed;
					try { parsed = JSON.parse(load_evt.target.result); }
					catch { alert("Failed to parse JSON data"); return; }
					if (!parsed) { alert("Failed to parse data"); return; }
					this.tierlistManager.hardResetList();
					clearHashes();
					load_tierlist(
						parsed,
						this.titleLabel,
						(idx, name) => this.tierlistManager.addRow(idx, name),
						(src) => this.createImage(src),
						() => this.tierlistManager.resizeHeaders(),
						(idx) => this.tierlistManager.recomputeHeaderColors(idx),
						this.untieredImages,
						(val) => this.setUnsavedChanges(val),
						restoreBadgesOnImage
					);
				});
				reader.readAsText(file);
				evt.target.value = '';
			});
		}
	}

	bindClipboardEvents() {
		document.onpaste = async (evt) => {
			let clip_data = evt.clipboardData || evt.originalEvent?.clipboardData;
			if (!clip_data) return;
			for (let item of clip_data.items) {
				if (item.kind === 'file') {
					let blob = item.getAsFile();
					const isDupe = await isDuplicate(blob);
					if (isDupe) { showToast('📋 Duplicate image skipped'); continue; }
					const hash = await computeHash(blob);
					let reader = new FileReader();
					reader.onload = (load_evt) => {
						let img = this.createImage(load_evt.target.result, hash);
						this.appendImageToPool(img);
					};
					reader.readAsDataURL(blob);
				}
			}
		};
	}

	// ── Toolbar & Buttons ──────────────────────────────────────────────────
	bindButtonEvents() {
		const resetBtn = document.getElementById('reset-list-input');
		if (resetBtn) {
			resetBtn.addEventListener('click', () => {
				if (confirm('Reset Tierlist? (this will place all images back in the pool)')) {
					this.tierlistManager.softResetList();
					this.budgetMode.update(this.tierlistDiv);
				}
			});
		}

		const exportBtn = document.getElementById('export-input');
		if (exportBtn) {
			exportBtn.addEventListener('click', () => {
				let name = prompt('Please give a name to this tierlist');
				if (name) {
					save_tierlist(
						`${name}.json`,
						this.tierlistDiv,
						this.untieredImages,
						this.titleLabel,
						(val) => this.setUnsavedChanges(val),
						getBadgesForImage
					);
				}
			});
		}
	}

	bindToolbarEvents() {
		// Toggle Popover Menu for Feature Toolbar
		const menuToggleBtn = document.getElementById('toggle-tools-menu');
		const toolbar = document.getElementById('feature-toolbar');
		if (menuToggleBtn && toolbar) {
			menuToggleBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				toolbar.classList.toggle('popover-open');
				menuToggleBtn.classList.toggle('active', toolbar.classList.contains('popover-open'));
			});
			document.addEventListener('click', (e) => {
				if (!toolbar.contains(e.target) && !menuToggleBtn.contains(e.target)) {
					toolbar.classList.remove('popover-open');
					menuToggleBtn.classList.remove('active');
				}
			});
		}

		// Mystery Mode toggle
		const mysteryToggle = document.getElementById('toggle-mystery');
		if (mysteryToggle) {
			mysteryToggle.addEventListener('click', () => {
				const enabled = !this.mysteryMode.enabled;
				if (enabled) {
					this.mysteryMode.enable();
					mysteryToggle.classList.add('active');
					mysteryToggle.title = 'Mystery Mode: ON';
					showToast('🃏 Mystery Mode ON — click cards to reveal!');
				} else {
					this.mysteryMode.disable();
					mysteryToggle.classList.remove('active');
					mysteryToggle.title = 'Mystery Mode: OFF';
					showToast('🃏 Mystery Mode OFF');
				}
			});
		}

		// Loop toggle
		const loopToggle = document.getElementById('toggle-loop');
		if (loopToggle) {
			loopToggle.addEventListener('click', async () => {
				const newEnabled = !isLoopEnabled();
				const allImgs = document.querySelectorAll('.images img.draggable, .tierlist img.draggable');
				await applyGlobalLoopSetting(newEnabled, allImgs);
				loopToggle.classList.toggle('active', !newEnabled);
				loopToggle.title = newEnabled ? 'Animations: ON' : 'Animations: OFF (hover to preview)';
				showToast(newEnabled ? '▶️ Animations enabled' : '⏸️ Animations frozen');
			});
		}

		// Budget Mode toggle
		const budgetToggle = document.getElementById('toggle-budget');
		if (budgetToggle) {
			budgetToggle.addEventListener('click', () => {
				if (this.budgetMode.enabled) {
					this.budgetMode.disable();
					budgetToggle.classList.remove('active');
					showToast('💰 Budget Mode OFF');
				} else {
					const val = prompt('Set total budget (number of points):', this.budgetMode.budget);
					if (val === null) return;
					const budget = parseFloat(val) || 15;
					this.budgetMode.enable(budget);
					budgetToggle.classList.add('active');
					this.budgetMode.update(this.tierlistDiv);
					showToast(`💰 Budget Mode ON — $${budget} budget`);
				}
			});
		}

		// Elo sorter launch
		const eloBtn = document.getElementById('toggle-elo');
		if (eloBtn) {
			eloBtn.addEventListener('click', () => {
				this.eloSorter.start();
			});
		}

		// PNG Export with skipFonts to avoid cross-origin CSS exceptions
		const pngBtn = document.getElementById('export-png-btn');
		if (pngBtn) {
			pngBtn.addEventListener('click', async () => {
				try {
					showToast('📸 Capturing tierlist…');
					const { toPng } = await import('html-to-image');
					const buttons = this.tierlistDiv.querySelectorAll('.row-buttons');
					buttons.forEach(b => b.style.visibility = 'hidden');

					const dataUrl = await toPng(this.tierlistDiv, {
						cacheBust: true,
						pixelRatio: 2,
						skipFonts: true // Prevents cross-origin CSSSecurityError / CORS font errors
					});

					buttons.forEach(b => b.style.visibility = '');

					const link = document.createElement('a');
					link.download = 'tierlist.png';
					link.href = dataUrl;
					link.click();
					showToast('✅ PNG exported!');
				} catch (e) {
					console.error(e);
					showToast('❌ PNG export failed: ' + e.message);
				}
			});
		}
	}

	bindToggleLayoutEvents() {
		let toggle = document.getElementById('toggle-layout');
		if (toggle) {
			toggle.addEventListener('click', () => {
				const nextLayout = (this.tierlistManager.curLayout + 1) % 2;
				this.tierlistManager.setLayout(nextLayout);
			});
		}
	}

	bindBeforeUnload() {
		window.addEventListener('beforeunload', (evt) => {
			if (!this.unsavedChanges) return null;
			var msg = "You have unsaved changes. Leave anyway?";
			(evt || window.event).returnValue = msg;
			return msg;
		});
	}

	tryRestoreCachedOrUrlState() {
		if (typeof window === 'undefined' || !window.location) return false;
		const load_from_url = new URLSearchParams(window.location.search).get('url');
		if (load_from_url !== null && is_url(load_from_url)) {
			void this.tryLoadTierlistJson(load_from_url);
			return true;
		}

		// Otherwise check localStorage cache
		const cached = loadFromStorage();
		if (cached && cached.rows && cached.rows.length > 0) {
			this.tierlistManager.hardResetList();
			clearHashes();
			load_tierlist(
				cached,
				this.titleLabel,
				(idx, name) => this.tierlistManager.addRow(idx, name),
				(src) => this.createImage(src),
				() => this.tierlistManager.resizeHeaders(),
				(idx) => this.tierlistManager.recomputeHeaderColors(idx),
				this.untieredImages,
				(val) => this.setUnsavedChanges(val),
				restoreBadgesOnImage
			);
			showToast('💾 Auto-restored tierlist from local cache');
			return true;
		}
		return false;
	}

	async tryLoadTierlistJson(url) {
		try {
			let result = await fetch(url);
			result = await result.json();
			this.tierlistManager.hardResetList();
			clearHashes();
			load_tierlist(
				result,
				this.titleLabel,
				(idx, name) => this.tierlistManager.addRow(idx, name),
				(src) => this.createImage(src),
				() => this.tierlistManager.resizeHeaders(),
				(idx) => this.tierlistManager.recomputeHeaderColors(idx),
				this.untieredImages,
				(val) => this.setUnsavedChanges(val),
				restoreBadgesOnImage
			);
		} catch (e) { console.error(e); }
	}
}

export const app = new App();

if (typeof window !== 'undefined') {
	window.addEventListener('load', () => { app.init(); });
}
