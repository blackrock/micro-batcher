import { useStore } from '../store/StoreContext';
import { ALL_CUSIPS, runExperiment } from '../apiClient';
import { useCallback } from 'react';

export const ExperimentPanel = () => {
  const {
    config,
    selectedCusips,
    setSelectedCusips,
    setLogs,
    setResults,
    isRunning,
    setIsRunning,
    addLog,
    setError
  } = useStore();

  const toggleCusip = (cusip: string) => {
    setSelectedCusips((prev) =>
      prev.includes(cusip) ? prev.filter((c) => c !== cusip) : [...prev, cusip]
    );
  };

  const selectAll = () => setSelectedCusips([...ALL_CUSIPS]);
  const selectNone = () => setSelectedCusips([]);

  const handleRun = useCallback(async () => {
    if (selectedCusips.length === 0 || isRunning) return;

    setIsRunning(true);
    setResults([]);
    setError(null);
    setLogs((prev) => [
      ...prev,
      { timestamp: Date.now(), message: '── New Experiment ──', type: 'system' }
    ]);

    const results = await runExperiment(selectedCusips, config, addLog, (result) => {
      // Append each caller's result the moment it settles so a bailing item in isolate
      // mode renders its error card immediately, without waiting for the rest of the batch.
      setResults((prev) => [...prev, result]);
    });

    const successes = results.filter((r) => r.status === 'success').length;
    const failures = results.filter((r) => r.status === 'error').length;

    if (failures > 0 && successes > 0) {
      setError(`Partial failure: ${successes} succeeded, ${failures} failed`);
      addLog({
        timestamp: Date.now(),
        message: `Experiment partial failure: ${successes} succeeded, ${failures} failed`,
        type: 'error'
      });
    } else if (failures > 0) {
      setError(`All ${failures} requests failed`);
      addLog({
        timestamp: Date.now(),
        message: `Experiment failed: all ${failures} requests failed`,
        type: 'error'
      });
    } else {
      addLog({
        timestamp: Date.now(),
        message: `Experiment complete: ${successes} results`,
        type: 'system'
      });
    }

    setIsRunning(false);
  }, [selectedCusips, config, isRunning, addLog, setIsRunning, setResults, setLogs, setError]);

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-base font-semibold text-white mb-3">Experiment</h2>

      {/* Security selector */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Securities to fetch
          </label>
          <div className="flex gap-2 text-[10px]">
            <button onClick={selectAll} className="text-indigo-400 hover:text-indigo-300">
              All
            </button>
            <span className="text-gray-600">|</span>
            <button onClick={selectNone} className="text-indigo-400 hover:text-indigo-300">
              None
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_CUSIPS.map((cusip) => {
            const selected = selectedCusips.includes(cusip);
            return (
              <button
                key={cusip}
                onClick={() => toggleCusip(cusip)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                  selected
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                {cusip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning || selectedCusips.length === 0}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
          isRunning || selectedCusips.length === 0
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
        }`}
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Running...
          </span>
        ) : (
          `Run Experiment (${selectedCusips.length} securities)`
        )}
      </button>
    </section>
  );
};
