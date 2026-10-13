// trading-risk-calculators
// Small, dependency-free position sizing and risk maths for traders.
// Every function validates its inputs and throws RangeError on bad values,
// so a typo never silently becomes a 10x position.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function need(name, value, { min = -Infinity, max = Infinity, exclusiveMin = false } = {}) {
  if (!isNum(value)) throw new RangeError(`${name} must be a finite number`);
  if (exclusiveMin ? value <= min : value < min) {
    throw new RangeError(`${name} must be ${exclusiveMin ? ">" : ">="} ${min}`);
  }
  if (value > max) throw new RangeError(`${name} must be <= ${max}`);
  return value;
}

/** Units in one standard / mini / micro / nano forex lot. */
export const LOT_UNITS = Object.freeze({ standard: 100_000, mini: 10_000, micro: 1_000, nano: 100 });

/**
 * Pip size for a currency pair: 0.01 when JPY is the quote currency, else 0.0001.
 * @param {string} pair e.g. "EUR/USD", "USDJPY"
 */
export function pipSize(pair) {
  if (typeof pair !== "string" || !/^[A-Z]{3}\/?[A-Z]{3}$/i.test(pair.trim())) {
    throw new RangeError('pair must look like "EUR/USD" or "EURUSD"');
  }
  return pair.trim().toUpperCase().endsWith("JPY") ? 0.01 : 0.0001;
}

/**
 * Value of one pip for a position, in the account currency.
 * @param {object} p
 * @param {string} p.pair            e.g. "GBP/JPY"
 * @param {number} p.units           position size in base-currency units (1 standard lot = 100000)
 * @param {number} [p.quoteToAccount=1] price of 1 unit of the QUOTE currency in the account currency
 *   (1 when the account currency is the quote currency; for a USD account on GBP/JPY pass 1 / the USD/JPY rate)
 */
export function pipValue({ pair, units, quoteToAccount = 1 }) {
  need("units", units, { min: 0, exclusiveMin: true });
  need("quoteToAccount", quoteToAccount, { min: 0, exclusiveMin: true });
  return pipSize(pair) * units * quoteToAccount;
}

/**
 * Fixed-fractional position size for any instrument priced per unit
 * (stocks, ETFs, crypto, futures with pointValue).
 * @param {object} p
 * @param {number} p.balance       account balance
 * @param {number} p.riskPercent   % of balance to risk, e.g. 1 for 1%
 * @param {number} p.entry         entry price
 * @param {number} p.stop          stop-loss price (below entry for longs, above for shorts)
 * @param {number} [p.pointValue=1] money per 1.0 price move per unit (futures multiplier)
 */
export function positionSize({ balance, riskPercent, entry, stop, pointValue = 1 }) {
  need("balance", balance, { min: 0, exclusiveMin: true });
  need("riskPercent", riskPercent, { min: 0, max: 100, exclusiveMin: true });
  need("entry", entry, { min: 0, exclusiveMin: true });
  need("stop", stop, { min: 0, exclusiveMin: true });
  need("pointValue", pointValue, { min: 0, exclusiveMin: true });
  if (entry === stop) throw new RangeError("stop must differ from entry");

  const riskAmount = balance * (riskPercent / 100);
  const riskPerUnit = Math.abs(entry - stop) * pointValue;
  const units = riskAmount / riskPerUnit;
  return {
    side: stop < entry ? "long" : "short",
    riskAmount,
    riskPerUnit,
    units,
    positionValue: units * entry * pointValue,
  };
}

/**
 * Forex lot size from account risk and stop distance in pips.
 * @param {object} p
 * @param {number} p.balance
 * @param {number} p.riskPercent
 * @param {number} p.stopPips
 * @param {number} p.pipValuePerStandardLot pip value of 1 standard lot in the account currency
 *   (10 for XXX/USD pairs on a USD account; use pipValue() for others)
 */
export function forexLotSize({ balance, riskPercent, stopPips, pipValuePerStandardLot }) {
  need("balance", balance, { min: 0, exclusiveMin: true });
  need("riskPercent", riskPercent, { min: 0, max: 100, exclusiveMin: true });
  need("stopPips", stopPips, { min: 0, exclusiveMin: true });
  need("pipValuePerStandardLot", pipValuePerStandardLot, { min: 0, exclusiveMin: true });

  const riskAmount = balance * (riskPercent / 100);
  const lots = riskAmount / (stopPips * pipValuePerStandardLot);
  return {
    riskAmount,
    lots,
    units: lots * LOT_UNITS.standard,
    miniLots: lots * 10,
    microLots: lots * 100,
  };
}

/**
 * Risk:reward of a planned trade and the win rate needed to break even.
 * @param {object} p
 * @param {number} p.entry
 * @param {number} p.stop
 * @param {number} p.target
 */
export function riskReward({ entry, stop, target }) {
  need("entry", entry);
  need("stop", stop);
  need("target", target);
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) throw new RangeError("stop must differ from entry");
  const isLong = stop < entry;
  if (isLong ? target <= entry : target >= entry) {
    throw new RangeError("target must be on the profit side of entry");
  }
  const ratio = reward / risk;
  return { risk, reward, ratio, breakevenWinRate: 1 / (1 + ratio) };
}

/**
 * Kelly criterion stake as a fraction of bankroll, clamped to [0, 1].
 * @param {object} p
 * @param {number} p.winRate       probability of a win, 0..1
 * @param {number} p.winLossRatio  average win ÷ average loss (b)
 */
export function kelly({ winRate, winLossRatio }) {
  need("winRate", winRate, { min: 0, max: 1 });
  need("winLossRatio", winLossRatio, { min: 0, exclusiveMin: true });
  const raw = (winLossRatio * winRate - (1 - winRate)) / winLossRatio;
  const full = Math.max(0, Math.min(1, raw));
  return { raw, full, half: full / 2, quarter: full / 4, hasEdge: raw > 0 };
}

/**
 * Expected value per trade, in money and in R (multiples of the average loss).
 * @param {object} p
 * @param {number} p.winRate 0..1
 * @param {number} p.avgWin  average winning trade (positive)
 * @param {number} p.avgLoss average losing trade (positive number)
 */
export function expectancy({ winRate, avgWin, avgLoss }) {
  need("winRate", winRate, { min: 0, max: 1 });
  need("avgWin", avgWin, { min: 0 });
  need("avgLoss", avgLoss, { min: 0, exclusiveMin: true });
  const perTrade = winRate * avgWin - (1 - winRate) * avgLoss;
  return { perTrade, perTradeR: perTrade / avgLoss };
}
