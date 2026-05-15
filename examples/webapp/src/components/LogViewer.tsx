import { useStore } from '../store/StoreContext';
import { useEffect, useRef } from 'react';

const typeColors: Record<string, string> = {
  system: 'text-gray-500',
  info: 'text-sky-400',
  batch: 'text-emerald-400',
  single: 'text-amber-400',
  error: 'text-red-400'
};

const typeBadge: Record<string, string> = {
  system: 'bg-gray-800 text-gray-400',
  info: 'bg-sky-900/40 text-sky-400',
  batch: 'bg-emerald-900/40 text-emerald-400',
  single: 'bg-amber-900/40 text-amber-400',
  error: 'bg-red-900/40 text-red-400'
};

export const LogViewer = () => {
  const { logs, setLogs } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white">Event Log</h2>
        {logs.length > 0 && (
          <button
            onClick={() => setLogs([])}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          Batch call
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          Single call
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
          Info
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
          System
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
          Error
        </span>
      </div>

      <div className="bg-gray-950 rounded-lg border border-gray-800 max-h-80 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-600 p-4 text-center">
            No logs yet. Run an experiment to see activity.
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {logs.map((entry, i) => {
              const time = new Date(entry.timestamp);
              const ts = `${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}.${time.getMilliseconds().toString().padStart(3, '0')}`;
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-gray-600 shrink-0 w-16">{ts}</span>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold ${typeBadge[entry.type] ?? ''}`}
                  >
                    {entry.type}
                  </span>
                  <span className={typeColors[entry.type] ?? 'text-gray-300'}>{entry.message}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </section>
  );
};
