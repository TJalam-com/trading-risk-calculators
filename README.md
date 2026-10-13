# trading-risk-calculators

Small, dependency-free JavaScript functions for the risk maths every trading app needs. They cover position size, forex lot size, pip value, risk:reward, the Kelly criterion and expectancy.

- Zero dependencies, ESM, with TypeScript types included
- Every function validates its inputs and throws `RangeError` on bad values. A typo can't silently turn into a 10x position.
- Tested with `node:test` (`npm test`)

## Install

```bash
npm install github:TJalam-com/trading-risk-calculators
```

## Usage

```js
import { positionSize, forexLotSize, pipValue, riskReward, kelly, expectancy } from "trading-risk-calculators";

// Stocks / crypto: $10,000 account, risk 1%, entry 150, stop 145
positionSize({ balance: 10_000, riskPercent: 1, entry: 150, stop: 145 });
// → { side: "long", riskAmount: 100, riskPerUnit: 5, units: 20, positionValue: 3000 }

// Futures: pass the contract multiplier as pointValue (ES = 50)
positionSize({ balance: 25_000, riskPercent: 2, entry: 5000, stop: 4990, pointValue: 50 });
// → units: 1 contract

// Forex: $10,000, 1%, 50-pip stop, $10 per pip per standard lot
forexLotSize({ balance: 10_000, riskPercent: 1, stopPips: 50, pipValuePerStandardLot: 10 });
// → { riskAmount: 100, lots: 0.2, units: 20000, miniLots: 2, microLots: 20 }

// Pip value in your account currency (USD account, USD/JPY at 150)
pipValue({ pair: "USD/JPY", units: 100_000, quoteToAccount: 1 / 150 }); // → 6.67

// Risk:reward and the win rate you need to break even
riskReward({ entry: 150, stop: 145, target: 165 });
// → { risk: 5, reward: 15, ratio: 3, breakevenWinRate: 0.25 }

// Kelly criterion (clamped to 0..1; most traders use half or quarter Kelly)
kelly({ winRate: 0.55, winLossRatio: 1 });
// → { raw: 0.1, full: 0.1, half: 0.05, quarter: 0.025, hasEdge: true }

// Expectancy per trade, in money and in R
expectancy({ winRate: 0.4, avgWin: 300, avgLoss: 100 });
// → { perTrade: 60, perTradeR: 0.6 }
```

## Formulas

| Function | Formula |
|---|---|
| `positionSize` | units = (balance × risk%) ÷ (\|entry − stop\| × pointValue) |
| `forexLotSize` | lots = (balance × risk%) ÷ (stopPips × pip value per standard lot) |
| `pipValue` | pip size (0.01 for JPY quotes, else 0.0001) × units × quote→account rate |
| `riskReward` | ratio = \|target − entry\| ÷ \|entry − stop\|; break-even win rate = 1 ÷ (1 + ratio) |
| `kelly` | f* = (b·p − q) ÷ b, where b = win/loss ratio, p = win rate, q = 1 − p |
| `expectancy` | E = p × avgWin − (1 − p) × avgLoss |

## Try them in the browser

These are the same calculations used by the free calculators on MoneyFlock: [position size](https://www.moneyflock.com/tools/forex-position-size-calculator), [lot size](https://www.moneyflock.com/tools/lot-size-calculator), [pip value](https://www.moneyflock.com/tools/pip-value-calculator), [trade risk](https://www.moneyflock.com/tools/trade-risk-calculator) and [Kelly criterion](https://www.moneyflock.com/tools/kelly-criterion-calculator).

## Disclaimer

This is educational software, not financial advice. Check your broker's contract specs (lot size, pip value, multiplier) before you trade.

## License

[MIT](LICENSE)
