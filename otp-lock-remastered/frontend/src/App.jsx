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
      } catch (err) {
        console.error('Failed to fetch status');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated, password]);

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
      </div>
    </div>
  );
}
