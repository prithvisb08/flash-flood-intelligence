import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminDashboard from './pages/Admin';
import Citizen from './pages/Citizen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/citizen" element={<Citizen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
