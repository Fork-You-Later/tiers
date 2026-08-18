'use strict';

import { get_item_index } from './utils.js';
import { untrackImage } from './deduplication.js';

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
		const rect = elem.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

		let left = rect.left + scrollLeft;
		let top = rect.top + scrollTop;

		if (is_hovering_row) {
			let row_header = elem.getElementsByClassName ? elem.getElementsByClassName("header") : null;
			row_header = row_header && row_header.length > 0 ? row_header[0] : undefined;
			if (row_header !== undefined) {
				const headerRect = row_header.getBoundingClientRect();
				left = headerRect.right + scrollLeft;
			} else {
				// Elem is an image card inside the row — position line AFTER it (on its right side)
				left = rect.right + scrollLeft;
			}
		} else {
			// Position line on the right side of the card
			left = rect.right + scrollLeft;
		}

		this.placementMarkerDiv.style.position = 'absolute';
		this.placementMarkerDiv.style.left = `${left}px`;
		this.placementMarkerDiv.style.top = `${top}px`;
		this.placementMarkerDiv.style.height = `${rect.height || 100}px`;
		this.placementMarkerDiv.style.marginLeft = '0px';
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
			evt.stopPropagation();
			evt.target.classList.remove('drag-entered');

			if (!this.draggedImage) {
				return;
			}

			let old_item_row;
			let dragged_image_parent = this.draggedImage.parentNode;

			// Helper: Cleanly remove dragged image and any parent wrapper (.item or .mystery-wrapper)
			if (dragged_image_parent) {
				if (dragged_image_parent.classList.contains('item') || dragged_image_parent.classList.contains('mystery-wrapper')) {
					let containing_container = dragged_image_parent.parentNode;
					if (containing_container) {
						if (containing_container.classList.contains('items')) {
							old_item_row = containing_container.parentNode;
						}
						containing_container.removeChild(dragged_image_parent);
					}
				} else {
					dragged_image_parent.removeChild(this.draggedImage);
				}
			}

			let td = document.createElement('span');
			td.classList.add('item');
			td.appendChild(this.draggedImage);
			let items_container = elem.querySelector('.items');
			if (!items_container) {
				items_container = elem;
			}

			if (items_container.parentNode === old_item_row && this.oldItemIndex !== null && target_item_index !== undefined && this.oldItemIndex < target_item_index) {
				target_item_index = target_item_index - 1;
			}

			if (evt.target.classList.contains("row")) {
				items_container.appendChild(td);
			} else if (target_item_index !== undefined && target_item_index !== null && items_container.children[target_item_index]) {
				items_container.insertBefore(td, items_container.children[target_item_index]);
			} else {
				items_container.appendChild(td);
			}

			this.onUnsavedChange(true);
		});
	}

	bindTrashEvents() {
		const trashContainer = document.getElementById('floating-trash-container');
		const targets = [trashContainer].filter(Boolean);

		targets.forEach(target => {
			target.classList.add('droppable');

			target.addEventListener('dragenter', (evt) => {
				evt.preventDefault();
				if (trashContainer) trashContainer.classList.add('trash-hover');
			});

			target.addEventListener('dragleave', (evt) => {
				evt.preventDefault();
				if (trashContainer) trashContainer.classList.remove('trash-hover');
			});

			target.addEventListener('dragover', (evt) => {
				evt.preventDefault();
				evt.dataTransfer.dropEffect = 'move';
			});

			target.addEventListener('drop', (evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				if (trashContainer) trashContainer.classList.remove('trash-hover');

				if (this.draggedImage) {
					untrackImage(this.draggedImage);
					const draggedParent = this.draggedImage.parentNode;
					if (draggedParent && draggedParent.tagName.toUpperCase() === 'SPAN' && draggedParent.classList.contains('item')) {
						const containingTr = draggedParent.parentNode;
						if (containingTr) containingTr.removeChild(draggedParent);
					}
					this.draggedImage.remove();
					this.draggedImage = null;
					this.onUnsavedChange(true);
					import('./utils.js').then(({ showToast }) => {
						showToast('🗑️ Image deleted');
					});
				}
			});
		});
	}
}
