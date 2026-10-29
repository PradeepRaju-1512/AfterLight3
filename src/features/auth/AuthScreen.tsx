import React, { useState } from 'react';
import { MoonlitAtmosphere } from '../../components/MoonlitAtmosphere';
import { api, setStoredUser } from '../../services/api';
import { User } from '../../types';
import { Eye, EyeOff, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!username.trim() || !email.trim() || !password) {
        setError('Please fill in all required fields.');
        return;
      }
      if (username.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const res = await api.register({
          username: username.trim(),
          email: email.trim(),
          password,
          displayName: displayName.trim() || username.trim(),
        });
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          setStoredUser(res.user);
          onAuthenticated(res.user);
        }
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!identifier.trim() || !password) {
        setError('Please enter your username/email and password.');
        return;
      }

      setLoading(true);
      try {
        const res = await api.login({ identifier: identifier.trim(), password });
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          setStoredUser(res.user);
          onAuthenticated(res.user);
        }
      } catch (err: any) {
        setError(err.message || 'Login failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ identifier: 'LunaWatcher', password: 'Password123!' });
      if (res.user) {
        setStoredUser(res.user);
        onAuthenticated(res.user);
      } else {
        const randId = Math.floor(1000 + Math.random() * 9000);
        const reg = await api.register({
          username: `Wanderer${randId}`,
          email: `wanderer${randId}@afterlight.game`,
          password: 'Password123!',
          displayName: `Night Wanderer ${randId}`,
        });
        if (reg.user) {
          setStoredUser(reg.user);
          onAuthenticated(reg.user);
        }
      }
    } catch (err: any) {
      setError('Demo login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MoonlitAtmosphere isLoginMode={true} landscapeKey="login">
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-16 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* Top Header Bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#111B2A]/90 border border-[#293748] flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/60">
              {/* Crescent Emblem Logo */}
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-[#D99A4E]">
                <path
                  d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8A9.04 9.04 0 0 0 12 3z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-serif tracking-[0.2em] text-xl sm:text-2xl font-bold text-[#DCE8F5]">
                AFTERLIGHT
              </h1>
              <p className="text-[11px] text-[#8795A7] tracking-widest uppercase font-mono">
                Strategic Tic-Tac-Toe Engine
              </p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[11px] font-mono text-[#D99A4E] font-semibold tracking-wide">
              Tactical Arena
            </span>
            <span className="text-[10px] font-mono text-[#8795A7]">
              Real-Time Strategy
            </span>
          </div>
        </header>

        {/* Center / Auth Hero Layout docked to the right */}
        <div className="flex-1 flex items-center justify-center sm:justify-end py-8">
          {/* Translucent Auth Panel docked right */}
          <div className="w-full max-w-md">
            <div className="surface-card rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-all">
              
              {/* Sign In / Create Account Toggle */}
              <div className="flex border-b border-[#293748] pb-3 mb-6">
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(null); }}
                  className={`flex-1 pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-colors relative cursor-pointer ${
                    !isRegister
                      ? 'text-[#DCE8F5]'
                      : 'text-[#8795A7] hover:text-[#DCE8F5]'
                  }`}
                >
                  Sign In
                  {!isRegister && (
                    <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-[#D99A4E]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(null); }}
                  className={`flex-1 pb-2 text-xs font-mono uppercase tracking-wider font-semibold transition-colors relative cursor-pointer ${
                    isRegister
                      ? 'text-[#DCE8F5]'
                      : 'text-[#8795A7] hover:text-[#DCE8F5]'
                  }`}
                >
                  Create Account
                  {isRegister && (
                    <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-[#D99A4E]" />
                  )}
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-[#F16D78]/10 border border-[#F16D78]/30 text-[#F16D78] text-xs font-sans flex items-start space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F16D78]" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                        Explorer Username *
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. LunaSeeker"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16]/90 border border-[#293748] text-[#DCE8F5] text-sm font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16]/90 border border-[#293748] text-[#DCE8F5] text-sm font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                        Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Watcher of the Ridge"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16]/90 border border-[#293748] text-[#DCE8F5] text-sm font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter username or email"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16]/90 border border-[#293748] text-[#DCE8F5] text-sm font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
                      required
                    />
                  </div>
                )}

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-[#8795A7] uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#8795A7] hover:text-[#DCE8F5] flex items-center space-x-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16]/90 border border-[#293748] text-[#DCE8F5] text-sm font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
                    required
                  />
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16]/90 border border-[#293748] text-[#DCE8F5] text-sm font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
                      required
                    />
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-amber-primary w-full mt-2 py-3 px-4 rounded-lg text-sm tracking-wide flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-[#080D16] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isRegister ? 'Register Account' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Guest Access */}
              <div className="mt-6 pt-5 border-t border-[#293748] text-center">
                <p className="text-[11px] text-[#8795A7] mb-2 font-mono">
                  Instant Access &bull; No Account Needed
                </p>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-lg bg-[#172231] hover:bg-[#203445] border border-[#293748] text-[#DCE8F5] text-xs font-mono transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D99A4E]" />
                  <span>Play as Guest (LunaWatcher)</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </MoonlitAtmosphere>
  );
};
