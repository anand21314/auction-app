import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SellItem.css';

export default function SellItem() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    details: '',
    category: 'Electronics',
    type: 'auction',
    location: 'Bengaluru, India',
    durationHours: '24'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  
  const [geoLoading, setGeoLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteTimer, setAutocompleteTimer] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state || '';
            const country = data.address.country || '';
            const locationStr = city && country ? `${city}, ${country}` : data.display_name || 'Detected Location';
            setFormData(prev => ({ ...prev, location: locationStr }));
          } else {
            setFormData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setFormData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Failed to detect location automatically. Please type manually.");
        setGeoLoading(false);
      }
    );
  };

  const handleLocationChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, location: val }));

    if (autocompleteTimer) {
      clearTimeout(autocompleteTimer);
    }

    if (val.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = data.map(item => {
            const addr = item.address;
            const city = addr.city || addr.town || addr.village || addr.state || '';
            const country = addr.country || '';
            return {
              display_name: city && country ? `${city}, ${country}` : item.display_name,
              id: item.place_id
            };
          });
          const unique = formatted.filter((item, index, self) =>
            self.findIndex(t => t.display_name === item.display_name) === index
          );
          setSuggestions(unique);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
      }
    }, 450);

    setAutocompleteTimer(timer);
  };

  const selectSuggestion = (name) => {
    setFormData(prev => ({ ...prev, location: name }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploading(true);

    if (!formData.title || !formData.price) {
      setError("Please fill out the listing title and starting price.");
      setUploading(false);
      return;
    }

    if (!imageFile) {
      setError("An image attachment is required to deploy a listing.");
      setUploading(false);
      return;
    }

    const token = localStorage.getItem('authToken');
    const uploadPayload = new FormData();
    
    
    Object.keys(formData).forEach(key => {
      uploadPayload.append(key, formData[key]);
    });
    
    
    uploadPayload.append('image', imageFile);

    try {
      const response = await fetch('http://localhost:5000/api/listings/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadPayload
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess("Success! Listing deployed to Atlas clusters.");
        setTimeout(() => {
          navigate('/profile'); 
        }, 1200);
      } else {
        setError(data.error || "Failed to create listing.");
      }
    } catch (err) {
      console.error("Listing deployment failed:", err);
      setError("Server connection failure. Upload aborted.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="terminal-sell-wrapper">
      
      <main className="sell-content-container">
        
        <div className="terminal-panel sell-wizard-module card-shadow">
          <div className="panel-header-strip">
            <span className="panel-header-text">Deploy New Marketplace Listing</span>
          </div>

          <form onSubmit={handleFormSubmit} className="sell-interactive-form">
            <div className="sell-form-grid">
              
              
              <div className="form-fields-column">
                <div className="input-field-wrapper">
                  <label className="field-label">Listing Title</label>
                  <input 
                    type="text"
                    name="title"
                    className="sell-text-input"
                    placeholder="e.g. Vintage Polaroid Sun 600 Camera"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-row-double">
                  <div className="input-field-wrapper">
                    <label className="field-label">Starting Price</label>
                    <div className="sell-price-group">
                      <span className="price-prefix">₹</span>
                      <input 
                        type="number"
                        name="price"
                        className="sell-text-input prefix-padding"
                        placeholder="e.g. 1500"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-field-wrapper">
                    <label className="field-label">Auction Duration</label>
                    <select 
                      name="durationHours"
                      className="sell-select-input"
                      value={formData.durationHours}
                      onChange={handleInputChange}
                    >
                      <option value="12">12 Hours (DEATH MATCH)</option>
                      <option value="24">24 Hours (STANDARD)</option>
                      <option value="48">48 Hours (EXTENDED)</option>
                      <option value="72">72 Hours (WEEKEND)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-double">
                  <div className="input-field-wrapper">
                    <label className="field-label">Category Class</label>
                    <select 
                      name="category"
                      className="sell-select-input"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option>Electronics</option>
                      <option>Vehicles</option>
                      <option>Fashion</option>
                      <option>Real Estate</option>
                      <option>Collectibles</option>
                      <option>Gaming</option>
                    </select>
                  </div>

                  <div className="input-field-wrapper">
                    <label className="field-label">Listing Type</label>
                    <select 
                      name="type"
                      className="sell-select-input"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="auction">AUCTION DYNAMICS</option>
                      <option value="direct">DIRECT BUY (BUY IT NOW)</option>
                    </select>
                  </div>
                </div>

                <div className="input-field-wrapper relative-wrapper">
                  <div className="location-label-row">
                    <label className="field-label">Item Location</label>
                    <button 
                      type="button" 
                      onClick={detectLocation} 
                      className="btn-location-detect"
                      disabled={geoLoading}
                    >
                      <span className="material-symbols-outlined detect-icon">my_location</span>
                      {geoLoading ? "Detecting..." : "Auto Detect"}
                    </button>
                  </div>
                  <input 
                    type="text"
                    name="location"
                    className="sell-text-input"
                    value={formData.location}
                    onChange={handleLocationChange}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Enter city, region, or address..."
                    required
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="location-autocomplete-list">
                      {suggestions.map((item) => (
                        <li 
                          key={item.id} 
                          onClick={() => selectSuggestion(item.display_name)}
                          className="location-autocomplete-item"
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="input-field-wrapper">
                  <label className="field-label">Technical Details / Condition</label>
                  <textarea 
                    name="details"
                    className="sell-textarea-input"
                    rows="5"
                    placeholder="Describe your item's condition, unique features, and history..."
                    value={formData.details}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              
              <div className="form-imaging-column">
                <div className="input-field-wrapper flex-column-fill">
                  <label className="field-label">Listing Image Attachment</label>
                  
                  <div className="sell-upload-zone">
                    <input 
                      type="file"
                      id="file-input-terminal"
                      className="hidden-file-input"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    
                    {!imagePreview ? (
                      <label htmlFor="file-input-terminal" className="upload-trigger-label">
                        <span className="material-symbols-outlined upload-icon-big text-sky">add_photo_alternate</span>
                        <span className="upload-title-click">Browse Local Drive</span>
                        <span className="upload-desc-text">Add high-fidelity JPEG, PNG, or WEBP photo node (limit: 5MB)</span>
                      </label>
                    ) : (
                      <div className="preview-terminal-window">
                        <div className="preview-header-strip">
                          <span>Attached Thumbnail</span>
                          <button 
                            type="button" 
                            onClick={() => { setImageFile(null); setImagePreview(''); }} 
                            className="btn-remove-preview"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="preview-image-box">
                          <img src={imagePreview} alt="Dynamic upload preview" />
                        </div>
                        <div className="preview-file-metrics">
                          File: {imageFile?.name} ({ (imageFile?.size / 1024).toFixed(1) } KB)
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            
            {error && <div className="console-response-error mt-4">{error}</div>}
            {success && <div className="console-response-success mt-4">{success}</div>}

            
            <div className="sell-actions-bar">
              {uploading ? (
                <div className="console-uploading-bar animate-pulse">
                  Deploying listing node to database clusters...
                </div>
              ) : (
                <button type="submit" className="btn-wizard-submit">
                  Deploy Listing to Feed
                </button>
              )}
            </div>

          </form>

        </div>

      </main>

    </div>
  );
}
