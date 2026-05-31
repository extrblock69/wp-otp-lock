import { useState, useEffect } from 'preact/hooks';
import axios from 'axios';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

export function App() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cc, setCc] = useState('55');
  const [number, setNumber] = useState('');
  const [delay, setDelay] = useState('10000');
  const [maxRequests, setMaxRequests] = useState('0');
  const [concurrency, setConcurrency] = useState('1');
  const [mobileToken, setMobileToken] = useState('');
  const [proxy, setProxy] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('home'); // 'home' or 'proxies'
  const [proxiesList, setProxiesList] = useState([]);
  const [newProxyUrl, setNewProxyUrl] = useState('');

  // Auto-refresh status and logs
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/status`, {
          headers: { 'x-password': password }
        });
        setIsRunning(res.data.isRunning);
        setLogs(res.data.logs);
        if (view === 'proxies') {
            setProxiesList(res.data.proxies);
        }
      } catch (err) {
        console.error('Failed to fetch status');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated, password, view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND_URL}/verify-password`, { password });
      setIsAuthenticated(true);
      setError('');
    } catch (err) {
      setError('Invalid password');
    }
  };

  const handleStart = async () => {
    try {
      await axios.post(`${BACKEND_URL}/start`, {
        cc, number, delay, maxRequests, concurrency, mobileToken
      }, {
        headers: { 'x-password': password }
      });
      setIsRunning(true);
    } catch (err) {
      setError('Failed to start task');
    }
  };

  const handleStop = async () => {
    try {
      await axios.post(`${BACKEND_URL}/stop`, {}, {
        headers: { 'x-password': password }
      });
      setIsRunning(false);
    } catch (err) {
      setError('Failed to stop task');
    }
  };

  const handleAddProxy = async (e) => {
    e.preventDefault();
    try {
        await axios.post(`${BACKEND_URL}/proxies`, { url: newProxyUrl }, {
            headers: { 'x-password': password }
        });
        setNewProxyUrl('');
        // Refresh list
        const res = await axios.get(`${BACKEND_URL}/proxies`, {
            headers: { 'x-password': password }
        });
        setProxiesList(res.data);
    } catch (err) {
        setError('Failed to add proxy');
    }
  };

  const handleDeleteProxy = async (id) => {
    try {
        await axios.delete(`${BACKEND_URL}/proxies/${id}`, {
            headers: { 'x-password': password }
        });
        setProxiesList(proxiesList.filter(p => p.id !== id));
    } catch (err) {
        setError('Failed to delete proxy');
    }
  };

  const handleCheckAllProxies = async () => {
    try {
        await axios.post(`${BACKEND_URL}/proxies/check-all`, {}, {
            headers: { 'x-password': password }
        });
    } catch (err) {
        setError('Failed to check proxies');
    }
  };

  if (!isAuthenticated) {
    return (
      <div class="container">
        <form class="card" onSubmit={handleLogin}>
          <h1>OTP Lock</h1>
          <h2>Remastered</h2>
          <div class="form-group">
            <label>Password</label>
            <input type="password" value={password} onInput={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}
          <button type="submit" class="btn-primary">Unlock Access</button>
        </form>
      </div>
    );
  }

  return (
    <div class="container">
      <div class="card">
        <div class="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</div>

        <div class={`menu ${menuOpen ? 'active' : ''}`}>
          <h3>Navigation</h3>
          <button class="btn-secondary" style={{marginBottom: '10px'}} onClick={() => { setView('home'); setMenuOpen(false); }}>Home</button>
          <button class="btn-secondary" style={{marginBottom: '10px'}} onClick={() => { setView('proxies'); setMenuOpen(false); }}>Proxies</button>

          <hr style={{margin: '20px 0'}} />

          <h3>Advanced Settings</h3>
          <div class="form-group">
            <label>Concurrency</label>
            <input type="number" value={concurrency} onInput={e => setConcurrency(e.target.value)} />
          </div>
          <div class="form-group">
            <label>Request Limit (0=inf)</label>
            <input type="number" value={maxRequests} onInput={e => setMaxRequests(e.target.value)} />
          </div>
          <div class="form-group">
            <label>Delay (ms)</label>
            <input type="number" value={delay} onInput={e => setDelay(e.target.value)} />
          </div>
          <div class="form-group">
            <label>Proxy (URL)</label>
            <input type="text" value={proxy} onInput={e => setProxy(e.target.value)} placeholder="http://user:pass@host:port" />
          </div>
          <div class="form-group">
            <label>Custom Mobile Token</label>
            <input type="text" value={mobileToken} onInput={e => setMobileToken(e.target.value)} placeholder="Keep empty for default" />
          </div>
          <button class="btn-secondary" onClick={() => setMenuOpen(false)}>Save & Close</button>
        </div>

        {view === 'home' ? (
          <>
            <h1>Control Panel</h1>

            <div class={`status-indicator ${isRunning ? 'running' : 'stopped'}`}>
              Status: {isRunning ? 'RUNNING' : 'STOPPED'}
            </div>

            <div class="form-group">
              <label>Country Code (DDI)</label>
              <input type="text" value={cc} onInput={e => setCc(e.target.value)} disabled={isRunning} />
            </div>

            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" value={number} onInput={e => setNumber(e.target.value)} placeholder="e.g. 9784388523" disabled={isRunning} />
            </div>

            {!isRunning ? (
              <button class="btn-primary" onClick={handleStart}>START ATTACK</button>
            ) : (
              <button class="btn-error" onClick={handleStop}>STOP ATTACK</button>
            )}

            <div class="logs">
              {logs.length === 0 && <div>Waiting for logs...</div>}
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </>
        ) : (
          <>
            <h1>Proxy Management</h1>

            <form onSubmit={handleAddProxy}>
              <div class="form-group">
                <label>Add New Proxy (URL)</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input type="text" value={newProxyUrl} onInput={e => setNewProxyUrl(e.target.value)} placeholder="http://user:pass@host:port" required />
                  <button type="submit" class="btn-primary" style={{width: 'auto'}}>Add</button>
                </div>
              </div>
            </form>

            <button class="btn-secondary" onClick={handleCheckAllProxies} style={{margin: '10px 0'}}>Health Check All</button>

            <div class="proxy-list" style={{marginTop: '20px', maxHeight: '300px', overflowY: 'auto'}}>
                {proxiesList.length === 0 && <p>No proxies added.</p>}
                {proxiesList.map(p => (
                    <div key={p.id} class="card" style={{padding: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333'}}>
                        <div>
                            <div style={{fontSize: '0.8em', color: '#888'}}>{p.url}</div>
                            <div style={{fontSize: '0.9em', color: p.status === 'active' ? '#4CAF50' : p.status === 'dead' ? '#F44336' : '#888'}}>
                                Status: {p.status} {p.lastChecked ? `(Checked: ${new Date(p.lastChecked).toLocaleTimeString()})` : ''}
                            </div>
                        </div>
                        <button class="btn-error" style={{width: 'auto', padding: '5px 10px'}} onClick={() => handleDeleteProxy(p.id)}>X</button>
                    </div>
                ))}
            </div>

            <button class="btn-secondary" onClick={() => setView('home')} style={{marginTop: '20px'}}>Back to Home</button>
          </>
        )}
      </div>
    </div>
  );
}
