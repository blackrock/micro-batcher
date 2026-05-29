import { useStore } from '../store/StoreContext';
import { DEFAULT_CONFIG } from '../store/defaults';

export const ConfigPanel = () => {
  const { config, setConfig } = useStore();

  const update = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-base font-semibold text-white mb-4">Configuration</h2>

      {/* Enable Micro Batcher */}
      <div className="flex items-center justify-between py-2">
        <label className="text-sm text-gray-300">Enable Micro Batcher</label>
        <button
          onClick={() => update('enableMicroBatcher', !config.enableMicroBatcher)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            config.enableMicroBatcher ? 'bg-indigo-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              config.enableMicroBatcher ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Batch options — only shown when enabled */}
      <div
        className={`space-y-4 mt-3 transition-opacity duration-200 ${
          config.enableMicroBatcher ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        {/* Batching Interval */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-gray-300">Batching Interval</label>
            <span className="text-xs font-mono text-indigo-400">
              {config.batchingIntervalInMs}ms
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={config.batchingIntervalInMs}
            onChange={(e) => update('batchingIntervalInMs', Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
            <span>0ms</span>
            <span>500ms</span>
          </div>
        </div>

        {/* Payload Window Size Limit */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-gray-300">Window Size Limit</label>
            <span className="text-xs font-mono text-indigo-400">
              {config.payloadWindowSizeLimit ?? 'unlimited'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={config.payloadWindowSizeLimit ?? 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                update('payloadWindowSizeLimit', val === 0 ? undefined : val);
              }}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
            <span>unlimited</span>
            <span>10</span>
          </div>
        </div>

        {/* shouldUseBatchResolverForSinglePayload */}
        <div className="flex items-center justify-between py-1">
          <label className="text-sm text-gray-300 pr-2">Batch single payload</label>
          <button
            onClick={() =>
              update(
                'shouldUseBatchResolverForSinglePayload',
                !config.shouldUseBatchResolverForSinglePayload
              )
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.shouldUseBatchResolverForSinglePayload ? 'bg-indigo-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.shouldUseBatchResolverForSinglePayload ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Error Strategy */}
        <div>
          <label className="text-sm text-gray-300 block mb-2">Error Strategy</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(
              [
                { value: 'broadcast', label: 'Broadcast' },
                { value: 'isolate', label: 'Isolate' }
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update('errorStrategy', value)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                  config.errorStrategy === value
                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            {config.errorStrategy === 'broadcast' &&
              'A batch resolver error rejects every caller in the batch'}
            {config.errorStrategy === 'isolate' &&
              'Per-item promises — a failed caller bails immediately while the rest of the batch continues'}
          </p>
        </div>

        {/* Simulate Error */}
        <div>
          <label className="text-sm text-gray-300 block mb-2">Simulate Error</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(
              [
                { value: 'none', label: 'None' },
                { value: 'batch-reject', label: 'All Reject' },
                { value: 'batch-mismatch', label: 'Mismatch' },
                { value: 'random-batch-reject', label: 'Random' },
                { value: 'partial-item-reject', label: 'Partial' }
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update('simulateError', value)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                  config.simulateError === value
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            {config.simulateError === 'batch-reject' && 'Every batch resolver call will throw'}
            {config.simulateError === 'batch-mismatch' &&
              'Batch resolver returns fewer results than expected'}
            {config.simulateError === 'random-batch-reject' &&
              'Each batch has ~50% chance of failure — best with Window Size Limit set'}
            {config.simulateError === 'partial-item-reject' &&
              'Each item has ~40% chance of failing individually — pair with Isolate to see survivors succeed'}
            {config.simulateError === 'none' && 'No error simulation'}
          </p>
        </div>
      </div>

      {/* Simulated API Latency */}
      <div className="border-t border-gray-800 mt-4 pt-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Simulated API Latency
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Min (ms)</label>
            <input
              type="number"
              min={0}
              max={config.apiLatencyMax}
              step={100}
              value={config.apiLatencyMin}
              onChange={(e) => update('apiLatencyMin', Number(e.target.value))}
              className="w-full rounded-md bg-gray-800 border border-gray-700 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Max (ms)</label>
            <input
              type="number"
              min={config.apiLatencyMin}
              max={10000}
              step={100}
              value={config.apiLatencyMax}
              onChange={(e) => update('apiLatencyMax', Number(e.target.value))}
              className="w-full rounded-md bg-gray-800 border border-gray-700 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => setConfig(DEFAULT_CONFIG)}
        className="mt-4 w-full text-xs text-gray-400 hover:text-white py-1.5 rounded-md border border-gray-700 hover:border-gray-500 transition-colors"
      >
        Reset to defaults
      </button>
    </section>
  );
};
