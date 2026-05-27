import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Homepage from './components/homepage/Homepage';
import Dashboard from './components/dashboard/DashBoard';
import ProductDetail from './components/ProductDetail/ProductDetail';
import SellItem from './components/SellItem/SellItem';
import LandingPage from './components/LandingPage/LandingPage';
import Navbar from './components/Navbar/Navbar';


import { API_BASE_URL } from './config/api';

const PrivateRoute = ({ token }) => {
  return token ? <Outlet /> : <Navigate to="/" replace />;
};


const PublicRoute = ({ token }) => {
  return !token ? <Outlet /> : <Navigate to="/home" replace />;
};


const PrivateLayout = ({ user, onLogout, theme, onToggleTheme }) => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      <div className="flex-1 w-full box-sizing-border-box">
        <Outlet />
      </div>
    </div>
  );
};

export default function App() {
  
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('authUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('authToken'));
  const [theme, setTheme] = useState(() => localStorage.getItem('appTheme') || 'light');

  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/listings/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('authUser', JSON.stringify(data.user));
          }
        } else {
          
          handleLogout();
        }
      } catch (err) {
        console.error("Secure Session pipeline synchronization offline:", err);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const handleAuthSuccess = (newToken, authenticatedUser) => {
    setToken(newToken);
    setUser(authenticatedUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(authenticatedUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('dbMyListings');
    localStorage.removeItem('dbBiddingHistory');
    localStorage.removeItem('dbWonItems');
    localStorage.removeItem('dbTelemetry');
    localStorage.removeItem('hpFeedListings');
  };

  const handleUserUpdate = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center transition-colors duration-300" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>Syncing secure connection nodes...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        
        
        <Route element={<PublicRoute token={token} />}>
          <Route path="/" element={<LandingPage onAuthSuccess={handleAuthSuccess} theme={theme} onToggleTheme={toggleTheme} />} />
        </Route>

        
        <Route element={<PrivateRoute token={token} />}>
          <Route element={<PrivateLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />}>
            <Route path="/home" element={<Homepage user={user} onLogout={handleLogout} />} />
            <Route path="/profile" element={<Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            <Route path="/product/:id" element={<ProductDetail user={user} onLogout={handleLogout} />} />
            <Route path="/sell" element={<SellItem user={user} onLogout={handleLogout} />} />
          </Route>
        </Route>

        
        <Route path="*" element={<Navigate to={token ? "/home" : "/"} replace />} />

      </Routes>
    </Router>
  );
}