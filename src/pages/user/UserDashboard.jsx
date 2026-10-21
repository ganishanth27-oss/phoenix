import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    requirements: "",
    service_id: "",
    priority: "medium",
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        navigate("/login");
        return;
      }

      if (profileData.status !== "active") {
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      setProfile(profileData);

      // Load active services
      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name, description")
        .eq("status", "active")
        .order("name");

      setServices(serviceData || []);

      // Load customer requests with service details
      const { data: requestData, error: requestError } = await supabase
        .from("user_requests")
        .select(`
          *,
          services (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (requestError) {
        console.error("Request loading error:", requestError);
      }

      setRequests(requestData || []);

      // Load projects user is linked to
      const { data: projectUsers, error: projectUsersError } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", user.id);

      if (projectUsersError) {
        console.error(projectUsersError);
        setProjects([]);
        return;
      }

      const projectIds = (projectUsers || []).map((item) => item.project_id);

      if (projectIds.length > 0) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(`
            *,
            services (
              name
            )
          `)
          .in("id", projectIds)
          .order("created_at", { ascending: false });

        if (projectError) {
          console.error(projectError);
        }

        setProjects(projectData || []);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Handle request submission
  async function handleSubmitRequest(event) {
    event.preventDefault();

    if (!requestForm.title.trim()) {
      alert("Please enter a request title.");
      return;
    }

    if (!requestForm.description.trim()) {
      alert("Please describe what you need.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Your session has expired. Please login again.");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_requests")
        .insert([
          {
            user_id: user.id,
            title: requestForm.title.trim(),
            description: requestForm.description.trim(),
            requirements: requestForm.requirements.trim() || null,
            service_id: requestForm.service_id || null,
            priority: requestForm.priority,
            status: "submitted",
          },
        ])
        .select(`
          *,
          services (
            name
          )
        `)
        .single();

      if (error) {
        console.error("Submit request error:", error);
        alert(error.message);
        return;
      }

      setRequests((previous) => [data, ...previous]);

      setRequestForm({
        title: "",
        description: "",
        requirements: "",
        service_id: "",
        priority: "medium",
      });

      setShowRequestModal(false);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while submitting the request.");
    } finally {
      setSubmitting(false);
    }
  }

  // Helpers
  const activeRequests = requests.filter(
    (request) => !["completed", "rejected"].includes(request.status)
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "completed"
  ).length;

  const activeProjects = projects.filter(
    (project) => !["completed", "on_hold"].includes(project.status)
  ).length;

  function getStatusBadge(status) {
    switch (status) {
      case "completed":
        return <span className="phoenix-badge phoenix-badge-success"><span className="phoenix-badge-dot" /> Completed</span>;
      case "in_progress":
        return <span className="phoenix-badge phoenix-badge-info"><span className="phoenix-badge-dot" /> In Progress</span>;
      case "assigned":
        return <span className="phoenix-badge phoenix-badge-warning"><span className="phoenix-badge-dot" /> Assigned</span>;
      case "rejected":
        return <span className="phoenix-badge phoenix-badge-danger"><span className="phoenix-badge-dot" /> Rejected</span>;
      case "submitted":
      default:
        return <span className="phoenix-badge phoenix-badge-primary"><span className="phoenix-badge-dot" /> Submitted</span>;
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

  const navigation = [
    {
      label: "Workspace Overview",
      path: "/user",
      icon: "⌂",
    },
  ];

  if (loading) {
    return (
      <div className="user-dashboard-loading">
        <div className="user-loading-spinner" />
        <p>Loading your client workspace...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={profile}
      navigation={navigation}
      title="Client Workspace"
    >
      <div className="user-dashboard-page">
        {/* =====================================================
            TOP WELCOME HERO
        ===================================================== */}
        <section className="user-welcome-banner">
          <div className="welcome-banner-text">
            <div className="banner-eyebrow">
              <span className="dot" />
              <span>PHOENIX CLIENT PORTAL</span>
            </div>
            <h1>
              Welcome back, {profile?.name?.split(" ")[0] || "Client"}
            </h1>
            <p>
              Track your service deliverables, submit new technical requests, and inspect real-time progress.
            </p>
          </div>

          <div className="welcome-banner-actions">
            <button
              className="banner-primary-btn"
              onClick={() => setShowRequestModal(true)}
            >
              <span>+</span>
              <span>New Request</span>
            </button>
            <button
              className="banner-refresh-btn"
              onClick={loadDashboard}
              title="Refresh workspace data"
            >
              ↻ Refresh
            </button>
          </div>
        </section>

        {/* =====================================================
            KEY METRICS
        ===================================================== */}
        <section className="user-metrics-grid">
          <div className="user-metric-card">
            <div className="metric-header">
              <span className="metric-title">TOTAL REQUESTS</span>
              <span className="metric-icon blue">📋</span>
            </div>
            <strong className="metric-number">{requests.length}</strong>
            <span className="metric-note">Lifetime service submissions</span>
          </div>

          <div className="user-metric-card">
            <div className="metric-header">
              <span className="metric-title">ACTIVE REQUESTS</span>
              <span className="metric-icon amber">⏳</span>
            </div>
            <strong className="metric-number">{activeRequests}</strong>
            <span className="metric-note">Under scoping or in progress</span>
          </div>

          <div className="user-metric-card">
            <div className="metric-header">
              <span className="metric-title">COMPLETED DELIVERIES</span>
              <span className="metric-icon green">✓</span>
            </div>
            <strong className="metric-number">{completedRequests}</strong>
            <span className="metric-note">Verified & handed over</span>
          </div>

          <div className="user-metric-card">
            <div className="metric-header">
              <span className="metric-title">ASSIGNED PROJECTS</span>
              <span className="metric-icon indigo">📁</span>
            </div>
            <strong className="metric-number">{projects.length}</strong>
            <span className="metric-note">{activeProjects} actively managed</span>
          </div>
        </section>

        {/* =====================================================
            MAIN DUAL COLUMN WORKSPACE
        ===================================================== */}
        <div className="user-columns-grid">
          {/* LEFT: REQUESTS TRACKING */}
          <section className="user-card-panel">
            <div className="panel-header">
              <div>
                <h2>Service Requests</h2>
                <p>Track statuses, specifications, and manager assignments</p>
              </div>
              <button
                className="panel-link-btn"
                onClick={() => setShowRequestModal(true)}
              >
                + Submit Request
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="phoenix-empty">
                <div className="phoenix-empty-icon">📝</div>
                <h3 className="phoenix-empty-title">No Service Requests Yet</h3>
                <p className="phoenix-empty-desc">
                  Need web development, mobile apps, video editing, UI/UX design, or 3D blueprints? Submit your first request to get started.
                </p>
                <button
                  className="phoenix-btn phoenix-btn-primary"
                  onClick={() => setShowRequestModal(true)}
                >
                  Create Your First Request
                </button>
              </div>
            ) : (
              <div className="user-request-list">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="user-request-item"
                    onClick={() => setSelectedRequestDetails(req)}
                  >
                    <div className="req-item-main">
                      <div className="req-header-line">
                        <strong className="req-item-title">{req.title}</strong>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="req-item-desc">
                        {req.description}
                      </p>
                      <div className="req-item-meta">
                        <span className="meta-tag">
                          🏷️ {req.services?.name || "General Service"}
                        </span>
                        <span className="meta-sep">•</span>
                        <span className="meta-priority">
                          Priority: <strong>{req.priority || "Medium"}</strong>
                        </span>
                        <span className="meta-sep">•</span>
                        <span className="meta-date">
                          Submitted {formatDate(req.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="req-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequestDetails(req);
                      }}
                      title="View details"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT: ACTIVE PROJECTS & ACCOUNT INFO */}
          <div className="user-side-column">
            {/* Projects Panel */}
            <section className="user-card-panel">
              <div className="panel-header">
                <div>
                  <h2>Active Projects</h2>
                  <p>Projects linked to your account</p>
                </div>
                <span className="phoenix-badge phoenix-badge-neutral">
                  {projects.length} Total
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="empty-sub-panel">
                  <span className="empty-icon-sm">📁</span>
                  <p>No active project contracts linked yet.</p>
                  <span>Once a request is approved, your project dashboard will appear here.</span>
                </div>
              ) : (
                <div className="user-project-list">
                  {projects.map((proj) => (
                    <div key={proj.id} className="user-project-item">
                      <div className="proj-top-line">
                        <strong>{proj.name}</strong>
                        {getStatusBadge(proj.status)}
                      </div>
                      <p className="proj-desc">
                        {proj.description || "Active production project."}
                      </p>
                      <div className="proj-dates">
                        <span>Due: {formatDate(proj.due_date)}</span>
                        <span>Service: {proj.services?.name || "Standard"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Consultation & Support Card */}
            <section className="user-quick-contact-card">
              <div className="quick-contact-icon">💬</div>
              <h3>Need Custom Scoping?</h3>
              <p>
                Looking for architecture blueprints, custom cloud infrastructures, or multi-platform apps? Our project managers are available.
              </p>
              <button
                className="phoenix-btn phoenix-btn-secondary"
                onClick={() => setShowRequestModal(true)}
              >
                Inquire via Request Form
              </button>
            </section>
          </div>
        </div>

        {/* =====================================================
            REQUEST DETAILS MODAL
        ===================================================== */}
        {selectedRequestDetails && (
          <div
            className="phoenix-modal-overlay"
            onClick={() => setSelectedRequestDetails(null)}
          >
            <div
              className="phoenix-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">REQUEST DETAILS</span>
                  <h2>{selectedRequestDetails.title}</h2>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedRequestDetails(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-status-bar">
                  <div>
                    <span className="detail-label">Current Status:</span>
                    {getStatusBadge(selectedRequestDetails.status)}
                  </div>
                  <div>
                    <span className="detail-label">Priority:</span>
                    <strong style={{ textTransform: "capitalize" }}>
                      {selectedRequestDetails.priority || "Medium"}
                    </strong>
                  </div>
                  <div>
                    <span className="detail-label">Submitted On:</span>
                    <span>{formatDate(selectedRequestDetails.created_at)}</span>
                  </div>
                </div>

                <div className="detail-block">
                  <label>Service Category</label>
                  <p>{selectedRequestDetails.services?.name || "General Service"}</p>
                </div>

                <div className="detail-block">
                  <label>Description</label>
                  <p>{selectedRequestDetails.description}</p>
                </div>

                {selectedRequestDetails.requirements && (
                  <div className="detail-block">
                    <label>Additional Specifications & Requirements</label>
                    <p>{selectedRequestDetails.requirements}</p>
                  </div>
                )}

                {selectedRequestDetails.admin_notes && (
                  <div className="detail-block admin-notes">
                    <label>Manager / Admin Notes</label>
                    <p>{selectedRequestDetails.admin_notes}</p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="phoenix-btn phoenix-btn-secondary"
                  onClick={() => setSelectedRequestDetails(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            SUBMIT NEW REQUEST MODAL
        ===================================================== */}
        {showRequestModal && (
          <div
            className="phoenix-modal-overlay"
            onClick={() => setShowRequestModal(false)}
          >
            <div
              className="phoenix-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">NEW SERVICE REQUEST</span>
                  <h2>Submit Project Scope</h2>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowRequestModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="modal-form">
                <div className="modal-body">
                  <div className="form-group">
                    <label className="phoenix-label">
                      Request Title <span>*</span>
                    </label>
                    <input
                      type="text"
                      className="phoenix-input"
                      placeholder="e.g. Corporate Web Application & Dashboard"
                      value={requestForm.title}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="phoenix-label">Target Service</label>
                      <select
                        className="phoenix-select"
                        value={requestForm.service_id}
                        onChange={(e) =>
                          setRequestForm({
                            ...requestForm,
                            service_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Company Service</option>
                        {services.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="phoenix-label">Priority Level</label>
                      <select
                        className="phoenix-select"
                        value={requestForm.priority}
                        onChange={(e) =>
                          setRequestForm({
                            ...requestForm,
                            priority: e.target.value,
                          })
                        }
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="phoenix-label">
                      What do you need built? <span>*</span>
                    </label>
                    <textarea
                      className="phoenix-textarea"
                      placeholder="Provide comprehensive details about your objectives, timeline, deliverables, or brand specifications..."
                      value={requestForm.description}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          description: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="phoenix-label">
                      Additional Requirements & References (Optional)
                    </label>
                    <textarea
                      className="phoenix-textarea"
                      rows={2}
                      placeholder="Links to design mockups, repositories, cloud requirements, or architectural guidelines..."
                      value={requestForm.requirements}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          requirements: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="phoenix-btn phoenix-btn-secondary"
                    onClick={() => setShowRequestModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="phoenix-btn phoenix-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting Request..." : "Submit to Manager"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default UserDashboard;