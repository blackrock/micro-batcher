import { MicroBatcher } from '.';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_BATCH_THRESHOLD = 200;
// The timeout needs to be greater than DEFAULT_BATCH_THRESHOLD to stress test MicroBatcher
const DEFAULT_API_RESPONSE_TIME = 300;

describe('object parameter test', () => {
  interface UserData {
    id: number;
    name: string;
  }

  const mockProcessUserFunction: (user: UserData) => Promise<string> = vi
    .fn()
    .mockImplementation(async (user: UserData): Promise<string> => {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(`User ${user.id}: ${user.name}`);
        }, DEFAULT_API_RESPONSE_TIME);
      });
    });

  const mockProcessUserBatchResolver: (payloadList: UserData[]) => Promise<string[]> = vi
    .fn()
    .mockImplementation(async (payloadList: UserData[]): Promise<string[]> => {
      const result: Promise<string>[] = [];
      payloadList.forEach((user) => {
        result.push(
          new Promise((resolve) => {
            setTimeout(async () => {
              resolve(`User ${user.id}: ${user.name}`);
            }, DEFAULT_API_RESPONSE_TIME);
          })
        );
      });
      return await Promise.all(result);
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('single function setup without batch function test', () => {
    it('process user object', async () => {
      const processUser = MicroBatcher(mockProcessUserFunction).build();

      const result1 = processUser({ id: 1, name: 'Alice' });
      const result2 = processUser({ id: 2, name: 'Bob' });

      expect(await result1).toBe('User 1: Alice');
      expect(await result2).toBe('User 2: Bob');
      expect(mockProcessUserFunction).toBeCalledTimes(2);
    });
  });

  describe('single function setup with batch function test', () => {
    it('process user object with batching', async () => {
      const processUser = MicroBatcher(mockProcessUserFunction)
        .batchResolver(mockProcessUserBatchResolver)
        .build();

      const result1 = processUser({ id: 1, name: 'Alice' });
      const result2 = processUser({ id: 2, name: 'Bob' });
      const result3 = processUser({ id: 3, name: 'Charlie' });

      expect(await result1).toBe('User 1: Alice');
      expect(await result2).toBe('User 2: Bob');
      expect(await result3).toBe('User 3: Charlie');
      expect(mockProcessUserFunction).toBeCalledTimes(0);
      expect(mockProcessUserBatchResolver).toBeCalledTimes(1);
      expect(mockProcessUserBatchResolver).toBeCalledWith([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]);
    });
  });
});

describe('multiple object parameters test', () => {
  interface UserInfo {
    id: number;
    name: string;
  }

  interface RequestOptions {
    priority: 'low' | 'high';
    timeout: number;
  }

  const mockProcessWithOptionsFunction: (
    user: UserInfo,
    options: RequestOptions
  ) => Promise<string> = vi
    .fn()
    .mockImplementation(async (user: UserInfo, options: RequestOptions): Promise<string> => {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(`User ${user.id} (${user.name}) - Priority: ${options.priority}`);
        }, DEFAULT_API_RESPONSE_TIME);
      });
    });

  const mockProcessWithOptionsBatchResolver: (
    payloadList: [UserInfo, RequestOptions][]
  ) => Promise<string[]> = vi
    .fn()
    .mockImplementation(async (payloadList: [UserInfo, RequestOptions][]): Promise<string[]> => {
      const result: Promise<string>[] = [];
      payloadList.forEach(([user, options]) => {
        result.push(
          new Promise((resolve) => {
            setTimeout(async () => {
              resolve(`User ${user.id} (${user.name}) - Priority: ${options.priority}`);
            }, DEFAULT_API_RESPONSE_TIME);
          })
        );
      });
      return await Promise.all(result);
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('single function setup without batch function test', () => {
    it('process with multiple object parameters', async () => {
      const processRequest = MicroBatcher(mockProcessWithOptionsFunction).build();

      const result1 = processRequest({ id: 1, name: 'Alice' }, { priority: 'high', timeout: 5000 });
      const result2 = processRequest({ id: 2, name: 'Bob' }, { priority: 'low', timeout: 10000 });

      expect(await result1).toBe('User 1 (Alice) - Priority: high');
      expect(await result2).toBe('User 2 (Bob) - Priority: low');
      expect(mockProcessWithOptionsFunction).toBeCalledTimes(2);
    });
  });

  describe('single function setup with batch function test', () => {
    it('batch process with multiple object parameters', async () => {
      const processRequest = MicroBatcher(mockProcessWithOptionsFunction)
        .batchResolver(mockProcessWithOptionsBatchResolver)
        .build();

      const result1 = processRequest({ id: 1, name: 'Alice' }, { priority: 'high', timeout: 5000 });
      const result2 = processRequest({ id: 2, name: 'Bob' }, { priority: 'low', timeout: 10000 });
      const result3 = processRequest(
        { id: 3, name: 'Charlie' },
        { priority: 'high', timeout: 3000 }
      );

      expect(await result1).toBe('User 1 (Alice) - Priority: high');
      expect(await result2).toBe('User 2 (Bob) - Priority: low');
      expect(await result3).toBe('User 3 (Charlie) - Priority: high');
      expect(mockProcessWithOptionsFunction).toBeCalledTimes(0);
      expect(mockProcessWithOptionsBatchResolver).toBeCalledTimes(1);
      expect(mockProcessWithOptionsBatchResolver).toBeCalledWith([
        [
          { id: 1, name: 'Alice' },
          { priority: 'high', timeout: 5000 }
        ],
        [
          { id: 2, name: 'Bob' },
          { priority: 'low', timeout: 10000 }
        ],
        [
          { id: 3, name: 'Charlie' },
          { priority: 'high', timeout: 3000 }
        ]
      ]);
    });
  });
});

describe('multiple parameter test', () => {
  const mockMultiplyDoubleValuesFunction: (n1: number, n2: number) => Promise<number> = vi
    .fn()
    .mockImplementation(async (n1: number, n2: number): Promise<number> => {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(n1 * n2);
        }, DEFAULT_API_RESPONSE_TIME);
      });
    });

  const mockMultiplyDoubleValuesBatchResolver: (
    payloadList: [number, number][]
  ) => Promise<number[]> = vi
    .fn()
    .mockImplementation(async (payloadList: [number, number][]): Promise<number[]> => {
      const result: Promise<number>[] = [];
      payloadList.forEach((pl) => {
        result.push(
          new Promise((resolve) => {
            setTimeout(async () => {
              resolve(pl[0] * pl[1]);
            }, DEFAULT_API_RESPONSE_TIME);
          })
        );
      });
      return await Promise.all(result);
    });

  afterEach(() => {
    vi.clearAllMocks();
  });
  describe('single function setup without batch function test', () => {
    it('multiply 2 parameters', async () => {
      const multiply = MicroBatcher(mockMultiplyDoubleValuesFunction).build();

      const result1 = multiply(1, 2);
      const result2 = multiply(2, 2);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(mockMultiplyDoubleValuesFunction).toBeCalledTimes(2);
    });
  });

  describe('single function setup with batch function test', () => {
    it('multiply 2 parameters', async () => {
      const multiply = MicroBatcher(mockMultiplyDoubleValuesFunction)
        .batchResolver(mockMultiplyDoubleValuesBatchResolver)
        .build();

      const result1 = multiply(1, 2);
      const result2 = multiply(2, 2);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(mockMultiplyDoubleValuesFunction).toBeCalledTimes(0);
      expect(mockMultiplyDoubleValuesBatchResolver).toBeCalledTimes(1);
    });
  });
});

describe('interference test', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('with batcher', () => {
    const mockMultiplySingleValueFunction: (payload: number) => Promise<number> = vi
      .fn()
      .mockImplementation(async (payload: number): Promise<number> => {
        return await new Promise((resolve) => {
          setTimeout(async () => {
            resolve(payload * 2);
          }, DEFAULT_API_RESPONSE_TIME);
        });
      });

    const mockMultiplySingleValueBatchResolver = vi
      .fn()
      .mockImplementation(async (payloadList: number[]): Promise<number[]> => {
        const result: Promise<number>[] = [];
        payloadList.forEach((pl) => {
          result.push(
            new Promise((resolve) => {
              setTimeout(async () => {
                resolve(pl * 2);
              }, DEFAULT_API_RESPONSE_TIME);
            })
          );
        });
        return await Promise.all(result);
      });

    const mockSingleStringValueFunction: (payload: string) => Promise<string> = vi
      .fn()
      .mockImplementation(async (payload: string): Promise<string> => {
        return await new Promise((resolve) => {
          setTimeout(async () => {
            resolve(`${payload}-${payload}`);
          }, DEFAULT_API_RESPONSE_TIME);
        });
      });

    const mockSingleStringValueBatchResolver: (payloadList: string[]) => Promise<string[]> = vi
      .fn()
      .mockImplementation(async (payloadList: string[]): Promise<string[]> => {
        const result: Promise<string>[] = [];
        payloadList.forEach((payload) => {
          result.push(
            new Promise((resolve) => {
              setTimeout(async () => {
                resolve(`${payload}-${payload}`);
              }, DEFAULT_API_RESPONSE_TIME);
            })
          );
        });
        return await Promise.all(result);
      });

    it('with 2 different usage', async () => {
      const multiplyByTwo = MicroBatcher(mockMultiplySingleValueFunction)
        .batchResolver(mockMultiplySingleValueBatchResolver)
        .build();
      const stringMutation = MicroBatcher(mockSingleStringValueFunction)
        .batchResolver(mockSingleStringValueBatchResolver)
        .build();

      const numberResult1 = multiplyByTwo(1);
      const stringResult1 = stringMutation('one');
      const numberResult2 = multiplyByTwo(2);
      const numberResult3 = multiplyByTwo(3);
      const stringResult2 = stringMutation('two');
      const stringResult3 = stringMutation('three');

      expect(await numberResult1).toBe(2);
      expect(await numberResult2).toBe(4);
      expect(await numberResult3).toBe(6);

      expect(await stringResult1).toBe('one-one');
      expect(await stringResult2).toBe('two-two');
      expect(await stringResult3).toBe('three-three');

      expect(mockSingleStringValueBatchResolver).toBeCalledTimes(1);
      expect(mockMultiplySingleValueBatchResolver).toBeCalledTimes(1);
    });
  });
});

describe('without batch resolve', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockSingleValueFunction = vi
    .fn()
    .mockImplementation(async (payload: number): Promise<number> => {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(payload * 2);
        }, DEFAULT_API_RESPONSE_TIME);
      });
    });

  beforeEach(() => {
    mockSingleValueFunction.mockImplementation(async (payload: number): Promise<number> => {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(payload * 2);
        }, DEFAULT_API_RESPONSE_TIME);
      });
    });
  });

  describe('single value test', () => {
    it('should trigger function twice, when batcher is called twice', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction).build();
      const result1 = multiplyByTwo(1);
      const result2 = multiplyByTwo(2);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(mockSingleValueFunction).toBeCalledTimes(2);
    });
  });

  it('should trigger function twice and handled error correctly, when batcher is called twice and one of them throws error', async () => {
    mockSingleValueFunction
      .mockImplementationOnce((payload: number): Promise<number> => {
        return new Promise((resolve) => {
          setTimeout(async () => {
            return resolve(payload * 2);
          }, DEFAULT_API_RESPONSE_TIME);
        });
      })
      .mockImplementationOnce((payload: number): Promise<number> => {
        return new Promise((resolve, reject) => {
          return reject('simulate reject');
        });
      });
    const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction).build();

    const result1 = multiplyByTwo(1);

    await expect(async () => {
      return await multiplyByTwo(2);
    }).rejects.toThrow('simulate reject');
    expect(await result1).toBe(2);
  });
});

describe('with batch resolver', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockSingleValueFunction: (payload: number) => Promise<number> = vi
    .fn()
    .mockImplementation(async (payload: number): Promise<number> => {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(payload * 2);
        }, DEFAULT_API_RESPONSE_TIME);
      });
    });

  const mockSingleValueBatchResolver: (payloadList: number[]) => Promise<number[]> = vi
    .fn()
    .mockImplementation(async (payloadList: number[]): Promise<number[]> => {
      const result: Promise<number>[] = [];
      payloadList.forEach((pl) => {
        result.push(
          new Promise((resolve) => {
            setTimeout(async () => {
              resolve(pl * 2);
            }, DEFAULT_API_RESPONSE_TIME);
          })
        );
      });
      return await Promise.all(result);
    });

  describe('single value test', () => {
    it('should trigger batch function once, when batcher is called twice within threshold - 1', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);
      const result2 = multiplyByTwo(2);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);

      expect(mockSingleValueFunction).toBeCalledTimes(0);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(1);
    });

    it('should trigger batch function once, when batcher is called twice within theshold - 2', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);

      const result2 = await new Promise((resolve) => {
        setTimeout(async () => {
          const result2 = await multiplyByTwo(2);
          resolve(result2);
        }, 100);
      });

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);

      expect(mockSingleValueFunction).toBeCalledTimes(0);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(1);
    });

    it('should trigger single function once, when only batcher is called once', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);

      expect(await result1).toBe(2);

      expect(mockSingleValueFunction).toBeCalledTimes(1);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(0);
    });

    it('should trigger single function twice, when batcher is called twice not within threshold', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);

      const result2 = await new Promise((resolve) => {
        setTimeout(async () => {
          const result2 = await multiplyByTwo(2);
          resolve(result2);
        }, 500);
      });

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);

      expect(mockSingleValueFunction).toBeCalledTimes(2);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(0);
    });

    it('should trigger batch function once and single function once, when batcher is called twice within theshold and called once not within threshold', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);

      const result2 = await new Promise((resolve) => {
        setTimeout(async () => {
          const result2 = await multiplyByTwo(2);
          resolve(result2);
        }, 100);
      });

      const result3 = await new Promise((resolve) => {
        setTimeout(async () => {
          const result2 = await multiplyByTwo(3);
          resolve(result2);
        }, 200);
      });

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(await result3).toBe(6);

      expect(mockSingleValueFunction).toBeCalledTimes(1);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(1);
    });

    describe('shouldUseBatchFunctionForSinglePayload is true', () => {
      it('should trigger batch function once and another batch function once, when batcher is called twice within theshold and called once not within threshold', async () => {
        const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
          .batchResolver(mockSingleValueBatchResolver, {
            batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD,
            shouldUseBatchResolverForSinglePayload: true
          })
          .build();
        const result1 = multiplyByTwo(1);

        const result2 = await new Promise((resolve) => {
          setTimeout(async () => {
            const result2 = await multiplyByTwo(2);
            resolve(result2);
          }, 100);
        });

        const result3 = await new Promise((resolve) => {
          setTimeout(async () => {
            const result2 = await multiplyByTwo(3);
            resolve(result2);
          }, 200);
        });

        expect(await result1).toBe(2);
        expect(await result2).toBe(4);
        expect(await result3).toBe(6);

        expect(mockSingleValueFunction).toBeCalledTimes(0);
        expect(mockSingleValueBatchResolver).toBeCalledTimes(2);
      });
    });
  });

  describe('payloadWindowSizeLimit tests', () => {
    it('should trigger batch function once, when payloadWindowSizeLimit is undefined/default and batcher is called 5 times within threshold', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          payloadWindowSizeLimit: undefined,
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);
      const result2 = multiplyByTwo(2);
      const result3 = multiplyByTwo(3);
      const result4 = multiplyByTwo(4);
      const result5 = multiplyByTwo(5);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(await result3).toBe(6);
      expect(await result4).toBe(8);
      expect(await result5).toBe(10);

      expect(mockSingleValueFunction).toBeCalledTimes(0);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(1);
    });

    it('should trigger batch function twice, when payloadWindowSizeLimit is 3 and batcher is called 5 times within threshold', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          payloadWindowSizeLimit: 3,
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);
      const result2 = multiplyByTwo(2);
      const result3 = multiplyByTwo(3);
      const result4 = multiplyByTwo(4);
      const result5 = multiplyByTwo(5);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(await result3).toBe(6);
      expect(await result4).toBe(8);
      expect(await result5).toBe(10);

      expect(mockSingleValueFunction).toBeCalledTimes(0);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(2);
    });

    it('should trigger batch function once and single function once, when payloadWindowSizeLimit is 3 and batcher is called 4 times within threshold', async () => {
      const multiplyByTwo = MicroBatcher<number, number>(mockSingleValueFunction)
        .batchResolver(mockSingleValueBatchResolver, {
          payloadWindowSizeLimit: 3,
          batchingIntervalInMs: DEFAULT_BATCH_THRESHOLD
        })
        .build();
      const result1 = multiplyByTwo(1);
      const result2 = multiplyByTwo(2);
      const result3 = multiplyByTwo(3);
      const result4 = multiplyByTwo(4);

      expect(await result1).toBe(2);
      expect(await result2).toBe(4);
      expect(await result3).toBe(6);
      expect(await result4).toBe(8);

      expect(mockSingleValueFunction).toBeCalledTimes(1);
      expect(mockSingleValueBatchResolver).toBeCalledTimes(1);
    });
  });
});
