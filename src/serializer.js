'use strict';

import { MAX_NAME_LEN } from './constants.js';
import { rgb_to_hex, save } from './utils.js';

function getElementText(elem) {
	if (!elem) return '';
	return elem.innerText ?? elem.textContent ?? '';
}

export function serialize_tierlist(tierlist_div, untiered_images, title_label) {
	const serialized = {
		title: getElementText(title_label),
		rows: [],
	};

	if (tierlist_div) {
		tierlist_div.querySelectorAll('.row').forEach((row, i) => {
			const header = row.querySelector('.header');
			let color_hex = '#ffffff';
			if (header && header.style.backgroundColor) {
				const bg = header.style.backgroundColor;
				if (bg.startsWith('#')) {
					color_hex = bg;
				} else if (bg.includes(',')) {
					const parts = bg.replace(/[^\d,]/g, '').split(',');
					if (parts.length >= 3) {
						color_hex = rgb_to_hex(parts[0], parts[1], parts[2]);
					}
				} else {
					color_hex = bg;
				}
			}

			const label = row.querySelector('.header label');
			const rowName = getElementText(label).substr(0, MAX_NAME_LEN);

			serialized.rows.push({
				name: rowName,
				color: color_hex,
				imgs: []
			});

			row.querySelectorAll('img').forEach((img) => {
				serialized.rows[i].imgs.push(img.src);
			});
		});
	}

	const untiered_imgs = untiered_images ? untiered_images.querySelectorAll('img') : [];
	if (untiered_imgs.length > 0) {
		serialized.untiered = [];
		untiered_imgs.forEach((img) => {
			serialized.untiered.push(img.src);
		});
	}

	return serialized;
}

export function save_tierlist(filename, tierlist_div, untiered_images, title_label, set_unsaved_changes) {
	const data = serialize_tierlist(tierlist_div, untiered_images, title_label);
	if (set_unsaved_changes) {
		set_unsaved_changes(false);
	}
	save(filename, JSON.stringify(data));
	return data;
}

export function load_tierlist(serialized_tierlist, title_label, add_row_fn, create_img_fn, resize_headers_fn, recompute_header_colors_fn, untiered_images, set_unsaved_changes) {
	if (!serialized_tierlist) return;

	if (title_label && serialized_tierlist.title !== undefined) {
		title_label.innerText = serialized_tierlist.title;
		title_label.textContent = serialized_tierlist.title;
	}

	for (let idx in serialized_tierlist.rows) {
		let ser_row = serialized_tierlist.rows[idx];
		let elem = add_row_fn(idx, ser_row.name);

		for (let img_src of ser_row.imgs ?? []) {
			let img = create_img_fn(img_src);
			let td = document.createElement('span');
			td.classList.add('item');
			td.appendChild(img);
			let items_container = elem.querySelector('.items');
			items_container.appendChild(td);
		}

		const label = elem.querySelector('label');
		if (label) {
			label.innerText = ser_row.name;
			label.textContent = ser_row.name;
		}

		if (ser_row.color !== undefined) {
			let header = elem.querySelector('.header');
			header.style.backgroundColor = ser_row.color;
			const colorPicker = header.querySelector('.row-color-picker');
			if (colorPicker) {
				colorPicker.value = ser_row.color;
			}
		} else if (recompute_header_colors_fn) {
			recompute_header_colors_fn(idx);
		}
	}

	if (serialized_tierlist.untiered && untiered_images) {
		for (let img_src of serialized_tierlist.untiered) {
			let img = create_img_fn(img_src);
			untiered_images.appendChild(img);
		}
	}

	if (resize_headers_fn) {
		resize_headers_fn();
	}

	if (set_unsaved_changes) {
		set_unsaved_changes(false);
	}
}
