import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/phoenix-logo.png";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
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
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Your account profile was not found.");
      }

      if (profile.status !== "active") {
        await supabase.auth.signOut();
        throw new Error("Your account is currently inactive.");
      }

      if (profile.role === "admin") {
        navigate("/admin");
      } else if (profile.role === "manager") {
        navigate("/manager");
      } else {
        navigate("/user");
      }
    } catch (err) {
      setError(err.message || "Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT BRAND SECTION */}
      <div className="login-brand">
        <div className="brand-content">
          <div className="brand-logo-wrapper">
            <img src={logo} alt="PHOENIX" className="brand-logo" />
          </div>

          <h1>PHOENIX</h1>

          <p className="brand-tagline">
            Powering work. Managing progress.
          </p>

          <div className="brand-line"></div>

          <p className="brand-description">
            A smart workspace for managing services, projects, tasks and
            collaboration in one place.
          </p>

          <div className="brand-features">
            <div className="brand-feature">
              <span>✓</span>
              <p>Manage projects</p>
            </div>

            <div className="brand-feature">
              <span>✓</span>
              <p>Track requests</p>
            </div>

            <div className="brand-feature">
              <span>✓</span>
              <p>Work with your team</p>
            </div>
          </div>
        </div>

        <div className="brand-footer">
          © 2026 PHOENIX Workspace
        </div>
      </div>

      {/* RIGHT LOGIN SECTION */}
      <div className="login-section">
        <div className="login-card">
          <div className="mobile-logo">
            <img src={logo} alt="PHOENIX" />
            <span>PHOENIX</span>
          </div>

          <div className="login-heading">
            <span className="login-small-title">WELCOME BACK</span>

            <h2>Sign in to PHOENIX</h2>

            <p>
              Access your workspace and continue where you left off.
            </p>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <span className="input-icon">✉</span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <span className="input-icon">●</span>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <div className="register-box">
            <p>Don't have a PHOENIX account?</p>

            <Link to="/register" className="register-link">
              Create an account
              <span>→</span>
            </Link>
          </div>

          <p className="login-security">
            🔒 Your account is protected with secure authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;