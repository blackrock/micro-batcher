import { DEFAULT_BATCH_WINDOW_MS } from './constants';
import { PayloadManager, PromiseLocker } from './payloadManager';

/**
 * @example
 * type t1 = AsyncFunction<string, string>; // type t1 = (param: string) => Promise<string>
 * type t2 = AsyncFunction<string[], string>; // type t2 = (param: string[]) => Promise<string>
 * type t3 = AsyncFunction<[string, number], string>; // type t3 = (params_0: string, params_1: number) => Promise<string>
 * type t4 = AsyncFunction<[string[], number[], boolean], string>; // type t4 = (params_0: string[], params_1: number[], params_2: boolean) => Promise<string>
 */
type AsyncFunction<TParamType, TReturnType> = TParamType extends void
  ? never
  : TParamType extends [infer _First, ...infer _Rest]
    ? (...params: TParamType) => Promise<TReturnType>
    : (param: TParamType) => Promise<TReturnType>;

/**
 * @internal
 */
type SingleFunctionPayload<TParamType, TReturnType> =
  Parameters<AsyncFunction<TParamType, TReturnType>> extends [infer _First, ...infer Rest]
    ? Rest['length'] extends 0
      ? Parameters<AsyncFunction<TParamType, TReturnType>>[0]
      : Parameters<AsyncFunction<TParamType, TReturnType>>
    : never;

/**
 * @example
 * type b1 = AsyncBatchFunction<string[], string[]>;
 * type b2 = AsyncBatchFunction<string[][], string[]>;
 * type b3 = AsyncBatchFunction<[string, number][], string[]>;
 * type b4 = AsyncBatchFunction<[string[], number[], boolean][], string[]>;
 */
type AsyncBatchFunction<TBatchParamType extends any[], TBatchReturnType extends any[]> = (
  batchParams: TBatchParamType
) => Promise<TBatchReturnType>;

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
    private static _batchResolver:
      | AsyncBatchFunction<SingleFunctionPayload<TParamType, TReturnType>[], TReturnType[]>
      | undefined;
    // The timeout id of the current batcher, can be used for short circuit to start the batcher before the interval if needed (e.g. payloadWindowSizeLimit)
    private static _currentBatchTimeoutId: NodeJS.Timeout | undefined;
    private static _payloadManager = PayloadManager<
      SingleFunctionPayload<TParamType, TReturnType>,
      TReturnType
    >();

    private static _activeBatchCount: number = 0;

    private static batchingIntervalInMs = 0;
    private static payloadWindowSizeLimit: number | undefined = undefined;
    private static shouldUseBatchResolverForSinglePayload: boolean = false;

    constructor(singlePayloadFunction: AsyncFunction<TParamType, TReturnType>) {
      MicroBatcherBuilder._singlePayloadFunction = singlePayloadFunction;
    }

    private static processPayload(
      payloadLockerList: PromiseLocker<
        SingleFunctionPayload<TParamType, TReturnType>,
        TReturnType
      >[]
    ) {
      const payloadList = payloadLockerList.map((pl) => {
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
        payloadList.forEach((payload: SingleFunctionPayload<TParamType, TReturnType>, index) => {
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

    /**
     * @private
     */
    __intercept = (func: AsyncFunction<TParamType, TReturnType>) => {
      const runBatcher = (processCount?: number) => {
        MicroBatcherBuilder._currentBatchTimeoutId = undefined;
        // TODO: add concurrent batcher limit support
        const payloadForBatchProcessing =
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
        apply: async (
          _target,
          _,
          argumentsList: SingleFunctionPayload<TParamType, TReturnType>
        ) => {
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
     * @param batchFunction  - Optional. The batch resolver/function to process the accumulated payload array.
     * @param batchOptions - Optional. Options to configure batching behaviour.
     * @returns
     * - The returned array length and the payload array length are required to be the same.
     * - Each element's position in the result array will be mapped back to the corresponding payload element's position.
     */
    batchResolver = (
      batchFunction: AsyncBatchFunction<
        SingleFunctionPayload<TParamType, TReturnType>[],
        TReturnType[]
      >,
      batchOptions: BatchOptions = DEFAULT_BATCH_OPTIONS
    ) => {
      MicroBatcherBuilder._batchResolver = batchFunction;
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
      return this.__intercept(MicroBatcherBuilder._singlePayloadFunction);
    }
  }

  return new MicroBatcherBuilder(originalFunction);
}
