import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ExperimentConfig, LogEntry, SecurityResult, ALL_CUSIPS } from '../apiClient';
import { DEFAULT_CONFIG } from './defaults';

interface StoreValue {
  config: ExperimentConfig;
  setConfig: React.Dispatch<React.SetStateAction<ExperimentConfig>>;
  selectedCusips: string[];
  setSelectedCusips: React.Dispatch<React.SetStateAction<string[]>>;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  addLog: (entry: LogEntry) => void;
  results: SecurityResult[];
  setResults: React.Dispatch<React.SetStateAction<SecurityResult[]>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const StoreContext = createContext<StoreValue | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<ExperimentConfig>(DEFAULT_CONFIG);
  const [selectedCusips, setSelectedCusips] = useState<string[]>([...ALL_CUSIPS]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [results, setResults] = useState<SecurityResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        config,
        setConfig,
        selectedCusips,
        setSelectedCusips,
        logs,
        setLogs,
        addLog,
        results,
        setResults,
        isRunning,
        setIsRunning,
        error,
        setError
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreValue => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
