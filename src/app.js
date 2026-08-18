'use strict';

import { DEFAULT_TIERS, LAYOUT_HORIZONTAL, LAYOUT_VERTICAL } from './constants.js';
import { is_url } from './utils.js';
import { save_tierlist, load_tierlist } from './serializer.js';
import { TierlistManager } from './tierlist.js';
import { DragDropManager } from './dragDrop.js';

export class App {
	constructor() {
		this.unsavedChanges = false;
		this.untieredImages = null;
		this.tierlistDiv = null;
		this.titleLabel = null;
		this.tierlistManager = null;
		this.dragDropManager = null;
	}

	setUnsavedChanges(val) {
		this.unsavedChanges = val;
	}

	init() {
		this.untieredImages = document.querySelector('.images');
		this.tierlistDiv = document.querySelector('.tierlist');
		this.titleLabel = document.querySelector('.title-label');

		this.tierlistManager = new TierlistManager(
			this.tierlistDiv,
			this.untieredImages,
			(val) => this.setUnsavedChanges(val)
		);

		this.dragDropManager = new DragDropManager(
			this.tierlistManager,
			(val) => this.setUnsavedChanges(val)
		);

		this.tierlistManager.setMakeAcceptDrop((elem) => this.dragDropManager.makeAcceptDrop(elem));

		for (let i = 0; i < DEFAULT_TIERS.length; ++i) {
			this.tierlistManager.addRow(i, DEFAULT_TIERS[i]);
		}
		this.tierlistManager.recomputeHeaderColors();

		if (this.untieredImages) {
			this.dragDropManager.makeAcceptDrop(this.untieredImages);
		}

		this.bindTitleEvents();
		this.bindFileInputEvents();
		this.bindClipboardEvents();
		this.bindButtonEvents();
		this.dragDropManager.bindTrashEvents();
		this.bindToggleLayoutEvents();
		this.bindBeforeUnload();

		void this.tryLoadTierlistJson();
	}

	bindTitleEvents() {
		let title = document.querySelector('.title');
		let title_input = document.getElementById('title-input');
		if (title && title_input && this.titleLabel) {
			this.tierlistManager.enableEditOnClick(title, title_input, this.titleLabel);
		}
	}

	bindFileInputEvents() {
		const loadImgInput = document.getElementById('load-img-input');
		if (loadImgInput) {
			loadImgInput.addEventListener('input', (evt) => {
				let images = document.querySelector('.images');
				for (let file of evt.target.files) {
					let reader = new FileReader();
					reader.addEventListener('load', (load_evt) => {
						let img = this.dragDropManager.createImgWithSrc(load_evt.target.result);
						images.appendChild(img);
						this.setUnsavedChanges(true);
					});
					reader.readAsDataURL(file);
				}
			});
		}

		const importInput = document.getElementById('import-input');
		if (importInput) {
			importInput.addEventListener('input', (evt) => {
				if (!evt.target.files || !evt.target.files.length) {
					return;
				}
				let file = evt.target.files[0];
				let reader = new FileReader();
				reader.addEventListener('load', (load_evt) => {
					let raw = load_evt.target.result;
					let parsed;
					try {
						parsed = JSON.parse(raw);
					} catch (e) {
						alert("Failed to parse data");
						return;
					}
					if (!parsed) {
						alert("Failed to parse data");
						return;
					}
					this.tierlistManager.hardResetList();
					load_tierlist(
						parsed,
						this.titleLabel,
						(idx, name) => this.tierlistManager.addRow(idx, name),
						(src) => this.dragDropManager.createImgWithSrc(src),
						() => this.tierlistManager.resizeHeaders(),
						(idx) => this.tierlistManager.recomputeHeaderColors(idx),
						this.untieredImages,
						(val) => this.setUnsavedChanges(val)
					);
				});
				reader.readAsText(file);
			});
		}
	}

	bindClipboardEvents() {
		document.onpaste = (evt) => {
			let clip_data = evt.clipboardData || evt.originalEvent?.clipboardData;
			if (!clip_data) return;
			let items = clip_data.items;
			let images = document.querySelector('.images');
			for (let item of items) {
				if (item.kind === 'file') {
					let blob = item.getAsFile();
					let reader = new FileReader();
					reader.onload = (load_evt) => {
						let img = this.dragDropManager.createImgWithSrc(load_evt.target.result);
						images.appendChild(img);
						this.setUnsavedChanges(true);
					};
					reader.readAsDataURL(blob);
				}
			}
		};
	}

	bindButtonEvents() {
		const resetBtn = document.getElementById('reset-list-input');
		if (resetBtn) {
			resetBtn.addEventListener('click', () => {
				if (confirm('Reset Tierlist? (this will place all images back in the pool)')) {
					this.tierlistManager.softResetList();
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
						(val) => this.setUnsavedChanges(val)
					);
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

	async tryLoadTierlistJson() {
		if (typeof window === 'undefined' || !window.location) return;
		const load_from_url = new URLSearchParams(window.location.search).get('url');
		if (load_from_url !== null && is_url(load_from_url)) {
			try {
				let result = await fetch(load_from_url);
				result = await result.json();
				this.tierlistManager.hardResetList();
				load_tierlist(
					result,
					this.titleLabel,
					(idx, name) => this.tierlistManager.addRow(idx, name),
					(src) => this.dragDropManager.createImgWithSrc(src),
					() => this.tierlistManager.resizeHeaders(),
					(idx) => this.tierlistManager.recomputeHeaderColors(idx),
					this.untieredImages,
					(val) => this.setUnsavedChanges(val)
				);
			} catch (e) {
				console.error(e);
			}
		}
	}
}

// Auto-initialize when loaded in browser environment
export const app = new App();

if (typeof window !== 'undefined') {
	window.addEventListener('load', () => {
		app.init();
	});
}
