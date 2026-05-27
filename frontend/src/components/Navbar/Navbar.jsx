import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ user, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/home');
  };

  const handleBrowseClick = () => {
    navigate('/home');
  };

  const handleSellClick = () => {
    navigate('/sell');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleDisconnectClick = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  return (
    <nav className="global-navbar card-shadow">
      <div className="navbar-content-bounded">
        
        
        <div className="navbar-logo-block" onClick={handleLogoClick}>
          <span className="navbar-brand-icon">🏷️</span>
          <span className="navbar-brand-text">Velocity<span className="text-sky-500">Market</span></span>
        </div>

        
        <div className="navbar-mid-links">
          <button onClick={handleBrowseClick} className="btn-nav-utility">
            Browse Feed
          </button>
        </div>

        
        <div className="navbar-right-ctas">
          
          
          <button onClick={handleSellClick} className="btn-navbar-sell">
            <span className="material-symbols-outlined sell-icon-nav">add_circle</span>
            Sell Item
          </button>

          {user && (
            <div className="navbar-profile-menu">
              
              
              <button 
                onClick={handleProfileClick} 
                className="btn-navbar-profile" 
                title="View Dashboard Profile"
              >
                <div className="navbar-avatar-initials">
                  {user.username ? user.username.slice(0, 2).toUpperCase() : 'ME'}
                </div>
                <span className="navbar-username">@{user.username}</span>
              </button>

              <button 
                onClick={onToggleTheme} 
                className="btn-navbar-theme" 
                title={`Toggle ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                <span className="material-symbols-outlined">
                  {theme === 'light' ? 'dark_mode' : 'light_mode'}
                </span>
              </button>

              <button 
                onClick={handleDisconnectClick} 
                className="btn-navbar-disconnect" 
                title="Disconnect Session"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>

            </div>
          )}

        </div>

      </div>
    </nav>
  );
}
