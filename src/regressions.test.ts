import { MicroBatcher } from '.';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolver settlement regressions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects synchronous batch throws and can process a later batch', async () => {
    vi.useFakeTimers();
    const error = new Error('sync batch failure');
    const resolver = vi.fn((values: number[]): Promise<number[]> => {
      throw error;
    });
    const fn = MicroBatcher<number, number>(async (v) => v)
      .batchResolver(resolver)
      .build();
    const settled = Promise.allSettled([fn(1), fn(2)]);
    await vi.runAllTimersAsync();
    expect(await settled).toEqual([
      { status: 'rejected', reason: error },
      { status: 'rejected', reason: error }
    ]);
    resolver.mockImplementation(async (values) => values);
    const next = Promise.all([fn(3), fn(4)]);
    await vi.runAllTimersAsync();
    expect(await next).toEqual([3, 4]);
  });

  it('continues processing individual calls after a synchronous throw', async () => {
    vi.useFakeTimers();
    const error = new Error('sync single failure');
    const fn = MicroBatcher<number, number>((v) => {
      if (v === 1) throw error;
      return Promise.resolve(v);
    }).build();
    const settled = Promise.allSettled([fn(1), fn(2)]);
    await vi.runAllTimersAsync();
    expect(await settled).toEqual([
      { status: 'rejected', reason: error },
      { status: 'fulfilled', value: 2 }
    ]);
  });

  it('settles sparse broadcast result slots as undefined', async () => {
    vi.useFakeTimers();
    const fn = MicroBatcher<number, number | undefined>(async (v) => v)
      .batchResolver(async () => new Array<number | undefined>(2))
      .build();
    let result: (number | undefined)[] | undefined;
    const settled = Promise.all([fn(1), fn(2)]).then((values) => {
      result = values;
    });
    await vi.runAllTimersAsync();
    expect(result).toEqual([undefined, undefined]);
    await settled;
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid payload limit %s', (limit) => {
    expect(() =>
      MicroBatcher<number, number>(async (v) => v).batchResolver(async (values) => values, {
        payloadWindowSizeLimit: limit
      })
    ).toThrow(RangeError);
  });

  it('observes rejected isolate promises even when result length mismatches', async () => {
    vi.useFakeTimers();
    const fn = MicroBatcher<number, number>(async (v) => v)
      .batchResolver(() => [Promise.reject(new Error('orphan rejection'))], {
        errorStrategy: { type: 'isolate' }
      })
      .build();
    const settled = Promise.allSettled([fn(1), fn(2)]);
    await vi.runAllTimersAsync();
    expect((await settled).map((value) => value.status)).toEqual(['rejected', 'rejected']);
  });

  it('observes a rejected top-level promise from an invalid isolate resolver', async () => {
    vi.useFakeTimers();
    const fn = MicroBatcher<number, number>(async (v) => v)
      .batchResolver(
        async () => {
          throw new Error('invalid isolate promise');
        },
        { errorStrategy: { type: 'isolate' } }
      )
      .build();
    const settled = Promise.allSettled([fn(1), fn(2)]);
    await vi.runAllTimersAsync();
    for (const result of await settled) {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(TypeError);
      }
    }
  });
});
