import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: authError,
      } = await supabase.auth.signUp({
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
        throw new Error(
          "Registration failed. Please try again."
        );
      }

      setSuccess(
        "Account created successfully. You can now sign in."
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/");
      }, 1800);
    } catch (registerError) {
      console.error(
        "Registration error:",
        registerError
      );

      setError(
        registerError.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">

      {/* =====================================================
          LEFT BRAND SECTION
      ===================================================== */}

      <section className="register-brand">

        <div className="register-brand-content">

          <div className="register-logo-wrap">
            <img
              src="/src/assets/phoenix-logo.png"
              alt="PHOENIX"
              className="register-logo"
            />
          </div>

          <p className="register-eyebrow">
            JOIN PHOENIX
          </p>

          <h1>
            Build better.
            <span> Work smarter.</span>
          </h1>

          <p className="register-brand-description">
            Create your PHOENIX account and get
            access to a connected workspace for
            projects, requests and team collaboration.
          </p>

          <div className="register-steps">

            <div className="register-step">

              <div className="register-step-number">
                01
              </div>

              <div>
                <strong>
                  Create your account
                </strong>

                <span>
                  Set up your basic profile.
                </span>
              </div>

            </div>

            <div className="register-step">

              <div className="register-step-number">
                02
              </div>

              <div>
                <strong>
                  Submit your requests
                </strong>

                <span>
                  Tell your team what you need.
                </span>
              </div>

            </div>

            <div className="register-step">

              <div className="register-step-number">
                03
              </div>

              <div>
                <strong>
                  Track your work
                </strong>

                <span>
                  Follow projects from start to finish.
                </span>
              </div>

            </div>

          </div>

        </div>

        <div className="register-brand-footer">
          © {new Date().getFullYear()} PHOENIX
        </div>

      </section>

      {/* =====================================================
          REGISTER FORM
      ===================================================== */}

      <section className="register-form-section">

        <div className="register-mobile-logo">

          <img
            src="/src/assets/phoenix-logo.png"
            alt="PHOENIX"
          />

          <span>
            PHOENIX
          </span>

        </div>

        <div className="register-card">

          <div className="register-card-header">

            <div className="register-welcome-icon">
              ✨
            </div>

            <div>
              <h2>
                Create your account
              </h2>

              <p>
                Join your PHOENIX workspace.
              </p>
            </div>

          </div>

          {error && (
            <div className="register-message register-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="register-message register-success">
              <span>✓</span>
              <p>{success}</p>
            </div>
          )}

          <form
            className="register-form"
            onSubmit={handleRegister}
          >

            {/* NAME */}

            <div className="register-field">

              <label htmlFor="name">
                Full name *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
                required
              />

            </div>

            {/* EMAIL */}

            <div className="register-field">

              <label htmlFor="email">
                Email address *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
                required
              />

            </div>

            {/* PHONE */}

            <div className="register-field">

              <label htmlFor="phone">
                Phone number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                disabled={loading}
              />

            </div>

            {/* PASSWORD ROW */}

            <div className="register-password-grid">

              <div className="register-field">

                <label htmlFor="password">
                  Password *
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />

              </div>

              <div className="register-field">

                <label htmlFor="confirmPassword">
                  Confirm password *
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />

              </div>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="register-spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <span>→</span>
                </>
              )}
            </button>

          </form>

          <div className="register-divider">
            <span>Already have an account?</span>
          </div>

          <Link
            to="/"
            className="register-login-button"
          >
            Back to sign in
          </Link>

          <p className="register-security">
            🔒 Your information is protected with secure
            authentication.
          </p>

        </div>

      </section>

    </main>
  );
}

export default Register;