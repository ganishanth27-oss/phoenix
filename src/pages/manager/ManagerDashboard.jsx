import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import phoenixLogo from "../../assets/phoenix-logo.png";
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

  const handleCreateProject = () => {
    if (!hasPermission("create_projects")) {
      alert("You do not have permission to create projects.");
      return;
    }

    navigate("/manager/projects");
  };

  /* =====================================================
     MANAGER NAVIGATION
  ===================================================== */

  const navigation = [
    {
      label: "WORKSPACE",

      items: [
        {
          label: "Dashboard",
          path: "/manager",
          icon: "⌂",
        },

        /* REQUESTS */

        ...(hasPermission("view_requests")
          ? [
              {
                label: "Requests",
                path: "/manager/requests",
                icon: "▣",
              },
            ]
          : []),

        /* USERS */

        ...(hasPermission("view_users")
          ? [
              {
                label: "Users",
                path: "/manager/users",
                icon: "♙",
              },
            ]
          : []),

        /* PROJECTS */

        ...(hasPermission("view_projects")
          ? [
              {
                label: "Projects",
                path: "/manager/projects",
                icon: "◈",
              },
            ]
          : []),

        /* TASKS */

        ...(hasPermission("view_tasks")
          ? [
              {
                label: "Tasks",
                path: "/manager/tasks",
                icon: "✓",
              },
            ]
          : []),

        /* FILES */

        ...(hasPermission("upload_files")
          ? [
              {
                label: "Files",
                path: "/manager/files",
                icon: "▤",
              },
            ]
          : []),

        /* REVIEW */

        ...(hasPermission("review_work")
          ? [
              {
                label: "Review Work",
                path: "/manager/review",
                icon: "◉",
              },
            ]
          : []),

        /* REPORTS */

        ...(hasPermission("view_reports")
          ? [
              {
                label: "Reports",
                path: "/manager/reports",
                icon: "▥",
              },
            ]
          : []),
      ],
    },
  ];

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="manager-dashboard-loading">
        <div className="manager-loading-spinner"></div>

        <p>
          Loading PHOENIX...
        </p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={profile}
      navigation={navigation}
      title="Manager Dashboard"
    >
      <div className="manager-dashboard-page">

        {/* =================================================
            CENTER PHOENIX LOGO
        ================================================= */}

        <div className="dashboard-center-logo">
          <img
            src={phoenixLogo}
            alt="PHOENIX"
          />
        </div>


        {/* =================================================
            HEADER
        ================================================= */}

        <section className="manager-heading">

          <div>

            <span className="manager-eyebrow">
              PHOENIX MANAGER WORKSPACE
            </span>

            <h1>
              Welcome back, {profile?.name || "Manager"} 👋
            </h1>

            <p>
              Manage your assigned workspace and keep your team moving.
            </p>

          </div>

          <button
            className="manager-refresh-btn"
            onClick={loadManagerData}
          >
            ↻

            <span>
              Refresh
            </span>
          </button>

        </section>


        {/* =================================================
            ACCESS STATS
        ================================================= */}

        <section className="manager-stats">

          {/* PROJECT ACCESS */}

          <div className="manager-stat-card purple">

            <div className="manager-stat-icon">
              ◈
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

          <div className="manager-stat-card blue">

            <div className="manager-stat-icon">
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

          <div className="manager-stat-card green">

            <div className="manager-stat-icon">
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

          <div className="manager-stat-card orange">

            <div className="manager-stat-icon">
              ◉
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
            MAIN GRID
        ================================================= */}

        <section className="manager-main-grid">

          {/* =================================================
              WELCOME
          ================================================= */}

          <div className="manager-welcome-card">

            <div className="manager-welcome-content">

              <span>
                YOUR WORKSPACE
              </span>

              <h2>
                Everything assigned to you,
                <br />
                in one place.
              </h2>

              <p>
                Access projects, tasks, customers,
                files, requests and reports based on
                the permissions assigned by your
                administrator.
              </p>


              <div className="manager-actions">

                {/* REQUESTS */}

                {hasPermission("view_requests") && (
                  <button
                    className="primary-manager-action"
                    onClick={() =>
                      navigate("/manager/requests")
                    }
                  >
                    View Requests

                    <span>
                      →
                    </span>
                  </button>
                )}


                {/* PROJECTS */}

                {hasPermission("view_projects") && (
                  <button
                    className="primary-manager-action"
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
                    className="secondary-manager-action"
                    onClick={handleCreateProject}
                  >
                    Create Project

                    <span>
                      +
                    </span>
                  </button>
                )}


                {/* TASKS */}

                {hasPermission("view_tasks") && (
                  <button
                    className="secondary-manager-action"
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

              </div>

            </div>


            {/* DECORATION */}

            <div className="manager-welcome-decoration">

              <div className="manager-orbit orbit-one"></div>

              <div className="manager-orbit orbit-two"></div>

              <div className="manager-brand-circle">
                <span>
                  PHOENIX
                </span>
              </div>

            </div>

          </div>


          {/* =================================================
              ACCOUNT
          ================================================= */}

          <div className="manager-account-card">

            <div className="manager-card-heading">

              <div>

                <span>
                  ACCOUNT
                </span>

                <h2>
                  Your Profile
                </h2>

              </div>

              <div className="profile-status">

                <i></i>

                Active

              </div>

            </div>


            <div className="large-manager-avatar">

              {profile?.name
                ? profile.name.charAt(0).toUpperCase()
                : "M"}

            </div>


            <h3>
              {profile?.name || "Manager"}
            </h3>


            <p>
              {profile?.email || "No email available"}
            </p>


            <div className="account-details">

              <div>

                <span>
                  ROLE
                </span>

                <strong>
                  Manager
                </strong>

              </div>


              <div>

                <span>
                  STATUS
                </span>

                <strong>
                  {profile?.status || "Active"}
                </strong>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            ACCESS CONTROL
        ================================================= */}

        <section className="manager-permissions-card">

          <div className="manager-permissions-heading">

            <div>

              <span>
                ACCESS CONTROL
              </span>

              <h2>
                Your Permissions
              </h2>

              <p>
                Features currently assigned to your manager account.
              </p>

            </div>


            <div className="permission-count">

              <strong>
                {permissions.length}
              </strong>

              <span>
                permissions
              </span>

            </div>

          </div>


          {permissions.length === 0 ? (

            <div className="no-permissions">

              <div className="lock-icon">
                🔒
              </div>

              <h3>
                No permissions assigned
              </h3>

              <p>
                Please contact the PHOENIX administrator
                to receive access to manager features.
              </p>

            </div>

          ) : (

            <div className="permission-tags">

              {permissions.map((permission) => (

                <div
                  className="permission-tag"
                  key={permission}
                >

                  <span>
                    ✓
                  </span>

                  {permission.replaceAll("_", " ")}

                </div>

              ))}

            </div>

          )}

        </section>

      </div>
    </DashboardLayout>
  );
}

export default ManagerDashboard;