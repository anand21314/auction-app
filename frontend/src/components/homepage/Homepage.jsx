import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Homepage.css';
import { API_BASE_URL, WS_BASE_URL } from '../../config/api';

export default function Homepage({ user }) {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [activeFilter, setActiveFilter] = useState('All Items');
  const [sortBy, setSortBy] = useState('Ending Soonest');
  
  
  const [listings, setListings] = useState(() => {
    const saved = localStorage.getItem('hpFeedListings');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem('hpFeedListings');
    return !saved;
  });
  const [initialLoading, setInitialLoading] = useState(() => {
    const saved = localStorage.getItem('hpFeedListings');
    return !saved;
  });

  
  useEffect(() => {
    const fetchMarketplaceData = async () => {
      
      if (!localStorage.getItem('hpFeedListings') || searchQuery || selectedCategory !== 'All Categories' || activeFilter !== 'All Items') {
        setLoading(true);
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/listings/feed?search=${searchQuery}&category=${selectedCategory}&type=${activeFilter}&sort=${sortBy}`
        );
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setListings(data);
          
          if (!searchQuery && selectedCategory === 'All Categories' && activeFilter === 'All Items') {
            localStorage.setItem('hpFeedListings', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.error("Failed to fetch fresh marketplace updates:", err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchMarketplaceData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory, activeFilter, sortBy, initialLoading]);

  
  useEffect(() => {
    const wsUrl = WS_BASE_URL;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'BID_UPDATED') {
          setListings((prevListings) =>
            prevListings.map((item) => {
              if (item._id === message.id) {
                return { 
                  ...item, 
                  price: message.newPrice, 
                  bidsPlaced: (item.bidsPlaced || 0) + 1
                };
              }
              return item;
            })
          );
        }
      } catch (err) {
        console.error("Error processing real-time websocket broadcast:", err);
      }
    };

    return () => ws.close();
  }, []);

  const formatCurrency = (value) => {
    return '₹' + Number(value).toLocaleString('en-IN');
  };

  return (
    <div className="retail-homepage-wrapper">
      
      
      <section className="homepage-search-banner-row">
        <div className="hp-search-container-bounded">
          <div className="hp-search-input-group card-shadow">
            <span className="material-symbols-outlined hp-search-icon">search</span>
            <input 
              type="text" 
              className="hp-main-search-input" 
              placeholder="Find retro computing gears, designer apparel, rare collectibles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              className="hp-category-dropdown"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option>All Categories</option>
              <option>Electronics</option>
              <option>Vehicles</option>
              <option>Fashion</option>
              <option>Real Estate</option>
              <option>Collectibles</option>
              <option>Gaming</option>
            </select>
          </div>
        </div>
      </section>

      
      <div className="hp-filter-strip-row">
        <div className="hp-filter-wrapper-bounded">
          <div className="hp-filter-badge-stack">
            {['All Items', 'Auctions Only', 'Buy It Now'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`hp-tab-badge-btn ${activeFilter === tab ? 'hp-tab-active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="hp-sorting-dropdown-wrapper">
            <span className="hp-sort-label-text">Sort by:</span>
            <select 
              className="hp-native-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option>Ending Soonest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      
      <section className="hp-categories-carousel-section">
        <div className="hp-carousel-track-container">
          {[
            { icon: "devices", name: "Electronics" },
            { icon: "directions_car", name: "Vehicles" },
            { icon: "apparel", name: "Fashion" },
            { icon: "home_work", name: "Real Estate" },
            { icon: "diamond", name: "Collectibles" },
            { icon: "sports_esports", name: "Gaming" }
          ].map((cat, idx) => (
            <div 
              key={idx} 
              className={`hp-carousel-category-card ${selectedCategory === cat.name ? 'active-cat' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'All Categories' : cat.name)}
            >
              <span className="material-symbols-outlined hp-cat-icon-display">{cat.icon}</span>
              <span className="hp-cat-label-text">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      
      <main className="hp-marketplace-grid-main">
        <div className="hp-grid-header-row">
          <h2 className="hp-grid-main-heading">Recommendations Near You</h2>
          <p className="hp-geo-range-descriptor">
            Displaying active item nodes currently live for bidding/buying.
          </p>
        </div>

        {loading ? (
          <div className="hp-loading-placeholder">
            <div className="hp-spinner"></div>
            <span>Fetching marketplace data streams...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="hp-empty-placeholder">
            <span className="material-symbols-outlined empty-icon">sentiment_dissatisfied</span>
            <h3>No Active Listings Found</h3>
            <p>Modify your filters or search keywords to find other product nodes.</p>
          </div>
        ) : (
          <div className="hp-marketplace-responsive-grid">
            {listings.map((product) => (
              <div key={product._id} className="hp-product-classified-card card-shadow">
                
                
                <div className="hp-card-image-box">
                  <img className="hp-card-img" alt={product.title} src={product.image}/>
                  <span className={`hp-card-absolute-badge ${product.type}`}>
                    {product.type === 'auction' ? 'LIVE AUCTION' : 'DIRECT BUY'}
                  </span>
                  
                  {product.type === 'auction' && (
                    <div className="hp-card-countdown-overlay">
                      <span className="material-symbols-outlined timer-icon-micro">schedule</span>
                      Ending soon
                    </div>
                  )}
                </div>

                
                <div className="hp-card-details-pad">
                  <div className="hp-card-header-meta">
                    <h3 className="hp-card-product-title">{product.title}</h3>
                    <span className="hp-card-proximity-text">@{product.seller?.username || 'Seller'}</span>
                  </div>
                  <p className="hp-card-regional-subtitle">
                    {product.location} • {product.category}
                  </p>
                  
                  <div className="hp-card-action-footer-row">
                    <div className="hp-card-price-stack">
                      <span className="hp-price-descriptor-label">
                        {product.type === 'auction' ? 'High Bid' : 'Price'}
                      </span>
                      <span className="hp-price-numerical-value text-emerald font-bold">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    
                    <Link 
                      to={`/product/${product._id}`} 
                      className="hp-card-action-cta-btn"
                    >
                      View Deal
                    </Link>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}