import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Production pages remain available offline after the first successful visit.
// The service worker never caches chats, source code sent to APIs, or AI responses.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* Built-in help still works in an open page. */ });
  });
}
