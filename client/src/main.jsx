import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/theme.css';
import './styles/layout.css';
import './styles/dashboard.css';
import './styles/customer-management.css';
import './styles/anova-theme.css';
import './index.css';

import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
