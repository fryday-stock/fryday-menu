import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

// اللوحة تحت /admin/ — الصور والشعار بمجلد الموقع الرئيسي
(globalThis as { __FRYDAY_BASE__?: string }).__FRYDAY_BASE__ = '../';
import { AdminApp } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
