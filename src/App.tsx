import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NavBar from './components/NavBar/NavBar';
import Home from './pages/Home';
import UseStatePage from './pages/UseStatePage';
import UseEffectPage from './pages/UseEffectPage';
import UseRefPage from './pages/UseRefPage';
import UseMemoPage from './pages/UseMemoPage';
import ComparisonPage from './pages/ComparisonPage';

export default function App() {
  const location = useLocation();

  return (
    <>
      <NavBar />
      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"            element={<Home />} />
            <Route path="/use-state"   element={<UseStatePage />} />
            <Route path="/use-effect"  element={<UseEffectPage />} />
            <Route path="/use-ref"     element={<UseRefPage />} />
            <Route path="/use-memo"    element={<UseMemoPage />} />
            <Route path="/comparison"  element={<ComparisonPage />} />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
}
