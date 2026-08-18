// vitest.setup.js
// Polyfill Blob.arrayBuffer() for jsdom which doesn't implement it natively.
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
	Blob.prototype.arrayBuffer = function () {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(this);
		});
	};
}

// Polyfill FileReader in case it's also missing
if (typeof FileReader === 'undefined') {
	global.FileReader = class {
		readAsArrayBuffer(blob) {
			const text = blob._buffer || new ArrayBuffer(0);
			setTimeout(() => {
				this.result = text;
				if (this.onload) this.onload();
			}, 0);
		}
	};
}
