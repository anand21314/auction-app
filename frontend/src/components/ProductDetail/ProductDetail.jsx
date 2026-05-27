import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './ProductDetail.css';
import { API_BASE_URL, WS_BASE_URL } from '../../config/api';

export default function ProductDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(() => {
    try {
      const feedSaved = localStorage.getItem('hpFeedListings');
      const feed = feedSaved ? JSON.parse(feedSaved) : [];
      if (Array.isArray(feed)) {
        const found = feed.find(item => item._id === id);
        if (found) return found;
      }

      const mySaved = localStorage.getItem('dbMyListings');
      const myList = mySaved ? JSON.parse(mySaved) : [];
      if (Array.isArray(myList)) {
        const foundMy = myList.find(item => item._id === id);
        if (foundMy) return foundMy;
      }
    } catch (e) {
      console.error("Error reading cache for instant load:", e);
    }
    return null;
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      const feedSaved = localStorage.getItem('hpFeedListings');
      const feed = feedSaved ? JSON.parse(feedSaved) : [];
      if (Array.isArray(feed)) {
        const found = feed.find(item => item._id === id);
        if (found) return false;
      }

      const mySaved = localStorage.getItem('dbMyListings');
      const myList = mySaved ? JSON.parse(mySaved) : [];
      if (Array.isArray(myList)) {
        const foundMy = myList.find(item => item._id === id);
        if (foundMy) return false;
      }
    } catch (e) {}
    return true;
  });
  
  const [bidAmount, setBidAmount] = useState(() => {
    try {
      const feedSaved = localStorage.getItem('hpFeedListings');
      const feed = feedSaved ? JSON.parse(feedSaved) : [];
      const found = feed.find(item => item._id === id);
      if (found) return found.price + 50;

      const mySaved = localStorage.getItem('dbMyListings');
      const myList = mySaved ? JSON.parse(mySaved) : [];
      const foundMy = myList.find(item => item._id === id);
      if (foundMy) return foundMy.price + 50;
    } catch (e) {}
    return '';
  });
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [countdown, setCountdown] = useState('00:00:00');
  const [isExpired, setIsExpired] = useState(false);
  const socketRef = useRef(null);

  
  useEffect(() => {
    const fetchListing = async () => {
      const hasCache = !!listing;
      if (!hasCache) {
        setLoading(true);
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/listings/${id}`);
        const data = await response.json();
        
        if (response.ok) {
          setListing(data);
          setBidAmount(data.price + 50);
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  
  useEffect(() => {
    const wsUrl = WS_BASE_URL;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'BID_UPDATED' && message.id === id) {
          setListing((prev) => {
            if (!prev) return null;
            const updatedBids = [
              { bidder: { username: 'Anonymous_Agent' }, amount: message.newPrice, timestamp: new Date() },
              ...prev.bids
            ];
            return {
              ...prev,
              price: message.newPrice,
              bidsPlaced: prev.bidsPlaced + 1,
              bids: updatedBids
            };
          });
          setBidAmount(message.newPrice + 50);
        }
      } catch (err) {
        console.error("Error reading websocket broadcast stream:", err);
      }
    };

    return () => {
      if (ws) ws.close();
    };
  }, [id]);

  
  useEffect(() => {
    if (!listing || !listing.endTime) return;

    const interval = setInterval(() => {
      const difference = new Date(listing.endTime) - new Date();
      
      if (difference <= 0) {
        setCountdown('00:00:00');
        setIsExpired(true);
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [listing]);

  const handleBidInputChange = (e) => {
    const val = Number(e.target.value);
    setBidAmount(e.target.value);
    
    if (listing && val <= listing.price) {
      setBidError(`Bid must exceed current high bid of ₹${listing.price}`);
    } else {
      setBidError('');
    }
  };

  const executePlaceBid = async (e) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    if (!user) {
      setBidError("Bidding requires authentication. Please sign in.");
      return;
    }

    const numericAmount = Number(bidAmount);
    if (numericAmount <= listing.price) {
      setBidError(`Bid must exceed current high bid of ₹${listing.price}`);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/listings/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId: id,
          amount: numericAmount
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBidSuccess("Bid successfully registered!");
        
        
        const updatedResponse = await fetch(`${API_BASE_URL}/api/listings/${id}`);
        const updatedData = await updatedResponse.json();
        if (updatedResponse.ok) {
          setListing(updatedData);
          setBidAmount(updatedData.price + 50);
        }
      } else {
        setBidError(data.error || "Failed to process bid transaction.");
      }
    } catch (err) {
      console.error("Bid transaction connection error:", err);
      setBidError("Connection to server timed out. Try again.");
    }
  };

  const formatCurrency = (value) => {
    return '₹' + Number(value).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center transition-colors duration-300" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-3 font-medium text-sm" style={{ color: 'var(--text-muted)' }}>Retrieving product logs...</span>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-500 transition-colors duration-300" style={{ background: 'var(--bg)' }}>
        <span className="material-symbols-outlined text-4xl mb-2">error</span>
        <h2 className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>Product Node Not Found</h2>
        <Link to="/home" className="text-sky-500 hover:underline mt-4 text-sm">
          Return to Browse Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="retail-detail-wrapper">
      
      
      <main className="detail-split-grid">
        
        
        <section className="detail-left-pane">
          <div className="terminal-panel display-media-module card-shadow">
            <div className="panel-header-strip">
              <span className="panel-header-text">{listing.title}</span>
              <span className={`panel-status-tag ${listing.status}`}>
                {listing.status.toUpperCase()}
              </span>
            </div>
            <div className="detail-image-frame">
              <img src={listing.image} alt={listing.title} />
            </div>
          </div>

          <div className="terminal-panel specs-description-module card-shadow">
            <div className="panel-header-strip">
              <span className="panel-header-text">Item Registry Information</span>
            </div>
            <div className="panel-content-log">
              <div className="spec-log-row">
                <span className="spec-key">Seller Node:</span>
                <span className="spec-value text-sky font-bold">@{listing.seller?.username || 'Seller'}</span>
              </div>
              <div className="spec-log-row">
                <span className="spec-key">Geographic Location:</span>
                <span className="spec-value">{listing.location}</span>
              </div>
              <div className="spec-log-row">
                <span className="spec-key">Category Class:</span>
                <span className="spec-value">{listing.category}</span>
              </div>
              <div className="spec-log-row">
                <span className="spec-key">Listing Type:</span>
                <span className="spec-value font-bold text-sky-500">{listing.type === 'auction' ? 'AUCTION DYNAMICS' : 'DIRECT P2P'}</span>
              </div>
              <div className="spec-log-divider"></div>
              <div className="spec-log-paragraph">
                <div className="paragraph-header">MEMORANDUM DETAILS</div>
                <p className="paragraph-text">{listing.details}</p>
              </div>
            </div>
          </div>
        </section>

        
        <section className="detail-right-pane">
          
          
          <div className="terminal-panel countdown-timer-module card-shadow">
            <div className="panel-header-strip">
              <span className="panel-header-text">Time Remaining</span>
              {isExpired ? (
                <span className="time-badge expired">EXPIRED</span>
              ) : (
                <span className="time-badge active">RUNNING</span>
              )}
            </div>
            <div className="countdown-clock-display">
              <span className={`clock-digit ${isExpired ? 'expired-clock' : ''}`}>{countdown}</span>
              <div className="clock-micro-label">HOURS : MINUTES : SECONDS</div>
            </div>
          </div>

          
          <div className="terminal-panel current-price-module card-shadow">
            <div className="panel-header-strip">
              <span className="panel-header-text">
                {listing.type === 'auction' ? 'Current High Bid' : 'Direct Buy Price'}
              </span>
            </div>
            <div className="price-value-container">
              <span className="price-large text-emerald font-bold">{formatCurrency(listing.price)}</span>
              <span className="bids-placed-micro">{listing.bidsPlaced} Bids placed in room</span>
            </div>
          </div>

          
          {listing.type === 'auction' && (
            <div className="terminal-panel bid-form-module card-shadow">
              <div className="panel-header-strip">
                <span className="panel-header-text">Place Bidding Node</span>
              </div>
              <div className="bid-console-body">
                {isExpired ? (
                  <div className="expired-notice-banner">
                    [!] Auction closed. Bids are no longer accepted on this index.
                  </div>
                ) : (
                  <form onSubmit={executePlaceBid} className="terminal-form-block">
                    <div className="form-prompt-desc">
                      Bids submitted are legally binding under Velocity guidelines. Price syncs instantly.
                    </div>
                    
                    <div className="input-group-terminal">
                      <span className="input-prefix">₹</span>
                      <input 
                        type="number"
                        className="input-terminal-field"
                        value={bidAmount}
                        onChange={handleBidInputChange}
                        disabled={!user}
                        placeholder={`Min: ₹${listing.price + 1}`}
                        required
                      />
                    </div>

                    {bidError && <div className="console-response-error">{bidError}</div>}
                    {bidSuccess && <div className="console-response-success">{bidSuccess}</div>}

                    {!user ? (
                      <div className="guest-login-notice">
                        🏷️ Read Only Mode: You must <Link to="/" className="text-sky-500 font-bold hover:underline">Sign In</Link> to place bids.
                      </div>
                    ) : (
                      <button 
                        type="submit" 
                        className="btn-terminal-submit"
                        disabled={!!bidError}
                      >
                        Place High Bid
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}

          
          <div className="terminal-panel bids-ledger-module card-shadow">
            <div className="panel-header-strip">
              <span className="panel-header-text">Transaction Ledger Log</span>
            </div>
            <div className="ledger-box-log">
              {listing.bids.length === 0 ? (
                <div className="empty-ledger">No transaction logs logged on this catalog node.</div>
              ) : (
                <div className="ledger-rows-wrapper">
                  {listing.bids.map((bid, i) => (
                    <div key={i} className="ledger-log-row">
                      <span className="ledger-index">BLOCK #{listing.bids.length - i}</span>
                      <span className="ledger-bidder">@{bid.bidder?.username || 'Anonymous_Agent'}</span>
                      <span className="ledger-time">{new Date(bid.timestamp).toLocaleTimeString()}</span>
                      <span className="ledger-amount text-emerald font-bold">{formatCurrency(bid.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}