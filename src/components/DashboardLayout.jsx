import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import phoenixLogo from "../assets/phoenix-logo.png";
import "./DashboardLayout.css";

function DashboardLayout({
  children,
  profile,
  navigation = [],
  title = "Dashboard",
}) {
  const navigate = useNavigate();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMobileMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenu(false);
  };

  const getInitials = () => {
    if (!profile?.name) {
      return "P";
    }

    return profile.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  const getRoleName = () => {
    if (!profile?.role) {
      return "User";
    }

    return (
      profile.role.charAt(0).toUpperCase() +
      profile.role.slice(1)
    );
  };

  return (
    <div className="dashboard-layout">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileMenu && (
        <button
          className="dashboard-mobile-overlay"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`dashboard-sidebar ${
          mobileMenu ? "dashboard-sidebar-open" : ""
        }`}
      >

        {/* SIDEBAR BRAND - TEXT ONLY */}

        <div className="dashboard-sidebar-logo">

          <div className="dashboard-logo-text">
            <strong>PHOENIX</strong>
            <span>WORKSPACE</span>
          </div>

          <button
            className="dashboard-mobile-close"
            onClick={closeMobileMenu}
            aria-label="Close navigation"
          >
            ×
          </button>

        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="dashboard-navigation">

          <div className="dashboard-nav-label">
            WORKSPACE
          </div>

          {navigation.map((item) => {

            if (item.hidden) {
              return null;
            }

            return (
              <NavLink
                key={item.path || item.label}
                to={item.path}
                end={item.end}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `dashboard-nav-item ${
                    isActive
                      ? "dashboard-nav-item-active"
                      : ""
                  }`
                }
              >

                <span className="dashboard-nav-icon">
                  {item.icon || "•"}
                </span>

                <span className="dashboard-nav-text">
                  {item.label}
                </span>

                {item.badge && (
                  <span className="dashboard-nav-badge">
                    {item.badge}
                  </span>
                )}

              </NavLink>
            );
          })}

        </nav>

        {/* =================================================
            SIDEBAR PROFILE
        ================================================= */}

        <div className="dashboard-sidebar-bottom">

          <div className="dashboard-profile">

            <div className="dashboard-avatar">
              {getInitials()}
            </div>

            <div className="dashboard-profile-info">

              <strong>
                {profile?.name || "PHOENIX User"}
              </strong>

              <span>
                {getRoleName()}
              </span>

            </div>

          </div>

          {/* SIGN OUT */}

          <button
            className="dashboard-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >

            <span>↪</span>

            {loggingOut
              ? "Signing out..."
              : "Sign out"}

          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="dashboard-main">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="dashboard-topbar">

          <div className="dashboard-topbar-left">

            <button
              className="dashboard-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <span />
              <span />
              <span />
            </button>

            <div className="dashboard-mobile-title">
              {title}
            </div>

          </div>

          {/* TOP RIGHT */}

          <div className="dashboard-topbar-right">

            <button
              className="dashboard-notification"
              aria-label="Notifications"
            >
              <span>♢</span>
              <i />
            </button>

            <div className="dashboard-topbar-profile">

              <div className="dashboard-avatar dashboard-avatar-small">
                {getInitials()}
              </div>

              <div className="dashboard-topbar-profile-text">

                <strong>
                  {profile?.name || "User"}
                </strong>

                <span>
                  {getRoleName()}
                </span>

              </div>

            </div>

          </div>

        </header>

        {/* =================================================
            CONTENT AREA
        ================================================= */}

        <main className="dashboard-content">

          {/* =================================================
              SINGLE PHOENIX CENTER WATERMARK

              This is the ONLY dashboard logo image.

              It is inside DashboardLayout, therefore it
              appears automatically for:
              - Admin
              - Manager
              - User
          ================================================= */}

          <div
            className="dashboard-center-logo"
            aria-hidden="true"
          >
            <img
              src={phoenixLogo}
              alt=""
            />
          </div>

          {/* ACTUAL PAGE CONTENT */}

          <div className="dashboard-page-content">
            {children}
          </div>

        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;