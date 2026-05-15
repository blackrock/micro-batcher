import { MicroBatcher, BatchOptions } from 'micro-batcher';

export type Security = {
  cusip: string;
  security: string;
  price: number;
  marketCap: number;
};

export type SecurityResult =
  | { cusip: string; status: 'success'; data: Security }
  | { cusip: string; status: 'error'; error: string };

export type SimulateErrorMode = 'none' | 'batch-reject' | 'batch-mismatch' | 'random-batch-reject';

export interface ExperimentConfig {
  enableMicroBatcher: boolean;
  batchingIntervalInMs: number;
  payloadWindowSizeLimit: number | undefined;
  shouldUseBatchResolverForSinglePayload: boolean;
  apiLatencyMin: number;
  apiLatencyMax: number;
  simulateError: SimulateErrorMode;
}

export type LogEntry = {
  timestamp: number;
  message: string;
  type: 'info' | 'batch' | 'single' | 'system' | 'error';
};

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const createFetchSingleSecurity = (
  latencyMin: number,
  latencyMax: number,
  addLog: (entry: LogEntry) => void
) => {
  return async (cusip: string): Promise<Security> => {
    return new Promise((resolve) => {
      const delay = randomIntFromInterval(latencyMin, latencyMax);
      setTimeout(() => {
        resolve(mockCusipToSecurityDataRecord[cusip]);
        addLog({
          timestamp: Date.now(),
          message: `[Single] Fetched ${cusip} (${delay}ms)`,
          type: 'single'
        });
      }, delay);
    });
  };
};

const createBatchFetchSecurities = (
  latencyMin: number,
  latencyMax: number,
  addLog: (entry: LogEntry) => void,
  simulateError: SimulateErrorMode = 'none'
) => {
  return async (cusips: string[]): Promise<Security[]> => {
    return new Promise((resolve, reject) => {
      const delay = randomIntFromInterval(latencyMin, latencyMax);
      setTimeout(() => {
        if (simulateError === 'batch-reject') {
          addLog({
            timestamp: Date.now(),
            message: `[Batch] Simulating rejection for [${cusips.join(', ')}]`,
            type: 'error'
          });
          reject(new Error('Simulated batch resolver failure'));
          return;
        }

        if (simulateError === 'random-batch-reject') {
          const shouldFail = Math.random() < 0.5;
          if (shouldFail) {
            addLog({
              timestamp: Date.now(),
              message: `[Batch] Random failure for [${cusips.join(', ')}]`,
              type: 'error'
            });
            reject(new Error(`Random batch failure for [${cusips.join(', ')}]`));
            return;
          }
        }

        if (simulateError === 'batch-mismatch') {
          addLog({
            timestamp: Date.now(),
            message: `[Batch] Simulating mismatched results for [${cusips.join(', ')}] — returning only 1 result instead of ${cusips.length}`,
            type: 'error'
          });
          resolve([mockCusipToSecurityDataRecord[cusips[0]]]);
          return;
        }

        resolve(cusips.map((cusip) => mockCusipToSecurityDataRecord[cusip]));
        addLog({
          timestamp: Date.now(),
          message: `[Batch] Fetched [${cusips.join(', ')}] (${delay}ms)`,
          type: 'batch'
        });
      }, delay);
    });
  };
};

export async function runExperiment(
  cusips: string[],
  config: ExperimentConfig,
  addLog: (entry: LogEntry) => void
): Promise<SecurityResult[]> {
  const fetchSingle = createFetchSingleSecurity(config.apiLatencyMin, config.apiLatencyMax, addLog);
  const batchFetch = createBatchFetchSecurities(config.apiLatencyMin, config.apiLatencyMax, addLog, config.simulateError);

  addLog({
    timestamp: Date.now(),
    message: `Starting experiment with ${cusips.length} securities | Micro Batcher: ${config.enableMicroBatcher ? 'ON' : 'OFF'}`,
    type: 'system'
  });

  const fetchFn = (() => {
    if (config.enableMicroBatcher) {
      const batchOptions: BatchOptions = {
        batchingIntervalInMs: config.batchingIntervalInMs,
        payloadWindowSizeLimit: config.payloadWindowSizeLimit,
        shouldUseBatchResolverForSinglePayload: config.shouldUseBatchResolverForSinglePayload
      };

      addLog({
        timestamp: Date.now(),
        message: `Config: interval=${config.batchingIntervalInMs}ms, windowSize=${config.payloadWindowSizeLimit ?? 'unlimited'}, singlePayloadBatch=${config.shouldUseBatchResolverForSinglePayload}`,
        type: 'info'
      });

      return MicroBatcher(fetchSingle)
        .batchResolver(batchFetch, batchOptions)
        .build();
    } else {
      return fetchSingle;
    }
  })();

  const settled = await Promise.allSettled(cusips.map((cusip) => fetchFn(cusip)));

  return settled.map((result, index) => {
    const cusip = cusips[index];
    if (result.status === 'fulfilled') {
      return { cusip, status: 'success' as const, data: result.value };
    } else {
      return { cusip, status: 'error' as const, error: result.reason instanceof Error ? result.reason.message : String(result.reason) };
    }
  });
}

export const ALL_CUSIPS = [
  'AAPL',
  'GOOGL',
  'AMZN',
  'NFLX',
  'FB',
  'SPCX',
  'NZAC',
  'YOTAU',
  'IMXI'
];

const mockCusipToSecurityDataRecord: Record<string, Security> = {
  AAPL: {
    cusip: 'AAPL',
    security: 'Apple Inc',
    price: 145.83,
    marketCap: 2410000000000
  },
  GOOGL: {
    cusip: 'GOOGL',
    security: 'Alphabet Inc',
    price: 2735.93,
    marketCap: 1840000000000
  },
  AMZN: {
    cusip: 'AMZN',
    security: 'Amazon.com Inc',
    price: 3379.09,
    marketCap: 1700000000000
  },
  NFLX: {
    cusip: 'NFLX',
    security: 'Netflix Inc',
    price: 513.97,
    marketCap: 227000000000
  },
  FB: {
    cusip: 'FB',
    security: 'Meta Platforms Inc',
    price: 336.61,
    marketCap: 950000000000
  },
  SPCX: {
    cusip: 'SPCX',
    security: 'Space Exploration Technologies Corp',
    price: 20.0,
    marketCap: 100000000000
  },
  NZAC: {
    cusip: 'NZAC',
    security: 'New Zealand Acquisition Corp',
    price: 10.0,
    marketCap: 50000000000
  },
  YOTAU: {
    cusip: 'YOTAU',
    security: 'YOTA Corp',
    price: 15.0,
    marketCap: 75000000000
  },
  IMXI: {
    cusip: 'IMXI',
    security: 'IMX Inc',
    price: 25.0,
    marketCap: 125000000000
  }
};
