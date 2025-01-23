import { DEFAULT_BATCH_WINDOW_MS } from './constants';
import { PayloadManager, PromiseLocker } from './payloadManager';

type AsyncFunction<TParamType, TReturnType> = TParamType extends void
  ? never
  : TParamType extends any[]
    ? (...params: TParamType) => Promise<TReturnType>
    : (param: TParamType) => Promise<TReturnType>;

type PayloadParam<TParamType> = TParamType extends any[] ? TParamType : [TParamType];

/**
 * Previous Implementation:
 * type AsyncBatchFunction<T extends any[], O> = (arg: T[]) => Promise<O>;
 */
type AsyncBatchFunction<TParamType, TReturnType> = (
  params: PayloadParam<TParamType>[]
) => Promise<TReturnType[]>;

export interface BatchOptions {
  /**
   * Optional. Default is 50ms, override to set the interval for batching the payload.
   */
  batchingIntervalInMs?: number;
  /**
   * Optional. If set with a valid size, once the current payload queue reaches the limit before the interval ends, kick start the batcher immediately.
   */
  payloadWindowSizeLimit?: number;
  /**
   * Optional. Default is false, determine if should go through batch resolver function even for single payload.
   */
  shouldUseBatchResolverForSinglePayload?: boolean;
}

const DEFAULT_BATCH_OPTIONS: BatchOptions = {};

export function MicroBatcher<TParamType, TReturnType>(
  originalFunction: AsyncFunction<TParamType, TReturnType>
) {
  /** @hideconstructor */
  class MicroBatcherBuilder {
    private static _singlePayloadFunction: AsyncFunction<TParamType, TReturnType>;
    private static _batchResolver: AsyncBatchFunction<TParamType, TReturnType> | undefined;
    // The timeout id of the current batcher, can be used for short circuit to start the batcher before the interval if needed (e.g. payloadWindowSizeLimit)
    private static _currentBatchTimeoutId: NodeJS.Timeout | undefined;
    private static _payloadManager = PayloadManager<PayloadParam<TParamType>, TReturnType>();

    private static _activeBatchCount: number = 0;

    private static batchingIntervalInMs = 0;
    private static payloadWindowSizeLimit: number | undefined = undefined;
    private static shouldUseBatchResolverForSinglePayload: boolean = false;

    constructor(singlePayloadFunction: AsyncFunction<TParamType, TReturnType>) {
      MicroBatcherBuilder._singlePayloadFunction = singlePayloadFunction;
    }

    private static processPayload(
      payloadLockerList: PromiseLocker<PayloadParam<TParamType>, TReturnType>[]
    ) {
      const payloadList: PayloadParam<TParamType>[] = payloadLockerList.map((pl) => {
        return pl.payload;
      });

      const shouldUseBatchResolver =
        payloadList.length > 1 ||
        (MicroBatcherBuilder.shouldUseBatchResolverForSinglePayload && payloadList.length === 1);
      if (MicroBatcherBuilder._batchResolver && shouldUseBatchResolver) {
        MicroBatcherBuilder._activeBatchCount++;
        MicroBatcherBuilder._batchResolver(payloadList)
          .then((results) => {
            if (results.length !== payloadList.length) {
              throw Error(
                `Batch function has different number of results (${results.length}) as payload (${payloadList.length})`
              );
            }
            results.forEach((result, index) => {
              const {
                promiseLock: { release }
              } = payloadLockerList[index];
              release(result);
            });
          })
          .finally(() => {
            MicroBatcherBuilder._activeBatchCount--;
          });
      } else {
        payloadList.forEach((payload: PayloadParam<TParamType>, index) => {
          const {
            promiseLock: { release, releaseWithError }
          } = payloadLockerList[index];
          MicroBatcherBuilder._activeBatchCount++;

          // TODO: Try to make type better without ts-ignore
          // @ts-ignore
          MicroBatcherBuilder._singlePayloadFunction(...payload)
            .then((result) => {
              release(result);
            })
            .catch((e) => {
              releaseWithError(e);
            })
            .finally(() => {
              MicroBatcherBuilder._activeBatchCount--;
            });
        });
      }
    }

    private intercept = (func: AsyncFunction<TParamType, TReturnType>) => {
      const runBatcher = (processCount?: number) => {
        MicroBatcherBuilder._currentBatchTimeoutId = undefined;
        // TODO: add concurrent batcher limit support
        const payloadForBatchProcessing: PromiseLocker<PayloadParam<TParamType>, TReturnType>[] =
          MicroBatcherBuilder._payloadManager.consumePayloadList(processCount);
        MicroBatcherBuilder.processPayload(payloadForBatchProcessing);
      };

      const startBatcherEarlierIfEligible = () => {
        const currentPayloadSize: number = MicroBatcherBuilder._payloadManager.getCurrentSize();
        if (
          MicroBatcherBuilder.payloadWindowSizeLimit !== undefined &&
          MicroBatcherBuilder.payloadWindowSizeLimit <= currentPayloadSize
        ) {
          clearTimeout(MicroBatcherBuilder._currentBatchTimeoutId);
          runBatcher(MicroBatcherBuilder.payloadWindowSizeLimit);
        }
      };

      return new Proxy(func, {
        apply: async (_target, _, argumentsList: PayloadParam<TParamType>) => {
          const result: () => Promise<TReturnType> =
            MicroBatcherBuilder._payloadManager.submitPayload(argumentsList);

          if (MicroBatcherBuilder._currentBatchTimeoutId === undefined) {
            const timeoutId = setTimeout(() => {
              runBatcher();
            }, MicroBatcherBuilder.batchingIntervalInMs);
            MicroBatcherBuilder._currentBatchTimeoutId = timeoutId;
          }

          startBatcherEarlierIfEligible();

          return result().catch((e) => {
            throw Error(e);
          });
        }
      });
    };

    /**
     *
     * @param batch  - Optional. The batch resolver/function to process the accumulated payload array.
     * @param batchOptions - Optional. Options to configure batching behaviour.
     * @returns
     * - The returned array length and the payload array length are required to be the same.
     * - Each element's position in the result array will be mapped back to the corresponding payload element's position.
     */
    batchResolver = (
      batch: AsyncBatchFunction<TParamType, TReturnType>,
      batchOptions: BatchOptions = DEFAULT_BATCH_OPTIONS
    ) => {
      MicroBatcherBuilder._batchResolver = batch;
      const {
        payloadWindowSizeLimit,
        batchingIntervalInMs = DEFAULT_BATCH_WINDOW_MS,
        shouldUseBatchResolverForSinglePayload = false
      } = batchOptions;
      MicroBatcherBuilder.payloadWindowSizeLimit = payloadWindowSizeLimit;
      MicroBatcherBuilder.batchingIntervalInMs = batchingIntervalInMs;
      MicroBatcherBuilder.shouldUseBatchResolverForSinglePayload =
        shouldUseBatchResolverForSinglePayload;

      return this;
    };

    build(): AsyncFunction<TParamType, TReturnType> {
      return this.intercept(MicroBatcherBuilder._singlePayloadFunction);
    }
  }

  return new MicroBatcherBuilder(originalFunction);
}
