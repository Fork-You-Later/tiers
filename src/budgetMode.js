'use strict';

import { DEFAULT_BUDGET, DEFAULT_TIER_COSTS } from './constants.js';

export class BudgetMode {
	constructor() {
		this.enabled = false;
		this.budget = DEFAULT_BUDGET;
		this.tierCosts = { ...DEFAULT_TIER_COSTS };
		this._displayEl = null;
	}

	setDisplayElement(el) {
		this._displayEl = el;
	}

	enable(budget = DEFAULT_BUDGET) {
		this.enabled = true;
		this.budget = budget;
		this.update(null);
	}

	disable() {
		this.enabled = false;
		this._render(null, null);
	}

	/**
	 * Compute current total spend based on tierlist DOM state.
	 * tierlistDiv: the .tierlist div element
	 */
	computeSpend(tierlistDiv) {
		if (!tierlistDiv) return 0;
		let total = 0;
		tierlistDiv.querySelectorAll('.row').forEach((row) => {
			const label = row.querySelector('.header label');
			if (!label) return;
			const tierName = (label.innerText ?? label.textContent ?? '').trim().toUpperCase();
			const cost = this.tierCosts[tierName];
			if (cost === undefined) return;
			const count = row.querySelectorAll('.items .item').length;
			total += cost * count;
		});
		return total;
	}

	update(tierlistDiv) {
		if (!this.enabled) return;
		const spend = tierlistDiv ? this.computeSpend(tierlistDiv) : 0;
		const remaining = this.budget - spend;
		this._render(spend, remaining);
	}

	_render(spend, remaining) {
		if (!this._displayEl) return;
		if (!this.enabled || spend === null) {
			this._displayEl.classList.add('hidden');
			return;
		}
		this._displayEl.classList.remove('hidden');
		const over = remaining < 0;
		this._displayEl.innerHTML = `
			<span class="budget-label">Budget</span>
			<span class="budget-value ${over ? 'budget-over' : ''}">
				${over ? '⚠️' : '💰'} $${remaining.toFixed(0)} / $${this.budget}
			</span>
		`;
	}

	setBudget(val) {
		this.budget = Number(val) || DEFAULT_BUDGET;
	}

	setTierCost(tierName, cost) {
		this.tierCosts[tierName.toUpperCase()] = Number(cost);
	}
}
