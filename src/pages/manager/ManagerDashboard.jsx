import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/phoenix-logo.png";
import "./ManagerDashboard.css";

function ManagerDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManagerData();
  }, []);

  const loadManagerData = async () => {
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

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, name, email, phone, role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (
        profileData.role !== "manager" ||
        profileData.status !== "active"
      ) {
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setProfile(profileData);

      const {
        data: permissionData,
        error: permissionError,
      } = await supabase
        .from("manager_permissions")
        .select(`
          permission_id,
          permissions (
            id,
            name,
            description
          )
        `)
        .eq("manager_id", user.id);

      if (permissionError) {
        throw permissionError;
      }

      const permissionNames = (permissionData || [])
        .map((item) => item.permissions?.name)
        .filter(Boolean);

      setPermissions(permissionNames);
    } catch (error) {
      console.error("Manager dashboard error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  /*
   * Open the real project management page.
   *
   * The actual project creation form is inside
   * ManagerProjects.jsx.
   */
  const handleCreateProject = () => {
    if (!hasPermission("create_projects")) {
      alert(
        "You do not have permission to create projects."
      );
      return;
    }

    navigate("/manager/projects");
  };

  if (loading) {
    return (
      <div className="manager-loading">
        <div className="manager-loading-box">
          <img src={logo} alt="PHOENIX" />
          <p>Loading PHOENIX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="manager-sidebar">

        <div className="manager-brand">

          <div className="manager-logo">
            <img
              src={logo}
              alt="PHOENIX Logo"
            />
          </div>

          <div className="manager-brand-text">
            <h2>PHOENIX</h2>
            <span>Manager Portal</span>
          </div>

        </div>

        <div className="manager-sidebar-label">
          WORKSPACE
        </div>

        <nav className="manager-nav">

          {/* Dashboard */}

          <button
            className="manager-nav-item active"
            onClick={() => navigate("/manager")}
          >
            <span className="manager-nav-icon">
              ⌂
            </span>

            <span>
              Dashboard
            </span>
          </button>

          {/* Users */}

          {hasPermission("view_users") && (
            <button
              className="manager-nav-item"
              onClick={() =>
                navigate("/manager/users")
              }
            >
              <span className="manager-nav-icon">
                ♙
              </span>

              <span>
                Users
              </span>
            </button>
          )}

          {/* Projects */}

          {hasPermission("view_projects") && (
            <button
              className="manager-nav-item"
              onClick={() =>
                navigate("/manager/projects")
              }
            >
              <span className="manager-nav-icon">
                ▤
              </span>

              <span>
                Projects
              </span>
            </button>
          )}

          {/* Tasks */}

          {hasPermission("view_tasks") && (
            <button
              className="manager-nav-item"
              onClick={() =>
                navigate("/manager/tasks")
              }
            >
              <span className="manager-nav-icon">
                ✓
              </span>

              <span>
                Tasks
              </span>
            </button>
          )}

          {/* Files */}

          {hasPermission("upload_files") && (
            <button
              className="manager-nav-item"
              onClick={() =>
                navigate("/manager/files")
              }
            >
              <span className="manager-nav-icon">
                ⌕
              </span>

              <span>
                Files
              </span>
            </button>
          )}

          {/* Review */}

          {hasPermission("review_work") && (
            <button
              className="manager-nav-item"
              onClick={() =>
                navigate("/manager/review")
              }
            >
              <span className="manager-nav-icon">
                ◉
              </span>

              <span>
                Review Work
              </span>
            </button>
          )}

          {/* Reports */}

          {hasPermission("view_reports") && (
            <button
              className="manager-nav-item"
              onClick={() =>
                navigate("/manager/reports")
              }
            >
              <span className="manager-nav-icon">
                ▥
              </span>

              <span>
                Reports
              </span>
            </button>
          )}

        </nav>

        <div className="manager-sidebar-label manager-system-label">
          ACCOUNT
        </div>

        <div className="manager-sidebar-bottom">

          <div className="manager-mini-profile">

            <div className="manager-mini-avatar">
              {profile?.name
                ? profile.name
                    .charAt(0)
                    .toUpperCase()
                : "M"}
            </div>

            <div className="manager-mini-info">

              <strong>
                {profile?.name || "Manager"}
              </strong>

              <span>
                Manager
              </span>

            </div>

          </div>

          <button
            className="manager-logout"
            onClick={handleLogout}
          >
            <span>
              ↪
            </span>

            <span>
              Logout
            </span>
          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="manager-main">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="manager-topbar">

          <div>

            <div className="manager-breadcrumb">
              PHOENIX
              <span>/</span>
              Manager Dashboard
            </div>

            <h1>
              Welcome back,{" "}
              {profile?.name || "Manager"} 👋
            </h1>

            <p>
              Manage your assigned workspace and
              keep your team moving.
            </p>

          </div>

          <div className="manager-topbar-right">

            <button
              className="manager-refresh"
              onClick={loadManagerData}
              title="Refresh permissions"
            >
              ↻
            </button>

            <div className="manager-profile">

              <div className="manager-avatar">

                {profile?.name
                  ? profile.name
                      .charAt(0)
                      .toUpperCase()
                  : "M"}

              </div>

              <div>

                <strong>
                  {profile?.name || "Manager"}
                </strong>

                <span>
                  Manager
                </span>

              </div>

            </div>

          </div>

        </header>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="manager-stats">

          {/* PROJECT ACCESS */}

          <div className="manager-stat-card">

            <div className="manager-stat-icon purple">
              ▤
            </div>

            <div>

              <span>
                PROJECT ACCESS
              </span>

              <strong>
                {hasPermission("view_projects")
                  ? "Enabled"
                  : "Restricted"}
              </strong>

              <small>
                Project management
              </small>

            </div>

          </div>

          {/* TASK ACCESS */}

          <div className="manager-stat-card">

            <div className="manager-stat-icon blue">
              ✓
            </div>

            <div>

              <span>
                TASK ACCESS
              </span>

              <strong>
                {hasPermission("view_tasks")
                  ? "Enabled"
                  : "Restricted"}
              </strong>

              <small>
                Task management
              </small>

            </div>

          </div>

          {/* USER ACCESS */}

          <div className="manager-stat-card">

            <div className="manager-stat-icon green">
              ♙
            </div>

            <div>

              <span>
                USER ACCESS
              </span>

              <strong>
                {hasPermission("view_users")
                  ? "Enabled"
                  : "Restricted"}
              </strong>

              <small>
                Assigned customers
              </small>

            </div>

          </div>

          {/* PERMISSIONS */}

          <div className="manager-stat-card">

            <div className="manager-stat-icon orange">
              ◈
            </div>

            <div>

              <span>
                PERMISSIONS
              </span>

              <strong>
                {permissions.length}
              </strong>

              <small>
                Active permissions
              </small>

            </div>

          </div>

        </section>

        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="manager-welcome">

          <div className="manager-welcome-content">

            <span className="manager-welcome-label">
              PHOENIX MANAGER WORKSPACE
            </span>

            <h2>
              Your workspace is ready.
            </h2>

            <p>
              Access projects, tasks, customers,
              files and reports based on the
              permissions assigned by your
              administrator.
            </p>

            <div className="manager-welcome-actions">

              {/* VIEW PROJECTS */}

              {hasPermission("view_projects") && (
                <button
                  onClick={() =>
                    navigate("/manager/projects")
                  }
                >
                  View Projects
                  <span>
                    →
                  </span>
                </button>
              )}

              {/* CREATE PROJECT */}

              {hasPermission("create_projects") && (
                <button
                  onClick={handleCreateProject}
                >
                  Create Project
                  <span>
                    +
                  </span>
                </button>
              )}

              {/* VIEW TASKS */}

              {hasPermission("view_tasks") && (
                <button
                  onClick={() =>
                    navigate("/manager/tasks")
                  }
                >
                  View Tasks
                  <span>
                    →
                  </span>
                </button>
              )}

              {/* VIEW USERS */}

              {hasPermission("view_users") && (
                <button
                  onClick={() =>
                    navigate("/manager/users")
                  }
                >
                  View Users
                  <span>
                    →
                  </span>
                </button>
              )}

            </div>

          </div>

          <div className="manager-welcome-logo">
            <img
              src={logo}
              alt="PHOENIX"
            />
          </div>

        </section>

        {/* =================================================
            ACCESS CONTROL
        ================================================= */}

        <section className="manager-permissions-card">

          <div className="manager-section-header">

            <div>

              <span className="manager-section-label">
                ACCESS CONTROL
              </span>

              <h2>
                Your Access
              </h2>

              <p>
                Features currently assigned to
                your manager account.
              </p>

            </div>

            <div className="manager-permission-count">

              {permissions.length}

              <span>
                permissions
              </span>

            </div>

          </div>

          {permissions.length === 0 ? (

            <div className="no-permissions">

              <div className="no-permission-icon">
                🔒
              </div>

              <h3>
                No permissions assigned
              </h3>

              <p>
                Please contact the PHOENIX
                administrator to receive access
                to manager features.
              </p>

            </div>

          ) : (

            <div className="permission-tags">

              {permissions.map(
                (permission) => (

                  <div
                    className="permission-tag"
                    key={permission}
                  >
                    <span>
                      ✓
                    </span>

                    {permission.replaceAll(
                      "_",
                      " "
                    )}

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default ManagerDashboard;