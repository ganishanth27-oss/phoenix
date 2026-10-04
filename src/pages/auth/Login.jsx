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
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error("Login failed. Please try again.");
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account profile was not found."
        );
      }

      if (profile.status !== "active") {
        await supabase.auth.signOut();

        throw new Error(
          "Your account is currently inactive."
        );
      }

      if (profile.role === "admin") {
        navigate("/admin");
      } else if (profile.role === "manager") {
        navigate("/manager");
      } else if (profile.role === "user") {
        navigate("/user");
      } else {
        await supabase.auth.signOut();

        throw new Error(
          "Your account has an invalid role."
        );
      }
    } catch (loginError) {
      console.error("Login error:", loginError);

      setError(
        loginError.message ||
          "Unable to sign in. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">

      {/* =====================================================
          BRAND PANEL
      ===================================================== */}

      <section className="login-brand">

        <div className="login-brand-glow login-brand-glow-one" />
        <div className="login-brand-glow login-brand-glow-two" />

        <div className="login-brand-content">

          {/* LOGO */}

          <div className="login-logo-wrap">
            <img
              src={phoenixLogo}
              alt="PHOENIX"
              className="login-logo"
            />
          </div>

          {/* BRAND */}

          <div className="login-brand-text">

            <div className="login-brand-badge">
              PHOENIX WORKSPACE
            </div>

            <h1>
              Work smarter.
              <br />
              <span>Move faster.</span>
            </h1>

            <p className="login-brand-description">
              One connected workspace to manage
              people, projects, requests, tasks
              and your company's daily operations.
            </p>

          </div>

          {/* FEATURES */}

          <div className="login-feature-list">

            <div className="login-feature">

              <div className="login-feature-icon">
                ✓
              </div>

              <div>
                <strong>
                  One connected workspace
                </strong>

                <span>
                  Keep your company work organized.
                </span>
              </div>

            </div>

            <div className="login-feature">

              <div className="login-feature-icon">
                ✓
              </div>

              <div>
                <strong>
                  Role-based access
                </strong>

                <span>
                  Everyone gets the right workspace.
                </span>
              </div>

            </div>

            <div className="login-feature">

              <div className="login-feature-icon">
                ✓
              </div>

              <div>
                <strong>
                  Built for modern teams
                </strong>

                <span>
                  From requests to completed projects.
                </span>
              </div>

            </div>

          </div>

        </div>

        <div className="login-brand-footer">
          <span>© {new Date().getFullYear()} PHOENIX</span>
          <span>Management Workspace</span>
        </div>

      </section>


      {/* =====================================================
          LOGIN SECTION
      ===================================================== */}

      <section className="login-form-section">

        {/* MOBILE LOGO */}

        <div className="login-mobile-logo">

          <div className="login-mobile-logo-box">
            <img
              src={phoenixLogo}
              alt="PHOENIX"
            />
          </div>

          <div>
            <strong>PHOENIX</strong>
            <span>WORKSPACE</span>
          </div>

        </div>


        {/* LOGIN CARD */}

        <div className="login-card">

          {/* HEADER */}

          <div className="login-card-header">

            <div className="login-welcome-icon">
              <span>→</span>
            </div>

            <div>

              <p className="login-card-eyebrow">
                WELCOME BACK
              </p>

              <h2>
                Sign in to PHOENIX
              </h2>

              <p>
                Continue to your workspace.
              </p>

            </div>

          </div>


          {/* ERROR */}

          {error && (
            <div className="login-error">

              <div className="login-error-icon">
                !
              </div>

              <p>
                {error}
              </p>

            </div>
          )}


          {/* FORM */}

          <form
            className="login-form"
            onSubmit={handleLogin}
          >

            {/* EMAIL */}

            <div className="login-field">

              <label htmlFor="email">
                Email address
              </label>

              <div className="login-input-wrap">

                <span className="login-input-icon">
                  @
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="login-field">

              <div className="login-label-row">

                <label htmlFor="password">
                  Password
                </label>

              </div>

              <div className="login-input-wrap">

                <span className="login-input-icon login-password-icon">
                  •••
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>
                    Sign in
                  </span>

                  <span className="login-submit-arrow">
                    →
                  </span>
                </>
              )}

            </button>

          </form>


          {/* REGISTER */}

          <div className="login-divider">
            <span>
              Don't have an account?
            </span>
          </div>

          <Link
            to="/register"
            className="login-register-button"
          >
            Create an account
            <span>→</span>
          </Link>


          {/* SECURITY */}

          <div className="login-security">

            <span className="login-security-icon">
              ✓
            </span>

            <span>
              Secure authentication powered by
              Supabase
            </span>

          </div>

        </div>


        {/* MOBILE FOOTER */}

        <p className="login-mobile-footer">
          © {new Date().getFullYear()} PHOENIX
        </p>

      </section>

    </main>
  );
}

export default Login;