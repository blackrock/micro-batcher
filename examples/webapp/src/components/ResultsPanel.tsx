import { useStore } from '../store/StoreContext';

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export const ResultsPanel = () => {
  const { results, isRunning, error } = useStore();

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-base font-semibold text-white mb-3">Results</h2>

      {results.length === 0 && !isRunning && !error && (
        <div className="text-sm text-gray-500 py-8 text-center">
          Run an experiment to see results here.
        </div>
      )}

      {isRunning && results.length === 0 && (
        <div className="text-sm text-gray-400 py-8 text-center animate-pulse">
          Fetching securities...
        </div>
      )}

      {error && !isRunning && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 text-sm font-semibold">Experiment Error</span>
          </div>
          <p className="text-xs text-red-300/80">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {results.map((result) =>
            result.status === 'success' ? (
              <div
                key={result.cusip}
                className="rounded-lg border border-gray-800 bg-gray-800/50 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold text-indigo-400">
                    {result.cusip}
                  </span>
                  <span className="text-xs text-gray-500">
                    ${result.data.price.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 truncate">{result.data.security}</div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Market Cap: {formatMarketCap(result.data.marketCap)}
                </div>
              </div>
            ) : (
              <div
                key={result.cusip}
                className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold text-red-400">
                    {result.cusip}
                  </span>
                  <span className="text-[10px] font-medium text-red-400/60 uppercase tracking-wider">
                    Failed
                  </span>
                </div>
                <div className="text-xs text-red-300/40 truncate">{result.error}</div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
};
