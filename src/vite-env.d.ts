/// <reference types="vite/client" />

interface EluAnalytics {
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

interface Window {
  elu?: EluAnalytics;
}
