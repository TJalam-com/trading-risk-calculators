export declare const LOT_UNITS: Readonly<{ standard: 100000; mini: 10000; micro: 1000; nano: 100 }>;

export declare function pipSize(pair: string): 0.01 | 0.0001;

export declare function pipValue(p: { pair: string; units: number; quoteToAccount?: number }): number;

export declare function positionSize(p: {
  balance: number;
  riskPercent: number;
  entry: number;
  stop: number;
  pointValue?: number;
}): { side: "long" | "short"; riskAmount: number; riskPerUnit: number; units: number; positionValue: number };

export declare function forexLotSize(p: {
  balance: number;
  riskPercent: number;
  stopPips: number;
  pipValuePerStandardLot: number;
}): { riskAmount: number; lots: number; units: number; miniLots: number; microLots: number };

export declare function riskReward(p: { entry: number; stop: number; target: number }): {
  risk: number;
  reward: number;
  ratio: number;
  breakevenWinRate: number;
};

export declare function kelly(p: { winRate: number; winLossRatio: number }): {
  raw: number;
  full: number;
  half: number;
  quarter: number;
  hasEdge: boolean;
};

export declare function expectancy(p: { winRate: number; avgWin: number; avgLoss: number }): {
  perTrade: number;
  perTradeR: number;
};
