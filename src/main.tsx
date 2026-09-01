import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App.tsx';
import './index.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error('VITE_CONVEX_URL is required');
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
