import test from "node:test";
import assert from "node:assert/strict";
import { pipSize, pipValue, positionSize, forexLotSize, riskReward, kelly, expectancy, LOT_UNITS } from "../src/index.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("pipSize: JPY quote pairs use 0.01", () => {
  assert.equal(pipSize("EUR/USD"), 0.0001);
  assert.equal(pipSize("usdjpy"), 0.01);
  assert.equal(pipSize("GBP/JPY"), 0.01);
  assert.throws(() => pipSize("EURO"), RangeError);
});

test("pipValue: 1 standard lot EUR/USD on a USD account = $10", () => {
  close(pipValue({ pair: "EUR/USD", units: LOT_UNITS.standard }), 10);
  // USD account, USD/JPY at 150: pip = 0.01 * 100000 JPY = 1000 JPY = $6.67
  close(pipValue({ pair: "USD/JPY", units: 100_000, quoteToAccount: 1 / 150 }), 1000 / 150);
});

test("positionSize: $10k, 1% risk, entry 150 stop 145 → 20 shares", () => {
  const r = positionSize({ balance: 10_000, riskPercent: 1, entry: 150, stop: 145 });
  assert.equal(r.side, "long");
  close(r.riskAmount, 100);
  close(r.units, 20);
  close(r.positionValue, 3000);
  const s = positionSize({ balance: 10_000, riskPercent: 1, entry: 100, stop: 102 });
  assert.equal(s.side, "short");
  close(s.units, 50);
  // futures: ES point value 50, 10-point stop, $25k, 2% → 1 contract
  close(positionSize({ balance: 25_000, riskPercent: 2, entry: 5000, stop: 4990, pointValue: 50 }).units, 1);
});

test("positionSize rejects nonsense", () => {
  assert.throws(() => positionSize({ balance: 0, riskPercent: 1, entry: 1, stop: 2 }), RangeError);
  assert.throws(() => positionSize({ balance: 1000, riskPercent: 150, entry: 1, stop: 2 }), RangeError);
  assert.throws(() => positionSize({ balance: 1000, riskPercent: 1, entry: 5, stop: 5 }), RangeError);
  assert.throws(() => positionSize({ balance: "1000", riskPercent: 1, entry: 5, stop: 4 }), RangeError);
});

test("forexLotSize: $10k, 1%, 50 pips, $10/pip → 0.2 lots", () => {
  const r = forexLotSize({ balance: 10_000, riskPercent: 1, stopPips: 50, pipValuePerStandardLot: 10 });
  close(r.lots, 0.2);
  close(r.units, 20_000);
  close(r.miniLots, 2);
  close(r.microLots, 20);
});

test("riskReward: 1:3 needs 25% wins to break even", () => {
  const r = riskReward({ entry: 150, stop: 145, target: 165 });
  close(r.ratio, 3);
  close(r.breakevenWinRate, 0.25);
  assert.throws(() => riskReward({ entry: 150, stop: 145, target: 140 }), RangeError);
});

test("kelly: 55% wins, 1:1 → 10% full, 5% half; no edge → 0", () => {
  const k = kelly({ winRate: 0.55, winLossRatio: 1 });
  close(k.full, 0.1);
  close(k.half, 0.05);
  assert.equal(k.hasEdge, true);
  const none = kelly({ winRate: 0.4, winLossRatio: 1 });
  assert.equal(none.full, 0);
  assert.equal(none.hasEdge, false);
});

test("expectancy: 40% wins, avg win 300, avg loss 100 → +$60 (+0.6R)", () => {
  const e = expectancy({ winRate: 0.4, avgWin: 300, avgLoss: 100 });
  close(e.perTrade, 60);
  close(e.perTradeR, 0.6);
});
