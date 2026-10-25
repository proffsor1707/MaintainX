import { createRoot } from 'react-dom/client';

import App from './app/App';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <App />,
);
import siteLogo from './assets/MainTain.png';
