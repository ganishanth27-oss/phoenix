import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./ManagerDashboard.css";

function ManagerDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingRequests: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
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
        navigate("/login");
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
        navigate("/login");
        return;
      }

      setProfile(profileData);

      // Permissions check
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

      // Load Real DB Manager Metrics
      const [projectsRes, requestsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, status, priority, due_date, created_at, services:service_id(name)")
          .eq("manager_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_requests")
          .select("id, status")
          .eq("manager_id", user.id),
      ]);

      const projList = projectsRes.data || [];
      const reqList = requestsRes.data || [];

      setMetrics({
        totalProjects: projList.length,
        activeProjects: projList.filter((p) => !["completed", "on_hold"].includes(p.status)).length,
        completedProjects: projList.filter((p) => p.status === "completed").length,
        pendingRequests: reqList.filter((r) => r.status === "assigned" || r.status === "submitted").length,
      });

      setRecentProjects(projList.slice(0, 5));
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
      alert("You do not have permission to create projects. Contact your administrator.");
      return;
    }
    navigate("/manager/projects");
  };

  const navigation = [
    {
      label: "WORKSPACE",
      items: [
        {
          label: "Dashboard",
          path: "/manager",
          icon: "⌂",
        },
        ...(hasPermission("view_requests")
          ? [
              {
                label: "Requests",
                path: "/manager/requests",
                icon: "▣",
              },
            ]
          : []),
        ...(hasPermission("view_users")
          ? [
              {
                label: "Users",
                path: "/manager/users",
                icon: "♙",
              },
            ]
          : []),
        ...(hasPermission("view_projects")
          ? [
              {
                label: "Projects",
                path: "/manager/projects",
                icon: "◈",
              },
              {
                label: "Submit Project",
                path: "/manager/submit-project",
                icon: "📤",
              },
            ]
          : [
              {
                label: "Submit Project",
                path: "/manager/submit-project",
                icon: "📤",
              },
            ]),
        ...(hasPermission("view_tasks")
          ? [
              {
                label: "Tasks",
                path: "/manager/tasks",
                icon: "✓",
              },
            ]
          : []),
        ...(hasPermission("upload_files")
          ? [
              {
                label: "Files",
                path: "/manager/files",
                icon: "▤",
              },
            ]
          : []),
        ...(hasPermission("review_work")
          ? [
              {
                label: "Review Work",
                path: "/manager/review",
                icon: "◉",
              },
            ]
          : []),
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

  function getStatusBadge(status) {
    switch (status) {
      case "completed":
        return <span className="phoenix-badge phoenix-badge-success"><span className="phoenix-badge-dot" /> Completed</span>;
      case "in_progress":
        return <span className="phoenix-badge phoenix-badge-info"><span className="phoenix-badge-dot" /> In Progress</span>;
      case "in_review":
        return <span className="phoenix-badge phoenix-badge-warning"><span className="phoenix-badge-dot" /> In Review</span>;
      case "not_started":
      default:
        return <span className="phoenix-badge phoenix-badge-neutral"><span className="phoenix-badge-dot" /> Not Started</span>;
    }
  }

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="manager-dashboard-loading">
        <div className="manager-loading-spinner" />
        <p>Loading Manager Operations Workspace...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={profile}
      navigation={navigation}
      title="Manager Operations"
    >
      <div className="manager-dashboard-page">
        {/* =====================================================
            TOP MANAGER BANNER
        ===================================================== */}
        <section className="manager-welcome-banner">
          <div className="banner-content">
            <span className="banner-pill">
              <span className="dot" />
              <span>PROJECT DELIVERY WORKSPACE</span>
            </span>
            <h1>
              Welcome back, {profile?.name || "Manager"}
            </h1>
            <p>
              Coordinate production deliverables, manage assigned customer requests, and track sprint deadlines.
            </p>
          </div>

          <div className="banner-actions">
            {hasPermission("create_projects") && (
              <button
                className="manager-btn-primary"
                onClick={handleCreateProject}
              >
                <span>+</span>
                <span>Create Project</span>
              </button>
            )}
            <button
              className="manager-btn-ghost"
              onClick={loadManagerData}
              title="Refresh workspace records"
            >
              ↻ Refresh
            </button>
          </div>
        </section>

        {/* =====================================================
            REAL PRODUCTION METRICS CARDS
        ===================================================== */}
        <section className="manager-metrics-grid">
          <div className="manager-metric-card">
            <div className="metric-header">
              <span className="metric-title">ASSIGNED PROJECTS</span>
              <span className="metric-icon purple">◈</span>
            </div>
            <strong className="metric-number">{metrics.totalProjects}</strong>
            <span className="metric-sub">Total managed contracts</span>
          </div>

          <div className="manager-metric-card">
            <div className="metric-header">
              <span className="metric-title">ACTIVE IN PRODUCTION</span>
              <span className="metric-icon blue">⚡</span>
            </div>
            <strong className="metric-number">{metrics.activeProjects}</strong>
            <span className="metric-sub">Sprints currently running</span>
          </div>

          <div className="manager-metric-card">
            <div className="metric-header">
              <span className="metric-title">COMPLETED DELIVERIES</span>
              <span className="metric-icon green">✓</span>
            </div>
            <strong className="metric-number">{metrics.completedProjects}</strong>
            <span className="metric-sub">Verified & finalized projects</span>
          </div>

          <div className="manager-metric-card">
            <div className="metric-header">
              <span className="metric-title">PENDING REQUESTS</span>
              <span className="metric-icon amber">⏳</span>
            </div>
            <strong className="metric-number">{metrics.pendingRequests}</strong>
            <span className="metric-sub">Customer submissions to scope</span>
          </div>
        </section>

        {/* =====================================================
            MAIN OPERATIONS GRID
        ===================================================== */}
        <div className="manager-layout-grid">
          {/* LEFT: MANAGED PROJECTS TABLE / RECENT LIST */}
          <section className="manager-panel">
            <div className="panel-top-row">
              <div>
                <h2>Managed Projects</h2>
                <p>Recent contracts assigned to your management supervision</p>
              </div>
              {hasPermission("view_projects") && (
                <button
                  className="panel-view-all-btn"
                  onClick={() => navigate("/manager/projects")}
                >
                  View All Projects →
                </button>
              )}
            </div>

            {recentProjects.length === 0 ? (
              <div className="phoenix-empty">
                <div className="phoenix-empty-icon">◈</div>
                <h3 className="phoenix-empty-title">No Projects Assigned Yet</h3>
                <p className="phoenix-empty-desc">
                  When the administrator assigns projects or when you initialize a new delivery, they will appear here.
                </p>
                {hasPermission("create_projects") && (
                  <button
                    className="phoenix-btn phoenix-btn-primary"
                    onClick={handleCreateProject}
                  >
                    + Create Your First Project
                  </button>
                )}
              </div>
            ) : (
              <div className="manager-project-table-wrap">
                <table className="manager-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Service Category</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProjects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                        </td>
                        <td>
                          <span className="service-tag">
                            {p.services?.name || "General"}
                          </span>
                        </td>
                        <td>{getStatusBadge(p.status)}</td>
                        <td>
                          <span className="priority-text" style={{ textTransform: "capitalize" }}>
                            {p.priority || "Medium"}
                          </span>
                        </td>
                        <td>{formatDate(p.due_date)}</td>
                        <td>
                          <button
                            className="table-action-link"
                            onClick={() => navigate("/manager/projects")}
                          >
                            Manage →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* RIGHT: QUICK ACCESS & PERMISSION GOVERNANCE */}
          <div className="manager-side-stack">
            {/* Quick Actions Panel */}
            <section className="manager-panel">
              <div className="panel-top-row">
                <div>
                  <h2>Quick Actions</h2>
                  <p>Common manager tasks</p>
                </div>
              </div>

              <div className="manager-quick-actions">
                {hasPermission("view_requests") && (
                  <button
                    className="quick-action-btn"
                    onClick={() => navigate("/manager/requests")}
                  >
                    <span className="icon">▣</span>
                    <div className="btn-text">
                      <strong>Client Requests</strong>
                      <span>Review submitted inquiries</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                )}

                {hasPermission("create_projects") && (
                  <button
                    className="quick-action-btn"
                    onClick={handleCreateProject}
                  >
                    <span className="icon">◈</span>
                    <div className="btn-text">
                      <strong>Create New Project</strong>
                      <span>Scope deliverable milestones</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                )}

                {hasPermission("view_tasks") && (
                  <button
                    className="quick-action-btn"
                    onClick={() => navigate("/manager/tasks")}
                  >
                    <span className="icon">✓</span>
                    <div className="btn-text">
                      <strong>Task Management</strong>
                      <span>Track sprint checklist items</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                )}

                {hasPermission("review_work") && (
                  <button
                    className="quick-action-btn"
                    onClick={() => navigate("/manager/review")}
                  >
                    <span className="icon">◉</span>
                    <div className="btn-text">
                      <strong>Review Work</strong>
                      <span>Inspect intermediate deliverables</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                )}
              </div>
            </section>

            {/* Permissions Governance Card */}
            <section className="manager-panel">
              <div className="panel-top-row">
                <div>
                  <h2>Governance & Role</h2>
                  <p>{permissions.length} active permissions enabled</p>
                </div>
                <span className="phoenix-badge phoenix-badge-success">
                  Active
                </span>
              </div>

              <div className="manager-permissions-tags">
                {permissions.map((perm) => (
                  <div key={perm} className="perm-chip">
                    <span className="perm-check">✓</span>
                    <span>{perm.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ManagerDashboard;