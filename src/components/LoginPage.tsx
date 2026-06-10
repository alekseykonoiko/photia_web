import { useState, FormEvent } from 'react';

interface LoginPageProps {
  onLogin: () => void;
}

const EXPECTED_PASSWORD_SHA256 = 'f622ba86b882542f879e6493f493ef6b3614779be9e5a3ec7be9408bf9637ed8';

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const passwordHash = await sha256Hex(password);
      if (passwordHash === EXPECTED_PASSWORD_SHA256) {
        sessionStorage.setItem('photia_auth', 'true');
        onLogin();
        return;
      }

      setError('Invalid password');
    } catch {
      setError('Password check is unavailable in this browser');
    }
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Photia Web</h1>
          <p className="muted">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading || !password}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
