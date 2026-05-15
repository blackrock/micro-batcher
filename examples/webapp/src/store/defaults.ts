import { ExperimentConfig } from '../apiClient';

export const DEFAULT_CONFIG: ExperimentConfig = {
  enableMicroBatcher: true,
  batchingIntervalInMs: 50,
  payloadWindowSizeLimit: undefined,
  shouldUseBatchResolverForSinglePayload: false,
  apiLatencyMin: 500,
  apiLatencyMax: 2000,
  simulateError: 'none'
};
