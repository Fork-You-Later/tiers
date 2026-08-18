'use strict';

import { MAX_NAME_LEN, TIER_COLORS, LAYOUT_HORIZONTAL, LAYOUT_VERTICAL } from './constants.js';

export class TierlistManager {
	constructor(tierlistDiv, untieredImages, onUnsavedChange) {
		this.tierlistDiv = tierlistDiv;
		this.untieredImages = untieredImages;
		this.onUnsavedChange = onUnsavedChange || (() => {});
		this.allHeaders = [];
		this.headersOrigMinWidth = 0;
		this.curLayout = LAYOUT_HORIZONTAL;
		this.uniqueId = 0;
		this.makeAcceptDropFn = null; // injected by DragDrop module
	}

	setMakeAcceptDrop(fn) {
		this.makeAcceptDropFn = fn;
	}

	resetRow(row) {
		if (!row) return;
		row.querySelectorAll('span.item').forEach((item) => {
			for (let i = 0; i < item.children.length; ++i) {
				let img = item.children[i];
				item.removeChild(img);
				if (this.untieredImages) {
					this.untieredImages.appendChild(img);
				}
			}
			if (item.parentNode) {
				item.parentNode.removeChild(item);
			}
		});
	}

	hardResetList() {
		if (this.tierlistDiv) this.tierlistDiv.innerHTML = '';
		if (this.untieredImages) this.untieredImages.innerHTML = '';
		this.allHeaders = [];
	}

	softResetList() {
		if (!this.tierlistDiv) return;
		this.tierlistDiv.querySelectorAll('.row').forEach((row) => this.resetRow(row));
		this.onUnsavedChange(true);
	}

	enableEditOnClick(container, input, label, rowColorInput) {
		const self = this;
		function change_label() {
			input.style.display = 'none';
			label.innerText = input.value;
			label.textContent = input.value;
			label.style.display = 'inline';

			if (rowColorInput !== undefined && rowColorInput !== null) {
				container.style.backgroundColor = rowColorInput.value;
				rowColorInput.style.display = "none";
			}

			self.onUnsavedChange(true);
		}

		let evt_timestamp = 0;
		container.addEventListener('focusout', (evt) => {
			if (evt.target.classList.value !== "row-color-picker" && evt.relatedTarget !== null) {
				if (evt.relatedTarget.classList.value === "row-color-picker") {
					label.innerText = input.value;
					label.textContent = input.value;
					evt_timestamp = evt.timeStamp;
				}
			} else if (evt.timeStamp <= evt_timestamp + 200) {
				// Do nothing (grace period for Firefox color picker)
			} else {
				change_label();
			}
		});

		container.addEventListener('click', (evt) => {
			if (evt.target.classList.value === "header" && input.style.display === 'inline') {
				change_label();
			} else {
				label.style.display = 'none';
				const txt = label.innerText ?? label.textContent ?? '';
				input.value = txt.substr(0, MAX_NAME_LEN);
				input.style.display = 'inline';
				input.style.textAlign = "center";
				if (input.select) input.select();

				if (rowColorInput !== undefined && rowColorInput !== null) {
					rowColorInput.style.display = 'inline';
				}
			}
		});
	}

	createLabelInput(row, rowIdx, rowName) {
		let input = document.createElement('input');
		input.id = `input-tier-${this.uniqueId++}`;
		input.type = 'text';
		input.addEventListener('change', () => this.resizeHeaders());
		let label = document.createElement('label');
		label.htmlFor = input.id;
		label.innerText = rowName;
		label.textContent = rowName;

		let header = row.querySelector('.header');
		this.allHeaders.splice(rowIdx, 0, [header, input, label]);
		header.appendChild(label);
		header.appendChild(input);

		let row_color_input = document.createElement('input');
		row_color_input.type = "color";
		row_color_input.classList.add('row-color-picker');
		row_color_input.value = TIER_COLORS[rowIdx % TIER_COLORS.length];
		row_color_input.style.padding = "0px";
		row_color_input.style.width = "100px";
		row_color_input.style.height = "100px";
		row_color_input.style.display = "none";
		header.appendChild(row_color_input);

		this.enableEditOnClick(header, input, label, row_color_input);
	}

	resizeHeaders() {
		let max_width = this.headersOrigMinWidth;
		for (let [other_header, _i, label] of this.allHeaders) {
			if (label) {
				max_width = Math.max(max_width, label.clientWidth || 0);
			}
		}

		for (let [other_header, _i2, _l2] of this.allHeaders) {
			if (other_header) {
				other_header.style.minWidth = `${max_width}px`;
			}
		}
	}

	addRow(index, name) {
		let div = document.createElement('div');
		let header = document.createElement('span');
		let items = document.createElement('span');
		div.classList.add('row');
		header.classList.add('header');
		items.classList.add('items');
		div.appendChild(header);
		div.appendChild(items);

		let row_buttons = document.createElement('div');
		row_buttons.classList.add('row-buttons');

		let btn_plus_up = document.createElement('input');
		btn_plus_up.type = "button";
		btn_plus_up.value = '+';
		btn_plus_up.title = "Add row above";
		btn_plus_up.addEventListener('click', (evt) => {
			let parent_div = evt.target.parentNode.parentNode;
			let rows = Array.from(this.tierlistDiv.children);
			let idx = rows.indexOf(parent_div);
			console.assert(idx >= 0);
			this.addRow(idx, '');
			this.recomputeHeaderColors(idx);
		});

		let btn_rm = document.createElement('input');
		btn_rm.type = "button";
		btn_rm.value = '-';
		btn_rm.title = "Remove row";
		btn_rm.addEventListener('click', (evt) => {
			let rows = Array.from(this.tierlistDiv.querySelectorAll('.row'));
			if (rows.length < 2) return;
			let parent_div = evt.target.parentNode.parentNode;
			let idx = rows.indexOf(parent_div);
			console.assert(idx >= 0);
			const label = rows[idx].querySelector('.header label');
			const labelText = label ? (label.innerText ?? label.textContent ?? '') : '';
			if (rows[idx].querySelectorAll('img').length === 0 ||
				confirm(`Remove tier ${labelText}? (This will move back all its content to the untiered pool)`)) {
				this.removeRow(idx);
			}
		});

		let btn_plus_down = document.createElement('input');
		btn_plus_down.type = "button";
		btn_plus_down.value = '+';
		btn_plus_down.title = "Add row below";
		btn_plus_down.addEventListener('click', (evt) => {
			let parent_div = evt.target.parentNode.parentNode;
			let rows = Array.from(this.tierlistDiv.children);
			let idx = rows.indexOf(parent_div);
			console.assert(idx >= 0);
			this.addRow(idx + 1, name);
			this.recomputeHeaderColors(idx + 1);
		});

		row_buttons.appendChild(btn_plus_up);
		row_buttons.appendChild(btn_rm);
		row_buttons.appendChild(btn_plus_down);
		div.appendChild(row_buttons);

		let rows = this.tierlistDiv ? this.tierlistDiv.children : [];
		if (index === rows.length) {
			if (this.tierlistDiv) this.tierlistDiv.appendChild(div);
		} else {
			let nxt_child = rows[index];
			if (this.tierlistDiv) this.tierlistDiv.insertBefore(div, nxt_child);
		}

		if (this.makeAcceptDropFn) {
			this.makeAcceptDropFn(div);
		}
		this.createLabelInput(div, index, name);

		if (this.allHeaders.length === 1 && this.allHeaders[0][0]) {
			this.headersOrigMinWidth = this.allHeaders[0][0].clientWidth || 0;
		}

		return div;
	}

	removeRow(idx) {
		if (!this.tierlistDiv) return;
		let row = this.tierlistDiv.children[idx];
		if (!row) return;
		this.resetRow(row);
		this.tierlistDiv.removeChild(row);
		this.allHeaders.splice(idx, 1);
	}

	recomputeHeaderColors(idx) {
		if (!this.tierlistDiv) return;
		if (idx === undefined) {
			this.tierlistDiv.querySelectorAll('.row').forEach((row, row_idx) => {
				let color = TIER_COLORS[row_idx % TIER_COLORS.length];
				let header = row.querySelector('.header');
				if (header) {
					header.style.backgroundColor = color;
					let picker = header.querySelector('.row-color-picker');
					if (picker) picker.value = color;
				}
			});
		} else {
			let rows = Array.from(this.tierlistDiv.querySelectorAll(".row"));
			if (rows[idx]) {
				let color = TIER_COLORS[idx % TIER_COLORS.length];
				let header = rows[idx].querySelector('.header');
				if (header) {
					header.style.backgroundColor = color;
					let picker = header.querySelector('.row-color-picker');
					if (picker) picker.value = color;
				}
			}
		}
	}

	setLayout(layout, mainContentElem) {
		let main = mainContentElem || document.getElementsByClassName("main-content")[0];
		if (main) {
			if (layout === LAYOUT_VERTICAL) {
				main.classList.add("vertical");
			} else {
				main.classList.remove("vertical");
			}
		}
		this.curLayout = layout;
	}
}
