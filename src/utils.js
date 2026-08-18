'use strict';

export function rgb_to_hex(r, g, b) {
	const rVal = parseInt(r, 10);
	const gVal = parseInt(g, 10);
	const bVal = parseInt(b, 10);
	return "#" + (1 << 24 | rVal << 16 | gVal << 8 | bVal).toString(16).slice(1);
}

export function is_url(str) {
	if (!str || typeof str !== 'string') return false;
	try {
		new URL(str);
		return true;
	} catch (e) {
		return false;
	}
}

// Returns the supplied item's index within a row or bottom container
export function get_item_index(elem, tierlist_div = document.querySelector('.tierlist')) {
	if (!elem || !elem.parentNode) return null;
	const parent_div = (elem.parentNode && elem.parentNode.parentNode && elem.parentNode.parentNode.parentNode)
		? elem.parentNode.parentNode.parentNode
		: null;

	const rows = tierlist_div ? Array.from(tierlist_div.querySelectorAll(".row")) : [];
	const idx = parent_div ? rows.indexOf(parent_div) : -1;
	if (idx !== -1 && rows[idx] !== undefined) {
		const image_node_list = rows[idx].querySelectorAll("img");
		for (let i = 0; i < image_node_list.length; i++) {
			if (image_node_list[i] === elem) {
				return i;
			}
		}
	} else if (parent_div && parent_div.classList && (parent_div.classList.contains("bottom-container") || parent_div.classList.contains("toggleable-container"))) {
		const image_node_list = parent_div.querySelectorAll("img");
		for (let i = 0; i < image_node_list.length; i++) {
			if (image_node_list[i] === elem) {
				// '-4' accounts for the four images in the buttons-container
				// required as part of the parent div changing for moved items
				return i - 4;
			}
		}
	}
	return null;
}

export function save(filename, text) {
	const el = document.createElement('a');
	el.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
	el.setAttribute('download', filename);
	el.style.display = 'none';
	document.body.appendChild(el);
	el.click();
	document.body.removeChild(el);
}
