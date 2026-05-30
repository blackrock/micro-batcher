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

export type SimulateErrorMode =
  | 'none'
  | 'batch-reject'
  | 'batch-mismatch'
  | 'random-batch-reject'
  | 'partial-item-reject';

export type ErrorStrategyMode = 'broadcast' | 'isolate';

export interface ExperimentConfig {
  enableMicroBatcher: boolean;
  batchingIntervalInMs: number;
  payloadWindowSizeLimit: number | undefined;
  shouldUseBatchResolverForSinglePayload: boolean;
  errorStrategy: ErrorStrategyMode;
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

/**
 * Isolate-mode batch resolver. The underlying data is still fetched in a SINGLE batched call
 * (one network round-trip), but the resolver returns an array of per-item promises
 * (Promise<Security>[]) instead of a single Promise<Security[]>.
 *
 * Successful items all resolve together when the single batched call completes, proving the
 * batching is preserved. A failed or cancelled caller, however, rejects immediately — without
 * waiting for the batched call — so it can bail independently of the rest of the batch.
 */
const createIsolateBatchFetchSecurities = (
  latencyMin: number,
  latencyMax: number,
  addLog: (entry: LogEntry) => void,
  simulateError: SimulateErrorMode = 'none'
) => {
  return (cusips: string[]): Promise<Security>[] => {
    // batch-reject in isolate mode throws synchronously -> Micro Batcher falls back to broadcast (all fail)
    if (simulateError === 'batch-reject') {
      addLog({
        timestamp: Date.now(),
        message: `[Batch:isolate] Simulating total failure for [${cusips.join(', ')}] — falls back to broadcast`,
        type: 'error'
      });
      throw new Error('Simulated batch resolver failure');
    }

    // ONE batched underlying call shared by every non-cancelled item in this batch.
    const batchDelay = randomIntFromInterval(latencyMin, latencyMax);
    addLog({
      timestamp: Date.now(),
      message: `[Batch:isolate] Single batched call for ${cusips.length} items [${cusips.join(', ')}] (${batchDelay}ms)`,
      type: 'batch'
    });
    const batchPromise = new Promise<Record<string, Security>>((resolve) => {
      setTimeout(() => {
        addLog({
          timestamp: Date.now(),
          message: `[Batch:isolate] Batched call resolved (${batchDelay}ms) — surviving items settle together`,
          type: 'batch'
        });
        resolve(mockCusipToSecurityDataRecord);
      }, batchDelay);
    });

    const itemPromises = cusips.map((cusip) => {
      // Each item independently has a chance to be cancelled when partial-item-reject is enabled.
      const shouldFail = simulateError === 'partial-item-reject' && Math.random() < 0.4;
      if (shouldFail) {
        // Per-item bail: reject immediately, before the batched call resolves.
        addLog({
          timestamp: Date.now(),
          message: `[Item] ${cusip} cancelled — bails immediately without waiting for the batched call`,
          type: 'error'
        });
        return Promise.reject(new Error(`Simulated per-item cancellation for ${cusip}`));
      }
      // Surviving items resolve from the shared, single batched result.
      return batchPromise.then((records) => records[cusip]);
    });

    // batch-mismatch in isolate mode returns fewer promises than payloads
    if (simulateError === 'batch-mismatch') {
      addLog({
        timestamp: Date.now(),
        message: `[Batch:isolate] Simulating mismatched results — returning ${Math.max(itemPromises.length - 1, 0)} promises instead of ${itemPromises.length}`,
        type: 'error'
      });
      return itemPromises.slice(0, -1);
    }

    return itemPromises;
  };
};

export async function runExperiment(
  cusips: string[],
  config: ExperimentConfig,
  addLog: (entry: LogEntry) => void,
  onResult?: (result: SecurityResult) => void
): Promise<SecurityResult[]> {
  const fetchSingle = createFetchSingleSecurity(config.apiLatencyMin, config.apiLatencyMax, addLog);
  const batchFetch = createBatchFetchSecurities(
    config.apiLatencyMin,
    config.apiLatencyMax,
    addLog,
    config.simulateError
  );
  const isolateBatchFetch = createIsolateBatchFetchSecurities(
    config.apiLatencyMin,
    config.apiLatencyMax,
    addLog,
    config.simulateError
  );

  addLog({
    timestamp: Date.now(),
    message: `Starting experiment with ${cusips.length} securities | Micro Batcher: ${config.enableMicroBatcher ? 'ON' : 'OFF'}`,
    type: 'system'
  });

  const fetchFn = (() => {
    if (config.enableMicroBatcher) {
      addLog({
        timestamp: Date.now(),
        message: `Config: interval=${config.batchingIntervalInMs}ms, windowSize=${config.payloadWindowSizeLimit ?? 'unlimited'}, singlePayloadBatch=${config.shouldUseBatchResolverForSinglePayload}, errorStrategy=${config.errorStrategy}`,
        type: 'info'
      });

      if (config.errorStrategy === 'isolate') {
        return MicroBatcher(fetchSingle)
          .batchResolver(isolateBatchFetch, {
            batchingIntervalInMs: config.batchingIntervalInMs,
            payloadWindowSizeLimit: config.payloadWindowSizeLimit,
            shouldUseBatchResolverForSinglePayload: config.shouldUseBatchResolverForSinglePayload,
            errorStrategy: { type: 'isolate' }
          })
          .build();
      }

      const batchOptions: BatchOptions = {
        batchingIntervalInMs: config.batchingIntervalInMs,
        payloadWindowSizeLimit: config.payloadWindowSizeLimit,
        shouldUseBatchResolverForSinglePayload: config.shouldUseBatchResolverForSinglePayload,
        errorStrategy: { type: 'broadcast' }
      };

      return MicroBatcher(fetchSingle).batchResolver(batchFetch, batchOptions).build();
    } else {
      return fetchSingle;
    }
  })();

  // Attach handlers to each caller's promise so results are reported the moment they settle.
  // In isolate mode, a bailing caller surfaces its error immediately — without waiting for the
  // rest of the batch — which the UI renders as an error card right away.
  const settledPromises = cusips.map((cusip) =>
    fetchFn(cusip)
      .then((data): SecurityResult => {
        const result: SecurityResult = { cusip, status: 'success', data };
        onResult?.(result);
        return result;
      })
      .catch((reason): SecurityResult => {
        const result: SecurityResult = {
          cusip,
          status: 'error',
          error: reason instanceof Error ? reason.message : String(reason)
        };
        onResult?.(result);
        return result;
      })
  );

  return Promise.all(settledPromises);
}

export const ALL_CUSIPS = ['AAPL', 'GOOGL', 'AMZN', 'NFLX', 'FB', 'SPCX', 'NZAC', 'YOTAU', 'IMXI'];

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
