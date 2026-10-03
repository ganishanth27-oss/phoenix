import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/phoenix-logo.png";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    managers: 0,
    users: 0,
    projects: 0,
    services: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, phone, role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (
        profileData.role !== "admin" ||
        profileData.status !== "active"
      ) {
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setProfile(profileData);

      const [
        managersResult,
        usersResult,
        projectsResult,
        servicesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "manager")
          .eq("status", "active"),

        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "user")
          .eq("status", "active"),

        supabase
          .from("projects")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      setStats({
        managers: managersResult.count || 0,
        users: usersResult.count || 0,
        projects: projectsResult.count || 0,
        services: servicesResult.count || 0,
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-box">
          <img src={logo} alt="PHOENIX" />
          <p>Loading PHOENIX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">

      {/* ================= SIDEBAR ================= */}

      <aside className="admin-sidebar">

        <div className="admin-brand">
          <div className="admin-brand-logo">
            <img src={logo} alt="PHOENIX Logo" />
          </div>

          <div className="admin-brand-text">
            <h2>PHOENIX</h2>
            <span>Management Platform</span>
          </div>
        </div>

        <div className="admin-sidebar-label">
          MAIN MENU
        </div>

        <nav className="admin-nav">

          <button
            className="admin-nav-item active"
            onClick={() => navigate("/admin")}
          >
            <span className="admin-nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/requests")}
          >
            <span className="admin-nav-icon">▣</span>
            <span>Requests</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/projects")}
          >
            <span className="admin-nav-icon">▤</span>
            <span>Projects</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/tasks")}
          >
            <span className="admin-nav-icon">✓</span>
            <span>Tasks</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/files")}
          >
            <span className="admin-nav-icon">⌕</span>
            <span>Files</span>
          </button>

          <div className="admin-sidebar-label">
            MANAGEMENT
          </div>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/managers")}
          >
            <span className="admin-nav-icon">♙</span>
            <span>Managers</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/users")}
          >
            <span className="admin-nav-icon">♙</span>
            <span>Users</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/services")}
          >
            <span className="admin-nav-icon">◆</span>
            <span>Services</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/permissions")}
          >
            <span className="admin-nav-icon">◈</span>
            <span>Permissions</span>
          </button>

          <div className="admin-sidebar-label">
            SYSTEM
          </div>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/activity-logs")}
          >
            <span className="admin-nav-icon">◷</span>
            <span>Activity Logs</span>
          </button>

          <button
            className="admin-nav-item"
            onClick={() => navigate("/admin/settings")}
          >
            <span className="admin-nav-icon">⚙</span>
            <span>Settings</span>
          </button>

        </nav>

        <div className="admin-sidebar-bottom">

          <div className="admin-mini-profile">
            <div className="admin-mini-avatar">
              {profile?.name?.charAt(0).toUpperCase() || "A"}
            </div>

            <div className="admin-mini-info">
              <strong>{profile?.name || "Administrator"}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button
            className="admin-logout"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="admin-main">

        {/* TOPBAR */}

        <header className="admin-topbar">

          <div>
            <div className="admin-breadcrumb">
              PHOENIX <span>/</span> Dashboard
            </div>

            <h1>Good evening, {profile?.name || "Admin"} 👋</h1>

            <p>
              Here's what's happening across your organization today.
            </p>
          </div>

          <div className="admin-topbar-right">

            <button
              className="admin-icon-button"
              title="Refresh"
              onClick={loadDashboard}
            >
              ↻
            </button>

            <div className="admin-user-profile">

              <div className="admin-avatar">
                {profile?.name?.charAt(0).toUpperCase() || "A"}
              </div>

              <div>
                <strong>{profile?.name || "Admin"}</strong>
                <span>Administrator</span>
              </div>

            </div>

          </div>

        </header>

        {/* STATS */}

        <section className="admin-stat-grid">

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <div className="admin-stat-icon purple">
                ♙
              </div>

              <span className="admin-stat-label">
                ACTIVE MANAGERS
              </span>
            </div>

            <strong>{stats.managers}</strong>

            <p>
              Managers currently active
            </p>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <div className="admin-stat-icon blue">
                ♙
              </div>

              <span className="admin-stat-label">
                ACTIVE USERS
              </span>
            </div>

            <strong>{stats.users}</strong>

            <p>
              Registered users
            </p>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <div className="admin-stat-icon orange">
                ▤
              </div>

              <span className="admin-stat-label">
                PROJECTS
              </span>
            </div>

            <strong>{stats.projects}</strong>

            <p>
              Projects in PHOENIX
            </p>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <div className="admin-stat-icon green">
                ◆
              </div>

              <span className="admin-stat-label">
                SERVICES
              </span>
            </div>

            <strong>{stats.services}</strong>

            <p>
              Active company services
            </p>
          </div>

        </section>

        {/* CONTENT GRID */}

        <section className="admin-content-grid">

          {/* QUICK ACTIONS */}

          <div className="admin-panel">

            <div className="admin-panel-header">
              <div>
                <h2>Quick Actions</h2>
                <p>Frequently used management tools.</p>
              </div>
            </div>

            <div className="admin-action-grid">

              <button
                onClick={() => navigate("/admin/requests")}
                className="admin-action-card"
              >
                <div className="admin-action-icon purple">
                  ▣
                </div>
                <div>
                  <strong>Requests</strong>
                  <span>Review customer requests</span>
                </div>
                <b>→</b>
              </button>

              <button
                onClick={() => navigate("/admin/projects")}
                className="admin-action-card"
              >
                <div className="admin-action-icon blue">
                  ▤
                </div>
                <div>
                  <strong>Projects</strong>
                  <span>Manage company projects</span>
                </div>
                <b>→</b>
              </button>

              <button
                onClick={() => navigate("/admin/tasks")}
                className="admin-action-card"
              >
                <div className="admin-action-icon orange">
                  ✓
                </div>
                <div>
                  <strong>Tasks</strong>
                  <span>Manage assigned tasks</span>
                </div>
                <b>→</b>
              </button>

              <button
                onClick={() => navigate("/admin/managers")}
                className="admin-action-card"
              >
                <div className="admin-action-icon green">
                  ♙
                </div>
                <div>
                  <strong>Managers</strong>
                  <span>Manage manager accounts</span>
                </div>
                <b>→</b>
              </button>

              <button
                onClick={() => navigate("/admin/users")}
                className="admin-action-card"
              >
                <div className="admin-action-icon cyan">
                  ♙
                </div>
                <div>
                  <strong>Users</strong>
                  <span>View registered users</span>
                </div>
                <b>→</b>
              </button>

              <button
                onClick={() => navigate("/admin/services")}
                className="admin-action-card"
              >
                <div className="admin-action-icon pink">
                  ◆
                </div>
                <div>
                  <strong>Services</strong>
                  <span>Manage company services</span>
                </div>
                <b>→</b>
              </button>

            </div>

          </div>

          {/* SYSTEM STATUS */}

          <div className="admin-panel admin-system-panel">

            <div className="admin-panel-header">
              <div>
                <h2>System Status</h2>
                <p>PHOENIX platform health.</p>
              </div>

              <span className="system-online">
                <i></i>
                Operational
              </span>
            </div>

            <div className="system-status-list">

              <div className="system-status-item">
                <div className="system-status-icon">
                  ✓
                </div>

                <div>
                  <strong>Authentication</strong>
                  <span>Supabase Auth</span>
                </div>

                <b>Online</b>
              </div>

              <div className="system-status-item">
                <div className="system-status-icon">
                  ✓
                </div>

                <div>
                  <strong>Database</strong>
                  <span>PostgreSQL</span>
                </div>

                <b>Online</b>
              </div>

              <div className="system-status-item">
                <div className="system-status-icon">
                  ✓
                </div>

                <div>
                  <strong>Storage</strong>
                  <span>PHOENIX Files</span>
                </div>

                <b>Online</b>
              </div>

              <div className="system-status-item">
                <div className="system-status-icon">
                  ✓
                </div>

                <div>
                  <strong>Security</strong>
                  <span>Row Level Security</span>
                </div>

                <b>Protected</b>
              </div>

            </div>

          </div>

        </section>

        {/* WELCOME BANNER */}

        <section className="admin-welcome">

          <div className="admin-welcome-content">

            <span>PHOENIX ADMINISTRATION</span>

            <h2>
              Everything your team needs,
              in one workspace.
            </h2>

            <p>
              Manage users, projects, requests, tasks and
              services from a single professional workspace.
            </p>

          </div>

          <div className="admin-welcome-logo">
            <img src={logo} alt="PHOENIX" />
          </div>

        </section>

      </main>

    </div>
  );
}

export default AdminDashboard;