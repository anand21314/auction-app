import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { API_BASE_URL } from '../../config/api';

export default function LandingPage({ onAuthSuccess, theme, onToggleTheme }) {
  const navigate = useNavigate();
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  
  const [heroTimer, setHeroTimer] = useState("04:12:44");
  const [bids, setBids] = useState({
    commodore: 12450,
    sneakers: 1240,
    watch: 8900,
    camera: 2150,
  });

  
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    
    const endpoint = authMode === 'login' 
      ? `${API_BASE_URL}/api/auth/login` 
      : `${API_BASE_URL}/api/auth/signup`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        
        
        onAuthSuccess(data.token, data.user);
        closeModal();
        navigate('/home'); 
      } else {
        
        alert(data.error || 'Authentication failed. Please verify your entries.');
      }
    } catch (err) {
      console.error('Network connectivity pipeline error:', err);
      alert('Could not establish a connection to the backend authentication server.');
    }
  };

  useEffect(() => {
    let totalSeconds = 4 * 3600 + 12 * 60 + 44;
    const interval = setInterval(() => {
      if (totalSeconds <= 0) {
        clearInterval(interval);
        return;
      }
      totalSeconds--;
      const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      setHeroTimer(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value) => {
    return '₹' + Number(value).toLocaleString('en-IN');
  };

  const openModal = (mode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeModal = () => {
    setIsAuthModalOpen(false);
    setFormData({ username: '', email: '', password: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="retail-landing-wrapper" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      
      
      <header className="landing-navbar" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="landing-navbar-container">
          <div className="navbar-logo-block">
            <span className="logo-icon-box">🏷️</span>
            <span className="logo-brand-text" style={{ color: 'var(--text-h)' }}>Velocity<span className="text-sky-500">Market</span></span>
          </div>
          <div className="navbar-actions">
            <button 
              onClick={onToggleTheme} 
              className="btn-landing-theme" 
              title={`Toggle ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              <span className="material-symbols-outlined">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <button onClick={() => openModal('login')} className="btn-secondary-link">Sign In</button>
            <button onClick={() => openModal('signup')} className="btn-primary-solid">Join Now</button>
          </div>
        </div>
      </header>

      
      {isAuthModalOpen && (
        <div className="auth-modal-overlay" onClick={closeModal}>
          <div className="auth-modal-window" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={closeModal}>&times;</button>
            <h2 className="auth-modal-title">
              {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="auth-modal-subtitle">
              {authMode === 'login' 
                ? 'Sign in to access active listings and place bids' 
                : 'Register to list items and start bidding instantly'}
            </p>
            
            <form onSubmit={handleAuthSubmit} className="auth-modal-form">
              {authMode === 'signup' && (
                <div className="auth-field-group">
                  <label className="auth-field-label">Username</label>
                  <input 
                    type="text" 
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="auth-field-input" 
                    placeholder="Create a username"
                  />
                </div>
              )}
              
              <div className="auth-field-group">
                <label className="auth-field-label">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="auth-field-input" 
                  placeholder="name@domain.com"
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-field-label">Password</label>
                <input 
                  type="password" 
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="auth-field-input" 
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="auth-btn-submit">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-modal-footer">
              {authMode === 'login' ? (
                <p>New to Velocity? <span onClick={() => setAuthMode('signup')}>Create an account</span></p>
              ) : (
                <p>Already have an account? <span onClick={() => setAuthMode('login')}>Log in here</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      
      <main className="landing-hero-section">
        <div className="hero-grid-container">
          
          <div className="hero-text-card">
            <span className="hero-tag-badge">🚀 Trusted Marketplace</span>
            <h1 className="hero-title-main">
              The Modern Hub for <span className="text-sky-500">Retro hardware</span> & Collectibles.
            </h1>
            <p className="hero-description-body">
              Join thousands of verified collectors who buy, sell, and bid on the rarest items from the silicon age. Secure checkout, transparent bidding, and premium shipping.
            </p>
            <div className="hero-action-buttons">
              
              <button onClick={() => openModal('login')} className="btn-hero-cta">
                Get Started
              </button>
              <button onClick={() => openModal('login')} className="btn-hero-secondary">
                Browse Feed
              </button>
            </div>
          </div>

          <div className="hero-preview-card-pane">
            <div className="hero-product-preview-card card-shadow">
              <div className="preview-card-header">
                <div>
                  <h3 className="preview-item-title">Commodore 64 Golden Edition</h3>
                  <span className="preview-item-sub">Mint condition, serial #001</span>
                </div>
                <span className="preview-live-pill">LIVE AUCTION</span>
              </div>
              <div className="preview-image-box-frame">
                <img alt="Commodore 64 Gold Edition" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDL_HtZeaMfzU7B0DoFdOgWogyR-Xsphcx2ImKX2r6VHN7La1KeypmeTZ015bkD9qNcr-TIAUhkDw7viOwyROA6f49J2xxdETqPlELttZPIiOzVszHpmQhy5-d8iBrZwE8vhOJAPc6fkyU2HubtuQ6DEa1QzRumn258MzZr3Wytl6VMBvJWjlKg9Ue2-pQ3OER_xQWwfEkZ62-rmTqviOCGObmO2UvWn2hPVzhQVcCqh9EMo5lF3HUeShd6ss_FjAXhs38yOlD8grk"/>
              </div>
              <div className="preview-metrics">
                <div className="preview-metric-box">
                  <span className="preview-metric-label">High Bid</span>
                  <span className="preview-metric-value text-sky-500 font-bold">{formatCurrency(bids.commodore)}</span>
                </div>
                <div className="preview-metric-box">
                  <span className="preview-metric-label">Time Remaining</span>
                  <span className="preview-metric-value text-amber-600 font-medium">{heroTimer}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      
      <section className="explore-trust-strip">
        <div className="trust-strip-container">
          <div className="trust-node">
            <span className="trust-icon">🛡️</span>
            <div className="trust-text">
              <h4 className="trust-title">Verified Members</h4>
              <p className="trust-desc">All bidding accounts undergo strict profile checks.</p>
            </div>
          </div>
          <div className="trust-node">
            <span className="trust-icon">🔒</span>
            <div className="trust-text">
              <h4 className="trust-title">Secured Contracts</h4>
              <p className="trust-desc">Bids are legally binding under automatic escrow conditions.</p>
            </div>
          </div>
          <div className="trust-node">
            <span className="trust-icon">⚡</span>
            <div className="trust-text">
              <h4 className="trust-title">Instant Synced Feeds</h4>
              <p className="trust-desc">Bids update in real-time across database nodes.</p>
            </div>
          </div>
        </div>
      </section>

      
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-left">
            <span className="footer-logo">VelocityMarket</span>
            <p className="footer-copy">© 2026 Velocity Marketplace Inc. All rights reserved. Peer-to-peer vintage trade.</p>
          </div>
          <div className="footer-right">
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Privacy Guidelines</a>
            <a href="#" className="footer-link">Support Node</a>
          </div>
        </div>
      </footer>

    </div>
  );
}