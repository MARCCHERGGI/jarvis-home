import { createRoot } from 'react-dom/client';
import App from './App';

// ══ StrictMode removed ══
// StrictMode double-mounts every component in dev (useEffect runs twice
// per mount). For an app with 15+ components, Three.js renderers, and
// MapLibre GL, that's a 2x dev-mode perf penalty with zero production
// impact — StrictMode is a NOP in prod builds. Kiosk-style apps don't
// need the extra lifecycle checks during hot reload.
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
