/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { updateElo, expectedScore } from '../src/eloSorter.js';

describe('eloSorter.js Elo math unit tests', () => {
	describe('expectedScore', () => {
		it('should return 0.5 for two equal ratings', () => {
			const score = expectedScore(1000, 1000);
			expect(score).toBeCloseTo(0.5, 5);
		});

		it('should return > 0.5 when first player has higher rating', () => {
			expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
		});

		it('should return < 0.5 when first player has lower rating', () => {
			expect(expectedScore(900, 1100)).toBeLessThan(0.5);
		});

		it('should be symmetric (a vs b + b vs a = 1)', () => {
			const a = expectedScore(1200, 800);
			const b = expectedScore(800, 1200);
			expect(a + b).toBeCloseTo(1, 5);
		});
	});

	describe('updateElo', () => {
		it('should increase winner rating and decrease loser rating', () => {
			const { winner, loser } = updateElo(1000, 1000);
			expect(winner).toBeGreaterThan(1000);
			expect(loser).toBeLessThan(1000);
		});

		it('should keep the sum of ratings constant (zero-sum property)', () => {
			const initial = 1000 + 1000;
			const { winner, loser } = updateElo(1000, 1000);
			expect(winner + loser).toBe(initial);
		});

		it('should change ratings less when favorite wins vs underdog wins', () => {
			// Favourite (1400) beats underdog (1000) — expected, smaller Elo change
			const { winner: favW, loser: favL } = updateElo(1400, 1000);
			const favChange = favW - 1400;

			// Underdog (1000) beats favourite (1400) — upset, bigger Elo change
			const { winner: dogW, loser: dogL } = updateElo(1000, 1400);
			const dogChange = dogW - 1000;

			expect(dogChange).toBeGreaterThan(favChange);
		});

		it('should return whole numbers', () => {
			const { winner, loser } = updateElo(1050, 950);
			expect(Number.isInteger(winner)).toBe(true);
			expect(Number.isInteger(loser)).toBe(true);
		});
	});
});
