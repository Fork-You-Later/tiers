/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetMode } from '../src/budgetMode.js';

function buildTierlistDOM(tierData) {
	// tierData: [{name, itemCount}]
	const div = document.createElement('div');
	div.className = 'tierlist';
	tierData.forEach(({ name, itemCount }) => {
		const row = document.createElement('div');
		row.className = 'row';
		const header = document.createElement('span');
		header.className = 'header';
		const label = document.createElement('label');
		label.textContent = name;
		header.appendChild(label);
		row.appendChild(header);

		const items = document.createElement('span');
		items.className = 'items';
		for (let i = 0; i < itemCount; i++) {
			const item = document.createElement('span');
			item.className = 'item';
			items.appendChild(item);
		}
		row.appendChild(items);
		div.appendChild(row);
	});
	return div;
}

describe('budgetMode.js BudgetMode unit tests', () => {
	let budget;

	beforeEach(() => {
		budget = new BudgetMode();
	});

	it('should start as disabled', () => {
		expect(budget.enabled).toBe(false);
	});

	it('should enable with a configurable budget', () => {
		budget.enable(20);
		expect(budget.enabled).toBe(true);
		expect(budget.budget).toBe(20);
	});

	it('should compute spend correctly from tierlist DOM', () => {
		budget.enable(15);
		// S costs 5, A costs 4
		const dom = buildTierlistDOM([
			{ name: 'S', itemCount: 2 },  // 2 * 5 = 10
			{ name: 'A', itemCount: 1 },  // 1 * 4 = 4
		]);
		const spend = budget.computeSpend(dom);
		expect(spend).toBe(14); // 10 + 4
	});

	it('should return correct remaining budget', () => {
		budget.enable(15);
		const dom = buildTierlistDOM([
			{ name: 'S', itemCount: 1 }, // 5
			{ name: 'B', itemCount: 1 }, // 3
		]);
		budget.update(dom);
		const spend = budget.computeSpend(dom);
		const remaining = budget.budget - spend;
		expect(remaining).toBe(7); // 15 - 5 - 3
	});

	it('should flag over-budget correctly', () => {
		budget.enable(5);
		const dom = buildTierlistDOM([
			{ name: 'S', itemCount: 2 }, // 10, over budget of 5
		]);
		const spend = budget.computeSpend(dom);
		expect(budget.budget - spend).toBeLessThan(0);
	});

	it('should disable cleanly', () => {
		budget.enable(15);
		budget.disable();
		expect(budget.enabled).toBe(false);
	});

	it('should handle unknown tier names gracefully (cost = 0)', () => {
		budget.enable(15);
		const dom = buildTierlistDOM([
			{ name: 'CUSTOM', itemCount: 3 }, // unknown tier, cost undefined → skip
		]);
		const spend = budget.computeSpend(dom);
		expect(spend).toBe(0);
	});

	it('should allow setting custom tier costs', () => {
		budget.enable(10);
		budget.setTierCost('S', 10);
		const dom = buildTierlistDOM([{ name: 'S', itemCount: 1 }]);
		expect(budget.computeSpend(dom)).toBe(10);
	});
});
