'use strict';

import { DEFAULT_TIERS, LAYOUT_HORIZONTAL, LAYOUT_VERTICAL } from './constants.js';
import { is_url, showToast } from './utils.js';
import { serialize_tierlist, save_tierlist, load_tierlist } from './serializer.js';
import { TierlistManager } from './tierlist.js';
import { DragDropManager } from './dragDrop.js';
import { loadZip, blobToDataURL } from './zipLoader.js';
import { isDuplicate, clearHashes, computeHash, registerImageHash } from './deduplication.js';
import { applyLoopToNewImage, applyGlobalLoopSetting, isLoopEnabled } from './animationControl.js';
import { enableBadgesOnImage, getBadgesForImage, restoreBadgesOnImage } from './badges.js';
import { BudgetMode } from './budgetMode.js';
import { MysteryMode } from './mysteryMode.js';
import { EloSorter } from './eloSorter.js';
import { saveToStorage, loadFromStorage, clearStorage } from './storage.js';
import { TrashModalManager } from './trashModal.js';
import { showConfirm, showPrompt } from './confirmModal.js';
import { readImageFromClipboard } from './clipboard.js';

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
		this.trashModalManager = null;
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

		this.trashModalManager = new TrashModalManager(() => {
			this.setUnsavedChanges(true);
			this.budgetMode.update(this.tierlistDiv);
		});

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

		// Mystery mode enabled by default from the start
		this.mysteryMode.enable();
		const mysteryToggle = document.getElementById('toggle-mystery');
		if (mysteryToggle) {
			mysteryToggle.classList.add('active');
			mysteryToggle.setAttribute('aria-checked', 'true');
		}

		this.bindTitleEvents();
		this.bindFileInputEvents();
		this.bindClipboardEvents();
		this.bindGlobalDropEvents();
		this.bindToolbarEvents();
		this.bindTrashModalEvents();
		this.dragDropManager.bindTrashEvents();
		this.bindToggleLayoutEvents();
		this.bindBeforeUnload();

		// Auto-restore from localStorage or URL parameter
		const restored = this.tryRestoreCachedOrUrlState();
		if (!restored) {
			this.tierlistManager.resizeHeaders();
		}

		// Ensure all untiered pool cards are wrapped in mystery face-down state at startup
		if (this.mysteryMode.enabled) {
			this.mysteryMode.enable();
		}
	}

	bindTitleEvents() {
		let title = document.querySelector('.title');
		let title_input = document.getElementById('title-input');
		if (title && title_input && this.titleLabel) {
			this.tierlistManager.enableEditOnClick(title, title_input, this.titleLabel);
		}
	}

	createImage(src, hash = null) {
		const img = this.dragDropManager.createImgWithSrc(src);
		if (hash) {
			registerImageHash(img, hash);
			img.dataset.imageHash = hash;
		}
		applyLoopToNewImage(img);
		enableBadgesOnImage(img);
		this.mysteryMode.attachPreviewOnClick(img);
		return img;
	}

	appendImageToPool(img) {
		if (!this.untieredImages || !img) return;
		this.untieredImages.appendChild(img);
		if (this.mysteryMode.enabled) {
			this.mysteryMode.wrapNewImage(img);
		}
		this.setUnsavedChanges(true);
		this._updatePoolEmptyHint();
	}

	_updatePoolEmptyHint() {
		const hint = document.getElementById('pool-empty-hint');
		if (!hint) return;
		const hasImages = this.untieredImages && this.untieredImages.querySelectorAll('img.draggable').length > 0;
		hint.style.display = hasImages ? 'none' : '';
	}

	async processIncomingFile(file) {
		if (!file) return;
		if (file.name.endsWith('.zip')) {
			showToast('📦 Extracting ZIP…');
			try {
				await loadZip(file, (dataUrl, filename, hash) => {
					const img = this.createImage(dataUrl, hash);
					this.appendImageToPool(img);
				});
			} catch (e) {
				showToast('❌ Failed to extract ZIP: ' + e.message);
			}
		} else if (file.type.startsWith('image/')) {
			const isDupe = await isDuplicate(file);
			if (isDupe) {
				showToast(`🖼️ Duplicate image skipped (${file.name})`);
				return;
			}
			const hash = await computeHash(file);
			const dataUrl = await blobToDataURL(file);
			const img = this.createImage(dataUrl, hash);
			this.appendImageToPool(img);
		}
	}

	// ── Unified Media Input (Images + ZIP) ──────────────────────────────────
	bindFileInputEvents() {
		const loadMediaInput = document.getElementById('load-media-input');
		if (loadMediaInput) {
			loadMediaInput.addEventListener('input', async (evt) => {
				for (let file of evt.target.files) {
					await this.processIncomingFile(file);
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

	// ── Full-page Drag & Drop ───────────────────────────────────────────────
	bindGlobalDropEvents() {
		const dropOverlay = document.getElementById('full-page-drop-overlay');

		let dragCounter = 0;

		window.addEventListener('dragenter', (e) => {
			e.preventDefault();
			if (this.dragDropManager && this.dragDropManager.draggedImage) return;
			dragCounter++;
			if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
				if (dropOverlay) dropOverlay.classList.remove('hidden');
			}
		});

		window.addEventListener('dragleave', (e) => {
			e.preventDefault();
			if (this.dragDropManager && this.dragDropManager.draggedImage) return;
			dragCounter--;
			if (dragCounter <= 0 && dropOverlay) {
				dropOverlay.classList.add('hidden');
				dragCounter = 0;
			}
		});

		window.addEventListener('dragover', (e) => {
			e.preventDefault();
		});

		window.addEventListener('drop', async (e) => {
			e.preventDefault();
			dragCounter = 0;
			if (dropOverlay) dropOverlay.classList.add('hidden');
			if (this.dragDropManager && this.dragDropManager.draggedImage) return;

			if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				for (let file of e.dataTransfer.files) {
					await this.processIncomingFile(file);
				}
			}
		});
	}

	// ── Clipboard Paste (Desktop & Mobile Button) ───────────────────────────
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
					const dataUrl = await blobToDataURL(blob);
					const img = this.createImage(dataUrl, hash);
					this.appendImageToPool(img);
				}
			}
		};

		const pasteBtn = document.getElementById('paste-clipboard-btn');
		if (pasteBtn) {
			pasteBtn.addEventListener('click', async () => {
				const blob = await readImageFromClipboard();
				if (blob) {
					const isDupe = await isDuplicate(blob);
					if (isDupe) { showToast('📋 Duplicate image skipped'); return; }
					const hash = await computeHash(blob);
					const dataUrl = await blobToDataURL(blob);
					const img = this.createImage(dataUrl, hash);
					this.appendImageToPool(img);
					showToast('📋 Image pasted from clipboard!');
				}
			});
		}
	}

	bindTrashModalEvents() {
		const trashContainer = document.getElementById('floating-trash-container');
		if (trashContainer) {
			trashContainer.addEventListener('click', (e) => {
				if (!this.dragDropManager.draggedImage) {
					this.trashModalManager.open();
				}
			});
		}
	}

	// ── Settings Dropdown & Toolbar Items ──────────────────────────────────
	bindToolbarEvents() {
		const menuToggleBtn = document.getElementById('toggle-tools-menu');
		const toolbar = document.getElementById('feature-toolbar');
		const closeMenu = () => {
			toolbar.classList.remove('popover-open');
			menuToggleBtn.classList.remove('active');
			menuToggleBtn.setAttribute('aria-expanded', 'false');
		};
		if (menuToggleBtn && toolbar) {
			menuToggleBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				const isOpen = toolbar.classList.toggle('popover-open');
				menuToggleBtn.classList.toggle('active', isOpen);
				menuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			});
			document.addEventListener('click', (e) => {
				if (!toolbar.contains(e.target) && !menuToggleBtn.contains(e.target)) closeMenu();
			});
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') closeMenu();
			});
		}

		// Soft Reset button (inside Settings dropdown)
		const resetBtn = document.getElementById('reset-list-input');
		if (resetBtn) {
			resetBtn.addEventListener('click', async () => {
				const ok = await showConfirm({
					title: 'Reset Tierlist',
					message: 'Place all ranked images back into the unranked pool?',
					confirmText: 'Reset Tierlist',
					cancelText: 'Cancel',
					danger: true
				});
				if (ok) {
					this.tierlistManager.softResetList();
					this.budgetMode.update(this.tierlistDiv);
				}
			});
		}

		// Export JSON button (inside Settings dropdown)
		const exportBtn = document.getElementById('export-input');
		if (exportBtn) {
			exportBtn.addEventListener('click', async () => {
				const name = await showPrompt({
					title: 'Export Tierlist JSON',
					message: 'Enter a name for this tierlist save file:',
					defaultValue: this.titleLabel ? this.titleLabel.innerText : 'MyTierList',
					placeholder: 'Tierlist Name'
				});
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

		// Mystery Mode radio toggle
		const mysteryToggle = document.getElementById('toggle-mystery');
		if (mysteryToggle) {
			mysteryToggle.addEventListener('click', () => {
				const enabled = !this.mysteryMode.enabled;
				if (enabled) {
					this.mysteryMode.enable();
					mysteryToggle.classList.add('active');
					mysteryToggle.setAttribute('aria-checked', 'true');
					showToast('🃏 Mystery Mode ON — click cards to reveal!');
				} else {
					this.mysteryMode.disable();
					mysteryToggle.classList.remove('active');
					mysteryToggle.setAttribute('aria-checked', 'false');
					showToast('🃏 Mystery Mode OFF');
				}
			});
		}

		// Animation Loop radio toggle
		const loopToggle = document.getElementById('toggle-loop');
		if (loopToggle) {
			loopToggle.addEventListener('click', async () => {
				const newEnabled = !isLoopEnabled();
				const allImgs = document.querySelectorAll('.images img.draggable, .tierlist img.draggable');
				await applyGlobalLoopSetting(newEnabled, allImgs);
				loopToggle.classList.toggle('active', newEnabled);
				loopToggle.setAttribute('aria-checked', newEnabled ? 'true' : 'false');
				showToast(newEnabled ? '▶️ Animations enabled' : '⏸️ Animations frozen');
			});
		}

		// Budget Mode radio toggle
		const budgetToggle = document.getElementById('toggle-budget');
		if (budgetToggle) {
			budgetToggle.addEventListener('click', async () => {
				if (this.budgetMode.enabled) {
					this.budgetMode.disable();
					budgetToggle.classList.remove('active');
					budgetToggle.setAttribute('aria-checked', 'false');
					showToast('💰 Budget Mode OFF');
				} else {
					const val = await showPrompt({
						title: 'Budget Mode',
						message: 'Set total points budget for this tierlist:',
						defaultValue: String(this.budgetMode.budget),
						placeholder: '15'
					});
					if (val === null) return;
					const budget = parseFloat(val) || 15;
					this.budgetMode.enable(budget);
					budgetToggle.classList.add('active');
					budgetToggle.setAttribute('aria-checked', 'true');
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

		// PNG Export
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
						skipFonts: true
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
