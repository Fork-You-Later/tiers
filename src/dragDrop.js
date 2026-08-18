'use strict';

import { get_item_index } from './utils.js';

export class DragDropManager {
	constructor(tierlistManager, onUnsavedChange) {
		this.tierlistManager = tierlistManager;
		this.onUnsavedChange = onUnsavedChange || (() => {});
		this.draggedImage = null;
		this.oldItemIndex = null;
		this.placementMarkerDiv = document.createElement('div');
		this.placementMarkerDiv.classList.add("vl");

		this.endDrag = this.endDrag.bind(this);
		window.addEventListener('mouseup', this.endDrag);
		window.addEventListener('dragend', this.endDrag);
	}

	createImgWithSrc(src) {
		let img = document.createElement('img');
		img.src = src;
		img.style.userSelect = 'none';
		img.classList.add('draggable');
		img.draggable = true;
		img.ondragstart = "event.dataTransfer.setData('text/plain', null)";
		img.addEventListener('mousedown', (evt) => {
			this.draggedImage = evt.target;
			this.draggedImage.classList.add("dragged");
			this.oldItemIndex = get_item_index(this.draggedImage, this.tierlistManager ? this.tierlistManager.tierlistDiv : null);
		});
		return img;
	}

	setItemPlacementMarkerLocation(elem, is_hovering_row) {
		if (!elem) return;
		var h_offset = elem.offsetLeft.toString();
		let hovering_empty_bottom_container = false;

		if (elem.parentNode && elem.parentNode.classList.contains("bottom-container")) {
			hovering_empty_bottom_container = true;
		}

		h_offset -= 8;

		if (is_hovering_row && !hovering_empty_bottom_container) {
			let position_info;
			let row_header = elem.getElementsByClassName ? elem.getElementsByClassName("header") : null;
			row_header = row_header && row_header.length > 0 ? row_header[0] : undefined;
			if (row_header !== undefined) {
				position_info = row_header.getBoundingClientRect();
			} else {
				position_info = elem.getBoundingClientRect();
			}

			h_offset = position_info.right - 8;
			this.placementMarkerDiv.style.marginLeft = h_offset + "px";
		} else {
			this.placementMarkerDiv.style.marginLeft = h_offset + "px";
		}

		this.placementMarkerDiv.style.top = `${elem.offsetTop}px`;
	}

	preCalcRowItemPlacementMarkerLocation(image_node_list, drag_enter_img) {
		let last_image = image_node_list && image_node_list.length > 0 ? image_node_list[image_node_list.length - 1] : undefined;

		if (last_image !== undefined) {
			this.setItemPlacementMarkerLocation(last_image, true);
		} else {
			this.setItemPlacementMarkerLocation(drag_enter_img, true);
		}
	}

	endDrag() {
		if (this.placementMarkerDiv.parentNode === document.body) {
			document.body.removeChild(this.placementMarkerDiv);
		}
		if (this.draggedImage) {
			this.draggedImage.classList.remove("dragged");
		}
		this.draggedImage = null;
	}

	makeAcceptDrop(elem) {
		if (!elem) return;
		elem.classList.add('droppable');

		let target_item_index;
		let drag_enter_img;

		elem.addEventListener('dragenter', (evt) => {
			drag_enter_img = evt.target;
			drag_enter_img.classList.add('drag-entered');
			target_item_index = get_item_index(drag_enter_img, this.tierlistManager ? this.tierlistManager.tierlistDiv : null);

			if (drag_enter_img.classList.contains("row") || drag_enter_img.classList.contains("images")) {
				let image_node_list = drag_enter_img.querySelectorAll("img");
				this.preCalcRowItemPlacementMarkerLocation(image_node_list, drag_enter_img);
			} else if (drag_enter_img.parentNode && drag_enter_img.parentNode.classList.contains("row")) {
				let image_node_list = drag_enter_img.parentNode.querySelectorAll("img");
				this.preCalcRowItemPlacementMarkerLocation(image_node_list, drag_enter_img);
			} else if (drag_enter_img.classList.contains("draggable")) {
				this.setItemPlacementMarkerLocation(drag_enter_img, false);
			}

			document.body.appendChild(this.placementMarkerDiv);
		});

		elem.addEventListener('dragleave', (evt) => {
			evt.target.classList.remove('drag-entered');
		});

		elem.addEventListener('dragover', (evt) => {
			evt.preventDefault();
		});

		elem.addEventListener('drop', (evt) => {
			evt.preventDefault();
			evt.target.classList.remove('drag-entered');

			if (!this.draggedImage) {
				return;
			}

			let old_item_row;
			let dragged_image_parent = this.draggedImage.parentNode;
			if (dragged_image_parent && dragged_image_parent.tagName.toUpperCase() === 'SPAN' &&
				dragged_image_parent.classList.contains('item')) {
				let containing_tr = dragged_image_parent.parentNode;
				old_item_row = containing_tr ? containing_tr.parentNode : null;
				if (containing_tr) containing_tr.removeChild(dragged_image_parent);
			} else if (dragged_image_parent) {
				dragged_image_parent.removeChild(this.draggedImage);
			}

			let td = document.createElement('span');
			td.classList.add('item');
			td.appendChild(this.draggedImage);
			let items_container = elem.querySelector('.items');
			if (!items_container) {
				items_container = elem;
			}

			if (items_container.parentNode === old_item_row && this.oldItemIndex < target_item_index) {
				target_item_index = target_item_index - 1;
			}

			if (evt.target.classList.contains("row")) {
				items_container.appendChild(td);
			} else {
				items_container.insertBefore(td, items_container.children[target_item_index]);
			}

			this.onUnsavedChange(true);
		});
	}

	bindTrashEvents() {
		let trash = document.getElementById('trash');
		if (!trash) return;
		trash.classList.add('droppable');
		trash.addEventListener('dragenter', (evt) => {
			evt.preventDefault();
			evt.target.src = 'assets/trash_bin_open.png';
		});
		trash.addEventListener('dragexit', (evt) => {
			evt.preventDefault();
			evt.target.src = 'assets/trash_bin.png';
		});
		trash.addEventListener('dragover', (evt) => {
			evt.preventDefault();
		});
		trash.addEventListener('drop', (evt) => {
			evt.preventDefault();
			evt.target.src = 'assets/trash_bin.png';
			if (this.draggedImage) {
				let dragged_image_parent = this.draggedImage.parentNode;
				if (dragged_image_parent && dragged_image_parent.tagName.toUpperCase() === 'SPAN' &&
					dragged_image_parent.classList.contains('item')) {
					let containing_tr = dragged_image_parent.parentNode;
					if (containing_tr) containing_tr.removeChild(dragged_image_parent);
				}
				this.draggedImage.remove();
				this.onUnsavedChange(true);
			}
		});
	}
}
