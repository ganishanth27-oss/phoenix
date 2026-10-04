import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
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

  /* =====================================================
     ADMIN NAVIGATION
  ===================================================== */

  const navigation = [
    {
      label: "MAIN MENU",
      items: [
        {
          label: "Dashboard",
          path: "/admin",
          icon: "⌂",
        },
        {
          label: "Requests",
          path: "/admin/requests",
          icon: "▣",
        },
        {
          label: "Projects",
          path: "/admin/projects",
          icon: "◈",
        },
        {
          label: "Tasks",
          path: "/admin/tasks",
          icon: "✓",
        },
        {
          label: "Files",
          path: "/admin/files",
          icon: "▤",
        },
      ],
    },

    {
      label: "MANAGEMENT",
      items: [
        {
          label: "Managers",
          path: "/admin/managers",
          icon: "♙",
        },
        {
          label: "Users",
          path: "/admin/users",
          icon: "♙",
        },
        {
          label: "Services",
          path: "/admin/services",
          icon: "◆",
        },
        {
          label: "Permissions",
          path: "/admin/permissions",
          icon: "◉",
        },
      ],
    },

    {
      label: "SYSTEM",
      items: [
        {
          label: "Activity Logs",
          path: "/admin/activity-logs",
          icon: "◷",
        },
        {
          label: "Settings",
          path: "/admin/settings",
          icon: "⚙",
        },
      ],
    },
  ];

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading PHOENIX...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={profile}
      navigation={navigation}
      title="Admin Dashboard"
    >
      <div className="admin-dashboard">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="dashboard-heading">
          <div>
            <span className="dashboard-eyebrow">
              PHOENIX ADMINISTRATION
            </span>

            <h1>
              Good morning, {profile?.name || "Admin"} 👋
            </h1>

            <p>
              Here's what's happening across your organization today.
            </p>
          </div>

          <button
            className="refresh-dashboard-btn"
            onClick={loadDashboard}
          >
            ↻
            <span>Refresh</span>
          </button>
        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="admin-stat-grid">

          <div className="admin-stat-card purple-card">
            <div className="stat-card-top">
              <div className="stat-icon">
                ♙
              </div>

              <span>ACTIVE MANAGERS</span>
            </div>

            <strong>{stats.managers}</strong>

            <p>
              Managers currently active
            </p>
          </div>


          <div className="admin-stat-card blue-card">
            <div className="stat-card-top">
              <div className="stat-icon">
                ♙
              </div>

              <span>ACTIVE USERS</span>
            </div>

            <strong>{stats.users}</strong>

            <p>
              Registered users
            </p>
          </div>


          <div className="admin-stat-card orange-card">
            <div className="stat-card-top">
              <div className="stat-icon">
                ◈
              </div>

              <span>PROJECTS</span>
            </div>

            <strong>{stats.projects}</strong>

            <p>
              Projects in PHOENIX
            </p>
          </div>


          <div className="admin-stat-card green-card">
            <div className="stat-card-top">
              <div className="stat-icon">
                ◆
              </div>

              <span>SERVICES</span>
            </div>

            <strong>{stats.services}</strong>

            <p>
              Active company services
            </p>
          </div>

        </section>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <section className="admin-content-grid">

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <div className="dashboard-panel quick-actions-panel">

            <div className="panel-heading">
              <div>
                <h2>Quick Actions</h2>

                <p>
                  Frequently used management tools.
                </p>
              </div>

              <span className="panel-badge">
                ADMIN
              </span>
            </div>


            <div className="quick-actions-grid">

              {/* REQUESTS */}

              <button
                className="quick-action-card"
                onClick={() => navigate("/admin/requests")}
              >
                <div className="quick-icon purple">
                  ▣
                </div>

                <div className="quick-action-content">
                  <strong>
                    Requests
                  </strong>

                  <span>
                    Review customer requests
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>


              {/* PROJECTS */}

              <button
                className="quick-action-card"
                onClick={() => navigate("/admin/projects")}
              >
                <div className="quick-icon blue">
                  ◈
                </div>

                <div className="quick-action-content">
                  <strong>
                    Projects
                  </strong>

                  <span>
                    Manage company projects
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>


              {/* TASKS */}

              <button
                className="quick-action-card"
                onClick={() => navigate("/admin/tasks")}
              >
                <div className="quick-icon orange">
                  ✓
                </div>

                <div className="quick-action-content">
                  <strong>
                    Tasks
                  </strong>

                  <span>
                    Manage assigned tasks
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>


              {/* MANAGERS */}

              <button
                className="quick-action-card"
                onClick={() => navigate("/admin/managers")}
              >
                <div className="quick-icon green">
                  ♙
                </div>

                <div className="quick-action-content">
                  <strong>
                    Managers
                  </strong>

                  <span>
                    Manage manager accounts
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>


              {/* USERS */}

              <button
                className="quick-action-card"
                onClick={() => navigate("/admin/users")}
              >
                <div className="quick-icon cyan">
                  ♙
                </div>

                <div className="quick-action-content">
                  <strong>
                    Users
                  </strong>

                  <span>
                    View registered users
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>


              {/* SERVICES */}

              <button
                className="quick-action-card"
                onClick={() => navigate("/admin/services")}
              >
                <div className="quick-icon pink">
                  ◆
                </div>

                <div className="quick-action-content">
                  <strong>
                    Services
                  </strong>

                  <span>
                    Manage company services
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>


              {/* =================================================
                  MANAGER PERMISSIONS — NEW
              ================================================= */}

              <button
                className="quick-action-card permission-action-card"
                onClick={() => navigate("/admin/permissions")}
              >
                <div className="quick-icon violet">
                  ◉
                </div>

                <div className="quick-action-content">
                  <strong>
                    Manager Permissions
                  </strong>

                  <span>
                    Control manager access
                  </span>
                </div>

                <b>
                  →
                </b>
              </button>

            </div>
          </div>


          {/* =================================================
              SYSTEM STATUS
          ================================================= */}

          <div className="dashboard-panel system-panel">

            <div className="panel-heading">

              <div>
                <h2>
                  System Status
                </h2>

                <p>
                  PHOENIX platform health.
                </p>
              </div>

              <span className="system-online">
                <i></i>
                Operational
              </span>

            </div>


            <div className="system-status-list">

              {/* AUTHENTICATION */}

              <div className="system-status-item">

                <div className="status-check">
                  ✓
                </div>

                <div className="status-info">

                  <strong>
                    Authentication
                  </strong>

                  <span>
                    Supabase Auth
                  </span>

                </div>

                <b>
                  Online
                </b>

              </div>


              {/* DATABASE */}

              <div className="system-status-item">

                <div className="status-check">
                  ✓
                </div>

                <div className="status-info">

                  <strong>
                    Database
                  </strong>

                  <span>
                    PostgreSQL
                  </span>

                </div>

                <b>
                  Online
                </b>

              </div>


              {/* STORAGE */}

              <div className="system-status-item">

                <div className="status-check">
                  ✓
                </div>

                <div className="status-info">

                  <strong>
                    Storage
                  </strong>

                  <span>
                    PHOENIX Files
                  </span>

                </div>

                <b>
                  Online
                </b>

              </div>


              {/* SECURITY */}

              <div className="system-status-item">

                <div className="status-check">
                  ✓
                </div>

                <div className="status-info">

                  <strong>
                    Security
                  </strong>

                  <span>
                    Row Level Security
                  </span>

                </div>

                <b>
                  Protected
                </b>

              </div>

            </div>
          </div>

        </section>


        {/* =================================================
            WELCOME BANNER
        ================================================= */}

        <section className="admin-welcome-banner">

          <div className="welcome-content">

            <span>
              PHOENIX WORKSPACE
            </span>

            <h2>
              Everything your team needs,
              <br />
              in one workspace.
            </h2>

            <p>
              Manage users, projects, requests, tasks and
              services from a single professional workspace.
            </p>

            <button
              onClick={() => navigate("/admin/projects")}
            >
              Manage Projects

              <span>
                →
              </span>
            </button>

          </div>


          <div className="welcome-decoration">

            <div className="welcome-circle circle-one"></div>

            <div className="welcome-circle circle-two"></div>

            <div className="welcome-logo">
              <span>
                PHOENIX
              </span>
            </div>

          </div>

        </section>

      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;