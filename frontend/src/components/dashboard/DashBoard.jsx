import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('listings');
  const [myListings, setMyListings] = useState(() => {
    const saved = localStorage.getItem('dbMyListings');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [biddingHistory, setBiddingHistory] = useState(() => {
    const saved = localStorage.getItem('dbBiddingHistory');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [wonItems, setWonItems] = useState(() => {
    const saved = localStorage.getItem('dbWonItems');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [telemetry, setTelemetry] = useState(() => {
    const saved = localStorage.getItem('dbTelemetry');
    try {
      return saved ? JSON.parse(saved) : {
        totalListed: 0,
        activeBids: 0,
        spentAmount: 0,
        wonCount: 0
      };
    } catch {
      return {
        totalListed: 0,
        activeBids: 0,
        spentAmount: 0,
        wonCount: 0
      };
    }
  });
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem('dbTelemetry');
    return !saved;
  });

  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setPhoneInput(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      if (!localStorage.getItem('dbTelemetry')) {
        setLoading(true);
      }
      try {
        const token = localStorage.getItem('authToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch('http://localhost:5000/api/listings/dashboard', { headers });
        
        
        if (response.status === 401 || response.status === 403) {
          if (onLogout) onLogout();
          return;
        }

        const data = await response.json();
        
        if (response.ok && data.success) {
          setMyListings(data.myListings || []);
          setBiddingHistory(data.biddingHistory || []);
          setWonItems(data.wonItems || []);
          localStorage.setItem('dbMyListings', JSON.stringify(data.myListings || []));
          localStorage.setItem('dbBiddingHistory', JSON.stringify(data.biddingHistory || []));
          localStorage.setItem('dbWonItems', JSON.stringify(data.wonItems || []));

          if (data.telemetry) {
            setTelemetry(data.telemetry);
            localStorage.setItem('dbTelemetry', JSON.stringify(data.telemetry));
          }
          if (data.user && onUserUpdate) {
            onUserUpdate(data.user);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardMetrics();
    
  }, []);

  const formatCurrency = (value) => {
    return '₹' + Number(value).toLocaleString('en-IN');
  };

  const handleProfileFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setUpdatingProfile(true);

    const token = localStorage.getItem('authToken');
    const updatePayload = new FormData();
    updatePayload.append('phone', phoneInput);
    if (profilePicFile) {
      updatePayload.append('profilePicture', profilePicFile);
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/profile/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: updatePayload
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (onUserUpdate) {
          onUserUpdate(data.user);
        }
        
        setIsEditModalOpen(false);
        setProfilePicFile(null);
        setProfilePicPreview('');
        setProfileSuccess('');
      } else {
        setProfileError(data.error || "Failed to update profile details.");
      }
    } catch (err) {
      console.error("Profile update failed:", err);
      setProfileError("Server connection failure. Update aborted.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="retail-dashboard-wrapper">
      
      <main className="db-content-container">
        
        
        <section className="db-profile-hero-card card-shadow">
          <div className="db-avatar-large">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="db-avatar-large-img" />
            ) : (
              user?.username ? user.username.slice(0, 2).toUpperCase() : 'ME'
            )}
          </div>
          <div className="db-profile-meta">
            <h1 className="db-user-display-name">@{user?.username || 'Verified User'}</h1>
            <div className="db-user-trust-row">
              <span className="material-symbols-outlined db-shield-icon">verified</span>
              <p className="db-trust-label">
                Verified Velocity Member • {user?.phone ? `📞 ${user.phone}` : 'No Phone Added'}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setIsEditModalOpen(true)} className="btn-db-edit-profile">
            <span className="material-symbols-outlined">edit</span>
            Edit Profile
          </button>
        </section>

        
        <section className="db-metrics-grid">
          <div className="db-metric-card card-shadow">
            <div className="metric-icon-box blue-theme">
              <span className="material-symbols-outlined">sell</span>
            </div>
            <div className="metric-info">
              <span className="metric-value">{telemetry.totalListed}</span>
              <span className="metric-label">Items Listed</span>
            </div>
          </div>

          <div className="db-metric-card card-shadow">
            <div className="metric-icon-box amber-theme">
              <span className="material-symbols-outlined">local_mall</span>
            </div>
            <div className="metric-info">
              <span className="metric-value">{telemetry.activeBids}</span>
              <span className="metric-label">Bids & Offers</span>
            </div>
          </div>

          <div className="db-metric-card card-shadow">
            <div className="metric-icon-box emerald-theme">
              <span className="material-symbols-outlined">assignment_turned_in</span>
            </div>
            <div className="metric-info">
              <span className="metric-value">{telemetry.wonCount}</span>
              <span className="metric-label">Purchases Won</span>
            </div>
          </div>

          <div className="db-metric-card card-shadow">
            <div className="metric-icon-box slate-theme">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <div className="metric-info">
              <span className="metric-value text-emerald">{formatCurrency(telemetry.spentAmount)}</span>
              <span className="metric-label">Committed Spent</span>
            </div>
          </div>
        </section>

        
        <div className="db-tabs-strip">
          <button 
            className={`db-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            My Listings
          </button>
          <button 
            className={`db-tab-btn ${activeTab === 'bidding' ? 'active' : ''}`}
            onClick={() => setActiveTab('bidding')}
          >
            Bids & Offers
          </button>
          <button 
            className={`db-tab-btn ${activeTab === 'won' ? 'active' : ''}`}
            onClick={() => setActiveTab('won')}
          >
            Purchased / Won
          </button>
        </div>

        
        <div className="db-workspace-panel card-shadow">
          
          
          {activeTab === 'listings' && (
            <div className="workspace-tab-content">
              <div className="tab-header-row">
                <h3>My Listings Deployed</h3>
                <Link to="/sell" className="btn-tab-action">Create New Listing</Link>
              </div>

              {loading ? (
                <div className="db-loading-state">Querying active database records...</div>
              ) : myListings.length === 0 ? (
                <div className="db-blank-slate">
                  <span className="material-symbols-outlined blank-icon">archive</span>
                  <h4>No Active Listings Deployed</h4>
                  <p>Ready to clear out some of your retro gears? Create a listing today.</p>
                </div>
              ) : (
                <div className="db-listings-card-grid">
                  {myListings.map((item) => (
                    <div key={item._id} className="db-dense-product-card">
                      <div className="dense-card-media">
                        <img alt={item.title} src={item.image}/>
                        <span className={`dense-card-badge ${item.type}`}>
                          {item.type === 'auction' ? 'AUCTION' : 'DIRECT BUY'}
                        </span>
                      </div>
                      <div className="dense-card-body">
                        <h4 className="dense-card-title">{item.title}</h4>
                        <div className="dense-card-specs">LOC: {item.location} • CAT: {item.category}</div>
                        <div className="dense-card-footer">
                          <span className="dense-card-price text-emerald">{formatCurrency(item.price)}</span>
                          <Link to={`/product/${item._id}`} className="dense-card-btn">
                            View Deal
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          
          {activeTab === 'bidding' && (
            <div className="workspace-tab-content">
              <div className="tab-header-row">
                <h3>Monitored Outpost Auctions</h3>
              </div>

              {loading ? (
                <div className="db-loading-state">Synchronizing bidding data pipelines...</div>
              ) : biddingHistory.length === 0 ? (
                <div className="db-blank-slate">
                  <span className="material-symbols-outlined blank-icon">gavel</span>
                  <h4>No Active Bids Placed</h4>
                  <p>Explore collectibles on the feed page to start placing bids.</p>
                </div>
              ) : (
                <div className="db-rows-stack">
                  {biddingHistory.map((bidItem) => (
                    <div key={bidItem._id} className="db-row-item">
                      <div className="db-row-media">
                        <img alt={bidItem.title} src={bidItem.image}/>
                      </div>
                      <div className="db-row-details">
                        <h4 className="db-row-title">{bidItem.title}</h4>
                        <div className="db-row-specs">
                          Current Price: <span className="text-dark font-bold">{formatCurrency(bidItem.price)}</span> | Your High Bid: <span className="text-emerald font-bold">{formatCurrency(bidItem.myBidAmount)}</span>
                        </div>
                      </div>
                      <div className="db-row-actions">
                        <span className={`db-status-badge ${bidItem.status}`}>
                          {bidItem.status === 'winning' ? 'HIGHEST BID' : 'OUTBID'}
                        </span>
                        <Link to={`/product/${bidItem._id}`} className="db-row-btn-action">
                          Increase Bid
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          
          {activeTab === 'won' && (
            <div className="workspace-tab-content">
              <div className="tab-header-row">
                <h3>Secured Transaction Receipts</h3>
              </div>

              {loading ? (
                <div className="db-loading-state">Processing historical purchases logs...</div>
              ) : wonItems.length === 0 ? (
                <div className="db-blank-slate">
                  <span className="material-symbols-outlined blank-icon">workspace_premium</span>
                  <h4>No Acquired Collectibles Found</h4>
                  <p>Finalized orders won at auction will generate secure invoice sheets here.</p>
                </div>
              ) : (
                <div className="db-rows-stack">
                  {wonItems.map((wonItem) => (
                    <div key={wonItem._id} className="db-row-item won-transaction">
                      <div className="db-row-details-full">
                        <span className="db-invoice-tag">ORDER COMPLETE</span>
                        <h4 className="db-row-title mt-1">{wonItem.title}</h4>
                        <div className="db-row-specs">
                          Contract Settled: <span className="text-emerald font-bold">{formatCurrency(wonItem.price)}</span> | Settle Date: {new Date(wonItem.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="db-row-actions-horizontal">
                        <button onClick={() => alert("Tracking shipment details.")} className="btn-row-action-outline">Track Shipment</button>
                        <button onClick={() => alert("Invoice PDF sheet generated.")} className="btn-row-action-outline">View Invoice</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      
      {isEditModalOpen && (
        <div className="db-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="db-modal-window" onClick={(e) => e.stopPropagation()}>
            <button className="db-modal-close" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            <h2 className="db-modal-title">Edit Personal Details</h2>
            <p className="db-modal-subtitle">Update your phone number and optional profile picture.</p>
            
            <form onSubmit={handleProfileSubmit} className="db-modal-form">
              <div className="db-modal-field-group">
                <label className="db-modal-label">Phone Number</label>
                <input 
                  type="text" 
                  className="db-modal-input"
                  placeholder="+91 9988776655"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
              </div>

              <div className="db-modal-field-group">
                <label className="db-modal-label">Profile Picture (Optional)</label>
                <div className="db-modal-avatar-picker">
                  <div className="db-modal-avatar-circle">
                    {profilePicPreview ? (
                      <img src={profilePicPreview} alt="Preview" />
                    ) : user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Current" />
                    ) : (
                      <span className="material-symbols-outlined">account_circle</span>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      id="db-file-picker" 
                      className="hidden-file-input"
                      accept="image