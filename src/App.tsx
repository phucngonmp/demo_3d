import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Viewer } from './components/Viewer/Viewer';
import { ConfigPage } from './components/ConfigModel/ConfigPage';

export default function App() {
  return (
    <BrowserRouter basename="/demo_3d">
      <Routes>
        <Route path="/" element={<Navigate to="/viewer" replace />} />
        <Route path="/viewer" element={<Viewer />} />
        <Route path="/config" element={<ConfigPage />} />
      </Routes>
    </BrowserRouter>
  );
}
