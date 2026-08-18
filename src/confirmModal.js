'use strict';

let _dialogModal = null;

function getDialogModal() {
	if (_dialogModal) return _dialogModal;
	_dialogModal = document.getElementById('custom-dialog-modal');
	return _dialogModal;
}

/**
 * Shows a custom confirmation modal dialog.
 * @param {Object} options - { title, message, confirmText, cancelText, danger }
 * @returns {Promise<boolean>}
 */
export function showConfirm({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
	return new Promise((resolve) => {
		const modal = getDialogModal();
		if (!modal) {
			resolve(window.confirm(message));
			return;
		}

		const titleEl = modal.querySelector('.dialog-title');
		const messageEl = modal.querySelector('.dialog-message');
		const confirmBtn = modal.querySelector('.dialog-confirm-btn');
		const cancelBtn = modal.querySelector('.dialog-cancel-btn');
		const promptInput = modal.querySelector('.dialog-input');

		if (titleEl) titleEl.textContent = title;
		if (messageEl) messageEl.textContent = message;
		if (promptInput) promptInput.style.display = 'none';

		if (confirmBtn) {
			confirmBtn.textContent = confirmText;
			confirmBtn.className = 'dialog-btn dialog-confirm-btn' + (danger ? ' dialog-btn-danger' : ' dialog-btn-primary');
		}
		if (cancelBtn) cancelBtn.textContent = cancelText;

		modal.classList.remove('hidden');

		const cleanup = (result) => {
			modal.classList.add('hidden');
			confirmBtn.onclick = null;
			cancelBtn.onclick = null;
			resolve(result);
		};

		confirmBtn.onclick = () => cleanup(true);
		cancelBtn.onclick = () => cleanup(false);
	});
}

/**
 * Shows a custom input prompt modal dialog.
 * @param {Object} options - { title, message, defaultValue, placeholder, confirmText, cancelText }
 * @returns {Promise<string|null>}
 */
export function showPrompt({ title = 'Input Required', message = '', defaultValue = '', placeholder = '', confirmText = 'OK', cancelText = 'Cancel' }) {
	return new Promise((resolve) => {
		const modal = getDialogModal();
		if (!modal) {
			resolve(window.prompt(message, defaultValue));
			return;
		}

		const titleEl = modal.querySelector('.dialog-title');
		const messageEl = modal.querySelector('.dialog-message');
		const confirmBtn = modal.querySelector('.dialog-confirm-btn');
		const cancelBtn = modal.querySelector('.dialog-cancel-btn');
		const promptInput = modal.querySelector('.dialog-input');

		if (titleEl) titleEl.textContent = title;
		if (messageEl) messageEl.textContent = message;

		if (promptInput) {
			promptInput.style.display = 'block';
			promptInput.value = defaultValue;
			promptInput.placeholder = placeholder;
			setTimeout(() => {
				promptInput.focus();
				promptInput.select();
			}, 50);
		}

		if (confirmBtn) {
			confirmBtn.textContent = confirmText;
			confirmBtn.className = 'dialog-btn dialog-confirm-btn dialog-btn-primary';
		}
		if (cancelBtn) cancelBtn.textContent = cancelText;

		modal.classList.remove('hidden');

		const cleanup = (result) => {
			modal.classList.add('hidden');
			confirmBtn.onclick = null;
			cancelBtn.onclick = null;
			if (promptInput) promptInput.onkeydown = null;
			resolve(result);
		};

		confirmBtn.onclick = () => cleanup(promptInput ? promptInput.value.trim() : '');
		cancelBtn.onclick = () => cleanup(null);

		if (promptInput) {
			promptInput.onkeydown = (e) => {
				if (e.key === 'Enter') cleanup(promptInput.value.trim());
				if (e.key === 'Escape') cleanup(null);
			};
		}
	});
}
