import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { startSync } from './lib/store';

startSync();
createRoot(document.getElementById('root')!).render(<App />);
