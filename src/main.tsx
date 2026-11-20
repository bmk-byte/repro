import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { initErrorReporting } from './lib/errorReporting';
import { installChunkErrorHandler } from './lib/chunkRecovery';

initErrorReporting();
installChunkErrorHandler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);