import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const blankListing = () => ({
  title: '',
  category: 'Cooked Meal',
  description: '',
  quantity: '',
  unit: 'meals',
  preparedAt: new Date().toISOString().slice(0, 16),
  expiryAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16),
  tags: '',
  address: '',
  pincode: '',
  contactName: '',
  contactPhone: ''
});

async function api(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function formatDate(value) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function listingToForm(listing) {
  return {
    title: listing.title,
    category: listing.category,
    description: listing.description || '',
    quantity: listing.quantity,
    unit: listing.unit,
    preparedAt: new Date(listing.preparedAt).toISOString().slice(0, 16),
    expiryAt: new Date(listing.expiryAt).toISOString().slice(0, 16),
    tags: (listing.tags || []).join(', '),
    address: listing.pickup.address,
    pincode: listing.pickup.pincode,
    contactName: listing.pickup.contactName,
    contactPhone: listing.pickup.contactPhone
  };
}

function App() {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('foodbridge_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('foodbridge_token') || '');
  const [search, setSearch] = useState('');
  const [pincode, setPincode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'donor', phone: '' });
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingForm, setListingForm] = useState(blankListing);
  const [editingId, setEditingId] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const showNotice = (text) => {
    setMessage(text);
    setError('');
  };

  const showError = (text) => {
    setError(text);
    setMessage('');
  };

  const loadListings = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (pincode.trim()) params.set('pincode', pincode.trim());
      const result = await api(`/listings?${params.toString()}`);
      setListings(result.listings);
      setPagination(result.pagination);
    } catch (err) {
      showError(err.message);
    }
  };

  const loadPersonalData = async () => {
    if (!token || !user) return;
    try {
      if (['donor', 'ngo', 'admin'].includes(user.role)) {
        const result = await api('/listings/mine', {}, token);
        setMyListings(result.listings);
      }
      if (['volunteer', 'ngo', 'admin'].includes(user.role)) {
        const result = await api('/claims/mine', {}, token);
        setClaims(result.claims);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    loadPersonalData();
  }, [token]);

  const handleAuth = async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      localStorage.setItem('foodbridge_token', result.token);
      localStorage.setItem('foodbridge_user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setShowAuth(false);
      setAuthForm({ name: '', email: '', password: '', role: 'donor', phone: '' });
      showNotice(`Welcome, ${result.user.name}!`);
    } catch (err) {
      showError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('foodbridge_token');
    localStorage.removeItem('foodbridge_user');
    setUser(null);
    setToken('');
    setMyListings([]);
    setClaims([]);
    setDashboard(null);
    showNotice('You have been signed out.');
  };

  const handleListing = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: listingForm.title,
        category: listingForm.category,
        description: listingForm.description,
        quantity: Number(listingForm.quantity),
        unit: listingForm.unit,
        preparedAt: new Date(listingForm.preparedAt).toISOString(),
        expiryAt: new Date(listingForm.expiryAt).toISOString(),
        tags: listingForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        pickup: {
          address: listingForm.address,
          pincode: listingForm.pincode,
          contactName: listingForm.contactName,
          contactPhone: listingForm.contactPhone
        }
      };
      const path = editingId ? `/listings/${editingId}` : '/listings';
      const result = await api(path, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) }, token);
      showNotice(editingId ? 'Food listing updated.' : 'Food listing published.');
      setListingForm(blankListing());
      setEditingId(null);
      setShowListingForm(false);
      loadListings();
      loadPersonalData();
      return result;
    } catch (err) {
      showError(err.message);
    }
  };

  const startEdit = (listing) => {
    setListingForm(listingToForm(listing));
    setEditingId(listing._id);
    setShowListingForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this food listing?')) return;
    try {
      await api(`/listings/${id}`, { method: 'DELETE' }, token);
      showNotice('Food listing deleted.');
      loadListings();
      loadPersonalData();
    } catch (err) {
      showError(err.message);
    }
  };

  const claimListing = async (id) => {
    const note = window.prompt('Optional note for the donor:', '') ?? '';
    try {
      await api(`/claims/${id}`, { method: 'POST', body: JSON.stringify({ note }) }, token);
      showNotice('Food claimed successfully. Contact the donor for pickup.');
      loadListings();
      loadPersonalData();
    } catch (err) {
      showError(err.message);
    }
  };

  const updateClaim = async (id, status) => {
    try {
      await api(`/claims/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
      showNotice(`Claim marked as ${status.replace('_', ' ')}.`);
      loadListings();
      loadPersonalData();
    } catch (err) {
      showError(err.message);
    }
  };

  const loadDashboard = async () => {
    try {
      const result = await api('/analytics/dashboard', {}, token);
      setDashboard(result);
    } catch (err) {
      showError(err.message);
    }
  };

  const canPost = user && ['donor', 'ngo', 'admin'].includes(user.role);
  const canClaim = user && ['volunteer', 'ngo', 'admin'].includes(user.role);

  return (
    <>
      <header className="topbar">
        <div className="brand"><span>●</span> FoodBridge</div>
        <nav>
          <a href="#listings">Available food</a>
          {user ? <button className="link-button" onClick={logout}>Sign out</button> : <button className="link-button" onClick={() => setShowAuth(true)}>Sign in</button>}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">SDG 2 - ZERO HUNGER</p>
            <h1>Good food should reach people, not bins.</h1>
            <p className="hero-copy">FoodBridge helps local donors share safe surplus food with volunteers and NGOs before it expires.</p>
            <div className="hero-actions">
              {canPost && <button className="primary" onClick={() => { setEditingId(null); setListingForm(blankListing()); setShowListingForm(true); }}>+ Share surplus food</button>}
              {!user && <button className="secondary" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>Join FoodBridge</button>}
            </div>
          </div>
          <div className="hero-stat"><strong>{pagination.total || 0}</strong><span>food listings currently available</span></div>
        </section>

        {message && <p className="notice success">{message}</p>}
        {error && <p className="notice error">{error}</p>}

        {showAuth && (
          <section className="panel auth-panel">
            <div className="panel-heading">
              <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
              <button className="close" onClick={() => setShowAuth(false)}>×</button>
            </div>
            <form className="form-grid" onSubmit={handleAuth}>
              {authMode === 'register' && <label>Full name<input required value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /></label>}
              <label>Email<input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></label>
              <label>Password<input required type="password" minLength="6" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></label>
              {authMode === 'register' && <><label>Role<select value={authForm.role} onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}><option value="donor">Food donor</option><option value="volunteer">Volunteer</option><option value="ngo">NGO</option></select></label><label>Phone<input value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} /></label></>}
              <button className="primary" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
            </form>
            <p className="small-text">{authMode === 'login' ? 'New here? ' : 'Already registered? '}<button className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          </section>
        )}

        {showListingForm && (
          <section className="panel listing-form">
            <div className="panel-heading"><h2>{editingId ? 'Edit food listing' : 'Share surplus food'}</h2><button className="close" onClick={() => { setShowListingForm(false); setEditingId(null); }}>×</button></div>
            <form className="form-grid listing-grid" onSubmit={handleListing}>
              <label>Food title<input required maxLength="80" value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} placeholder="Example: Vegetable pulao" /></label>
              <label>Category<select value={listingForm.category} onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}><option>Cooked Meal</option><option>Packaged Food</option><option>Fruits and Vegetables</option><option>Bakery</option><option>Other</option></select></label>
              <label>Quantity<input required type="number" min="1" value={listingForm.quantity} onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })} /></label>
              <label>Unit<select value={listingForm.unit} onChange={(e) => setListingForm({ ...listingForm, unit: e.target.value })}><option value="meals">meals</option><option value="packs">packs</option><option value="kg">kg</option><option value="items">items</option></select></label>
              <label>Prepared at<input required type="datetime-local" value={listingForm.preparedAt} onChange={(e) => setListingForm({ ...listingForm, preparedAt: e.target.value })} /></label>
              <label>Use before<input required type="datetime-local" value={listingForm.expiryAt} onChange={(e) => setListingForm({ ...listingForm, expiryAt: e.target.value })} /></label>
              <label className="wide">Description<textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} placeholder="Packaging or dietary details" /></label>
              <label className="wide">Tags<input value={listingForm.tags} onChange={(e) => setListingForm({ ...listingForm, tags: e.target.value })} placeholder="vegetarian, rice, sealed" /></label>
              <label className="wide">Pickup address<input required value={listingForm.address} onChange={(e) => setListingForm({ ...listingForm, address: e.target.value })} /></label>
              <label>Pincode<input required pattern="[0-9]{6}" value={listingForm.pincode} onChange={(e) => setListingForm({ ...listingForm, pincode: e.target.value })} /></label>
              <label>Contact name<input required value={listingForm.contactName} onChange={(e) => setListingForm({ ...listingForm, contactName: e.target.value })} /></label>
              <label>Contact phone<input required value={listingForm.contactPhone} onChange={(e) => setListingForm({ ...listingForm, contactPhone: e.target.value })} /></label>
              <button className="primary" type="submit">{editingId ? 'Save changes' : 'Publish listing'}</button>
            </form>
          </section>
        )}

        {user && <section className="user-strip"><span>Signed in as <strong>{user.name}</strong> ({user.role})</span>{user.role === 'admin' && <button className="secondary small" onClick={loadDashboard}>View impact dashboard</button>}</section>}

        {dashboard && <section className="panel dashboard"><div className="panel-heading"><h2>Impact dashboard</h2><button className="close" onClick={() => setDashboard(null)}>×</button></div><div className="metric-grid"><div><strong>{dashboard.summary.totalListings}</strong><span>Total listings</span></div><div><strong>{dashboard.summary.availableListings}</strong><span>Available now</span></div><div><strong>{dashboard.summary.deliveredMeals}</strong><span>Meals delivered</span></div><div><strong>{dashboard.summary.expiredMeals}</strong><span>Meals expired</span></div></div><h3>Top donors</h3>{dashboard.topDonors.length ? <ul className="compact-list">{dashboard.topDonors.map((donor) => <li key={donor.name}>{donor.name} - {donor.meals} meals ({donor.listings} listings)</li>)}</ul> : <p>No completed pickups yet.</p>}</section>}

        <section id="listings" className="content-section">
          <div className="section-heading"><div><p className="eyebrow">AVAILABLE NOW</p><h2>Food waiting to be collected</h2></div><form className="search-bar" onSubmit={(e) => { e.preventDefault(); loadListings(); }}><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search food or tags" /><input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" maxLength="6" /><button className="secondary" type="submit">Search</button></form></div>
          <div className="cards">
            {listings.map((listing) => <article className="food-card" key={listing._id}><div className="card-top"><span className="category">{listing.category}</span><span className="expiry">Use by {formatDate(listing.expiryAt)}</span></div><h3>{listing.title}</h3><p>{listing.description || 'No extra description provided.'}</p><p className="quantity">{listing.quantity} {listing.unit}</p><p className="location">📍 {listing.pickup.pincode} - {listing.pickup.address}</p><p className="donor">Shared by {listing.donor?.organizationName || listing.donor?.name || 'a donor'}</p><div className="card-actions">{canClaim && <button className="primary small" onClick={() => claimListing(listing._id)}>Claim food</button>}{!user && <button className="secondary small" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Sign in to claim</button>}</div></article>)}
          </div>
          {!listings.length && <p className="empty">No available listings match your search.</p>}
        </section>

        {myListings.length > 0 && <section className="content-section"><div className="section-heading"><h2>My food listings</h2></div><div className="simple-table">{myListings.map((listing) => <div className="table-row" key={listing._id}><span><strong>{listing.title}</strong><small>{listing.quantity} {listing.unit} - {listing.status}</small></span><span className="row-actions">{listing.status !== 'claimed' && <button className="text-button" onClick={() => startEdit(listing)}>Edit</button>}{listing.status !== 'claimed' && <button className="danger-button" onClick={() => deleteListing(listing._id)}>Delete</button>}</span></div>)}</div></section>}

        {claims.length > 0 && <section className="content-section"><div className="section-heading"><h2>My claimed food</h2></div><div className="simple-table">{claims.map((claim) => <div className="table-row" key={claim._id}><span><strong>{claim.listing?.title || 'Deleted listing'}</strong><small>Status: {claim.status}</small></span><span className="row-actions">{claim.status === 'claimed' && <button className="text-button" onClick={() => updateClaim(claim._id, 'picked_up')}>Mark picked up</button>}{claim.status === 'picked_up' && <button className="text-button" onClick={() => updateClaim(claim._id, 'delivered')}>Mark delivered</button>}{claim.status === 'claimed' && <button className="danger-button" onClick={() => updateClaim(claim._id, 'cancelled')}>Cancel</button>}</span></div>)}</div></section>}
      </main>

      <footer>FoodBridge - a student project for SDG 2: Zero Hunger</footer>
    </>
  );
}

export default App;
