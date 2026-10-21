import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import phoenixLogo from "../../assets/phoenix-logo.png";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error("Login failed. Please try again.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error("Your account profile was not found.");
      }

      if (profile.status !== "active") {
        await supabase.auth.signOut();
        throw new Error("Your account is currently inactive. Please contact your administrator.");
      }

      if (profile.role === "admin") {
        navigate("/admin");
      } else if (profile.role === "manager") {
        navigate("/manager");
      } else if (profile.role === "user") {
        navigate("/user");
      } else {
        await supabase.auth.signOut();
        throw new Error("Your account has an invalid role.");
      }
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError(loginError.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      {/* =====================================================
          LEFT HERO BRAND PANEL (Deep Corporate Navy)
      ===================================================== */}
      <section className="login-brand">
        <div className="login-brand-top">
          <Link to="/" className="login-brand-identity">
            <div className="login-logo-badge">
              <img src={phoenixLogo} alt="Phoenix Logo" className="login-logo" />
            </div>
            <div className="login-brand-meta">
              <span className="brand-name">PHOENIX</span>
              <span className="brand-tag">Enterprise Portal</span>
            </div>
          </Link>
        </div>

        <div className="login-brand-content">
          <div className="login-pill-badge">
            <span className="pill-dot" />
            <span>Secure IT & Creative Workspace</span>
          </div>

          <h1>
            Engineered for precision.
            <br />
            <span>Built for scale.</span>
          </h1>

          <p className="login-brand-description">
            Experience unified company service delivery. From enterprise IT infrastructure and web application engineering to UI/UX and architectural blueprints.
          </p>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="feature-icon">🛡️</div>
              <div>
                <strong>Role-Based Governance</strong>
                <span>Granular access control tailored for admins, managers, and clients.</span>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="feature-icon">⚡</div>
              <div>
                <strong>End-to-End Tracking</strong>
                <span>Real-time status updates on service requests and deliverables.</span>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="feature-icon">📁</div>
              <div>
                <strong>Centralized Asset Vault</strong>
                <span>Secure cloud file sharing, reviews, and activity audit trails.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          <span>© {new Date().getFullYear()} Phoenix Solutions Inc.</span>
          <div className="footer-links">
            <span>Enterprise Service Portal</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          RIGHT LOGIN FORM SECTION
      ===================================================== */}
      <section className="login-form-section">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-avatar-icon">
              <span>🔐</span>
            </div>
            <h2>Sign in to Phoenix</h2>
            <p>Enter your credentials to access your portal</p>
          </div>

          {error && (
            <div className="login-error-alert" role="alert">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
              </div>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>New customer or team member?</span>
          </div>

          <Link to="/register" className="register-redirect-btn">
            Create an Account
          </Link>

          <div className="login-security-notice">
            <span className="sec-dot" />
            <span>256-bit encrypted authentication powered by Supabase</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;