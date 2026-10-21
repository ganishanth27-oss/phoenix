import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import phoenixLogo from "../assets/phoenix-logo.png";
import "./DashboardLayout.css";

function DashboardLayout({
  children,
  profile: initialProfile,
  navigation = [],
  title = "Dashboard",
}) {
  const navigate = useNavigate();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(initialProfile || null);

  useEffect(() => {
    if (initialProfile) {
      setCurrentProfile(initialProfile);
    } else {
      // Auto-load profile if not provided by caller
      const fetchSessionUser = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("profiles")
              .select("id, name, email, role, status")
              .eq("id", user.id)
              .single();
            if (data) {
              setCurrentProfile(data);
            }
          }
        } catch (e) {
          console.error("DashboardLayout profile load error:", e);
        }
      };
      fetchSessionUser();
    }
  }, [initialProfile]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
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
    if (!currentProfile?.name) {
      return "P";
    }

    return currentProfile.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  const getRoleName = () => {
    if (!currentProfile?.role) {
      return "User";
    }

    return (
      currentProfile.role.charAt(0).toUpperCase() +
      currentProfile.role.slice(1)
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Backdrop */}
      {mobileMenu && (
        <button
          className="dashboard-mobile-overlay"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar ${
          mobileMenu ? "dashboard-sidebar-open" : ""
        }`}
      >
        {/* Sidebar Brand */}
        <div className="dashboard-sidebar-logo">
          <div className="dashboard-logo-badge">
            <img src={phoenixLogo} alt="Phoenix" className="dashboard-brand-img" />
          </div>
          <div className="dashboard-logo-text">
            <strong>PHOENIX</strong>
            <span>ENTERPRISE PORTAL</span>
          </div>

          <button
            className="dashboard-mobile-close"
            onClick={closeMobileMenu}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        {/* Navigation list - supports flat array or grouped items */}
        <nav className="dashboard-navigation">
          {navigation.map((item, idx) => {
            // Group header with sub-items
            if (item.items && Array.isArray(item.items)) {
              return (
                <div key={item.label || idx} className="dashboard-nav-group">
                  <div className="dashboard-nav-label">
                    {item.label}
                  </div>
                  {item.items.map((subItem) => {
                    if (subItem.hidden) return null;
                    return (
                      <NavLink
                        key={subItem.path || subItem.label}
                        to={subItem.path}
                        end={subItem.end}
                        onClick={closeMobileMenu}
                        className={({ isActive }) =>
                          `dashboard-nav-item ${
                            isActive ? "dashboard-nav-item-active" : ""
                          }`
                        }
                      >
                        <span className="dashboard-nav-icon">
                          {subItem.icon || "•"}
                        </span>
                        <span className="dashboard-nav-text">
                          {subItem.label}
                        </span>
                        {subItem.badge && (
                          <span className="dashboard-nav-badge">
                            {subItem.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            }

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
                    isActive ? "dashboard-nav-item-active" : ""
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

        {/* Sidebar Footer Profile */}
        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-profile">
            <div className="dashboard-avatar">
              {getInitials()}
            </div>
            <div className="dashboard-profile-info">
              <strong>
                {currentProfile?.name || "Phoenix User"}
              </strong>
              <span>
                {getRoleName()} • {currentProfile?.email ? currentProfile.email.split("@")[0] : "Active"}
              </span>
            </div>
          </div>

          <button
            className="dashboard-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out of your session"
          >
            <span className="logout-icon">↪</span>
            <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Top Header Bar */}
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              className="dashboard-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation menu"
            >
              <span />
              <span />
              <span />
            </button>
            <div className="dashboard-page-breadcrumbs">
              <span className="crumb-brand">Phoenix</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-title">{title}</span>
            </div>
          </div>

          <div className="dashboard-topbar-right">
            <div className="dashboard-system-badge">
              <span className="system-dot" />
              <span>Enterprise Services</span>
            </div>

            <div className="dashboard-topbar-profile">
              <div className="dashboard-avatar dashboard-avatar-small">
                {getInitials()}
              </div>
              <div className="dashboard-topbar-profile-text">
                <strong>{currentProfile?.name || "User"}</strong>
                <span>{getRoleName()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="dashboard-content">
          {/* Subtle corporate watermark */}
          <div className="dashboard-center-logo" aria-hidden="true">
            <img src={phoenixLogo} alt="" />
          </div>

          <div className="dashboard-page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;