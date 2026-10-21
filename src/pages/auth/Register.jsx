import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import phoenixLogo from "../../assets/phoenix-logo.png";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            name: form.name.trim(),
            phone: form.phone.trim(),
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!data.user) {
        throw new Error("Registration could not be completed. Please try again.");
      }

      setSuccess("Account registered successfully! Redirecting you to sign in...");
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (registerError) {
      console.error("Registration error:", registerError);
      setError(registerError.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      {/* =====================================================
          LEFT BRAND HERO PANEL
      ===================================================== */}
      <section className="register-brand">
        <div className="register-brand-top">
          <Link to="/" className="register-brand-identity">
            <div className="register-logo-badge">
              <img src={phoenixLogo} alt="Phoenix" className="register-logo" />
            </div>
            <div className="register-brand-meta">
              <span className="brand-name">PHOENIX</span>
              <span className="brand-tag">Client Registration</span>
            </div>
          </Link>
        </div>

        <div className="register-brand-content">
          <div className="register-pill-badge">
            <span className="pill-dot" />
            <span>Join 100+ Enterprise Teams</span>
          </div>

          <h1>
            Transforming IT & Creative
            <br />
            <span>Service Delivery.</span>
          </h1>

          <p className="register-brand-description">
            Create an account to submit service requests, track active deliverables, review design blueprints, and communicate with your dedicated project team.
          </p>

          <div className="register-steps-timeline">
            <div className="timeline-item">
              <div className="step-num">01</div>
              <div className="step-text">
                <strong>Create your profile</strong>
                <span>Instant sign-up with role-based dashboard access</span>
              </div>
            </div>

            <div className="timeline-item">
              <div className="step-num">02</div>
              <div className="step-text">
                <strong>Submit service requests</strong>
                <span>Web, apps, 3D design, construction drafting & more</span>
              </div>
            </div>

            <div className="timeline-item">
              <div className="step-num">03</div>
              <div className="step-text">
                <strong>Real-time delivery tracking</strong>
                <span>Milestone updates, file vaults and verified quality</span>
              </div>
            </div>
          </div>
        </div>

        <div className="register-brand-footer">
          <span>© {new Date().getFullYear()} Phoenix Solutions Inc.</span>
          <span>Enterprise Workspace</span>
        </div>
      </section>

      {/* =====================================================
          RIGHT REGISTRATION FORM
      ===================================================== */}
      <section className="register-form-section">
        <div className="register-card">
          <div className="register-card-header">
            <div className="register-icon-wrap">
              <span>🚀</span>
            </div>
            <h2>Create an Account</h2>
            <p>Get started with your Phoenix client workspace</p>
          </div>

          {error && (
            <div className="register-alert error-alert" role="alert">
              <span className="alert-symbol">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="register-alert success-alert" role="alert">
              <span className="alert-symbol">✓</span>
              <p>{success}</p>
            </div>
          )}

          <form className="register-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Work Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="sarah@company.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone (Optional)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="show-password-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                <span>Show passwords</span>
              </label>
            </div>

            <button
              type="submit"
              className="register-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="register-spinner" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="register-divider">
            <span>Already have an account?</span>
          </div>

          <Link to="/" className="login-redirect-btn">
            Sign In to Existing Account
          </Link>

          <p className="register-security-note">
            🔒 By registering, your information is protected with industry-standard encryption.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;