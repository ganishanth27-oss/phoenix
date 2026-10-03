import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    managers: 0,
    users: 0,
    projects: 0,
    services: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [
        managersResult,
        usersResult,
        projectsResult,
        servicesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("role", "manager"),

        supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("role", "user"),

        supabase
          .from("projects")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("services")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "active"),
      ]);

      setStats({
        managers: managersResult.count || 0,
        users: usersResult.count || 0,
        projects: projectsResult.count || 0,
        services: servicesResult.count || 0,
      });
    } catch (error) {
      console.error(
        "Dashboard statistics error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="admin-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="admin-sidebar">

        {/* Brand */}
        <div className="admin-brand">

          <div className="admin-logo">
            P
          </div>

          <div>
            <h2>PHOENIX</h2>
            <span>Admin Panel</span>
          </div>

        </div>


        {/* Navigation */}
        <nav className="admin-nav">

          {/* Dashboard */}
          <button
            className="active"
            onClick={() => navigate("/admin")}
          >
            Dashboard
          </button>


          {/* Managers */}
          <button
            onClick={() =>
              navigate("/admin/managers")
            }
          >
            Managers
          </button>


          {/* Users */}
          <button
            onClick={() =>
              navigate("/admin/users")
            }
          >
            Users
          </button>


          {/* Requests */}
          <button
            onClick={() =>
              navigate("/admin/requests")
            }
          >
            Requests
          </button>


          {/* Services */}
          <button
            onClick={() =>
              navigate("/admin/services")
            }
          >
            Services
          </button>


          {/* Projects */}
          <button
            onClick={() =>
              navigate("/admin/projects")
            }
          >
            Projects
          </button>


          {/* Tasks */}
          <button
            onClick={() =>
              navigate("/admin/tasks")
            }
          >
            Tasks
          </button>


          {/* Files */}
          <button
            onClick={() =>
              navigate("/admin/files")
            }
          >
            Files
          </button>


          {/* Permissions */}
          <button
            onClick={() =>
              navigate("/admin/permissions")
            }
          >
            Permissions
          </button>


          {/* Activity Logs */}
          <button
            onClick={() =>
              navigate("/admin/activity-logs")
            }
          >
            Activity Logs
          </button>


          {/* Settings */}
          <button
            onClick={() =>
              navigate("/admin/settings")
            }
          >
            Settings
          </button>


          {/* Logout */}
          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </nav>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="admin-main">

        {/* Header */}
        <header className="admin-header">

          <div>
            <h1>Dashboard</h1>

            <p>
              PHOENIX Company Management System
            </p>
          </div>


          <div className="admin-user">

            <div className="admin-avatar">
              A
            </div>

            <span>
              Admin
            </span>

          </div>

        </header>


        {/* Content */}
        <section className="admin-content">

          {/* Welcome */}
          <div className="admin-welcome">

            <h2>
              Welcome back, Admin
            </h2>

            <p>
              Manage your company operations
              from one place.
            </p>

          </div>


          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="stats-grid">

            {/* Managers */}
            <div className="stat-card">

              <p>
                Total Managers
              </p>

              <h3>
                {loading
                  ? "..."
                  : stats.managers}
              </h3>

            </div>


            {/* Users */}
            <div className="stat-card">

              <p>
                Total Users
              </p>

              <h3>
                {loading
                  ? "..."
                  : stats.users}
              </h3>

            </div>


            {/* Projects */}
            <div className="stat-card">

              <p>
                Total Projects
              </p>

              <h3>
                {loading
                  ? "..."
                  : stats.projects}
              </h3>

            </div>


            {/* Services */}
            <div className="stat-card">

              <p>
                Active Services
              </p>

              <h3>
                {loading
                  ? "..."
                  : stats.services}
              </h3>

            </div>

          </div>


          {/* =================================================
              DASHBOARD GRID
          ================================================= */}

          <div className="dashboard-grid">


            {/* =================================================
                QUICK ACTIONS
            ================================================= */}

            <div className="dashboard-card">

              <h3>
                Quick Actions
              </h3>


              <div className="quick-actions">


                {/* Manage Managers */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/managers"
                    )
                  }
                >

                  <strong>
                    Manage Managers
                  </strong>

                  <span>
                    Create and manage managers
                  </span>

                </button>


                {/* Manage Users */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/users"
                    )
                  }
                >

                  <strong>
                    Manage Users
                  </strong>

                  <span>
                    View and manage users
                  </span>

                </button>


                {/* Manage Requests */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/requests"
                    )
                  }
                >

                  <strong>
                    Manage Requests
                  </strong>

                  <span>
                    Review and assign user requests
                  </span>

                </button>


                {/* Manage Services */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/services"
                    )
                  }
                >

                  <strong>
                    Manage Services
                  </strong>

                  <span>
                    Add or edit company services
                  </span>

                </button>


                {/* Create Project */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/projects"
                    )
                  }
                >

                  <strong>
                    Create Project
                  </strong>

                  <span>
                    Start a new company project
                  </span>

                </button>


                {/* Activity Logs */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/activity-logs"
                    )
                  }
                >

                  <strong>
                    Activity Logs
                  </strong>

                  <span>
                    View recent system activities
                  </span>

                </button>


                {/* Files */}
                <button
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/admin/files"
                    )
                  }
                >

                  <strong>
                    Manage Files
                  </strong>

                  <span>
                    Upload and manage company files
                  </span>

                </button>

              </div>

            </div>


            {/* =================================================
                SYSTEM STATUS
            ================================================= */}

            <div className="dashboard-card">

              <h3>
                System Status
              </h3>

              <p>
                🟢 Authentication
              </p>

              <p>
                🟢 Database
              </p>

              <p>
                🟢 Security / RLS
              </p>

              <p>
                🟢 Storage
              </p>

              <p>
                🟢 PHOENIX System
              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default AdminDashboard;