import { ConfigPanel } from './components/ConfigPanel';
import { ExperimentPanel } from './components/ExperimentPanel';
import { LogViewer } from './components/LogViewer';
import { ResultsPanel } from './components/ResultsPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Micro Batcher Playground
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Experiment with batching patterns and configurations
            </p>
          </div>
          <a
            href="https://github.com/nicholascowan/micro-batcher"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub &rarr;
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Config */}
        <div className="lg:col-span-4 space-y-6">
          <ConfigPanel />
          <ExperimentPanel />
        </div>

        {/* Right column: Results + Logs */}
        <div className="lg:col-span-8 space-y-6">
          <ResultsPanel />
          <LogViewer />
        </div>
      </main>
    </div>
  );
}

export default App;
