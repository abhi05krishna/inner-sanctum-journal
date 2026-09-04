import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Handle benign sandbox/iframe dev-server websocket closures without polluting console
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event.reason?.message || String(event.reason || '');
  if (
    reasonStr.includes('WebSocket') ||
    reasonStr.includes('ws://') ||
    reasonStr.includes('wss://') ||
    reasonStr.includes('closed without opened')
  ) {
    // Prevent unhandled rejection bubbling for benign dev-server HMR reconnects
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary sectionName="Application">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
