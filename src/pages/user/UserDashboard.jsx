import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import phoenixLogo from "../../assets/phoenix-logo.png";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
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
        navigate("/");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        navigate("/");
        return;
      }

      if (profileData.status !== "active") {
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setProfile(profileData);

      // =========================
      // LOAD SERVICES
      // =========================

      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      setServices(serviceData || []);

      // =========================
      // LOAD USER REQUESTS
      // =========================

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

      // =========================
      // LOAD USER PROJECTS
      // =========================

      const { data: projectUsers, error: projectUsersError } =
        await supabase
          .from("project_users")
          .select("project_id")
          .eq("user_id", user.id);

      if (projectUsersError) {
        console.error(projectUsersError);
        setProjects([]);
        return;
      }

      const projectIds = (projectUsers || []).map(
        (item) => item.project_id
      );

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

  // =========================
  // SUBMIT REQUEST
  // =========================

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
        navigate("/");
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

      alert("Request submitted successfully!");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while submitting the request.");
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // HELPERS
  // =========================

  const activeRequests = requests.filter(
    (request) =>
      !["completed", "rejected"].includes(request.status)
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "completed"
  ).length;

  const activeProjects = projects.filter(
    (project) =>
      !["completed", "on_hold"].includes(project.status)
  ).length;

  function getStatusClass(status) {
    return status?.replaceAll("_", "-") || "default";
  }

  function formatStatus(status) {
    return status
      ? status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        )
      : "Unknown";
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const navigation = [
    {
      label: "Dashboard",
      path: "/user",
      icon: "⌂",
    },
  ];

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="user-loading">
        <div className="user-loader"></div>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={profile}
      navigation={navigation}
      title="My Workspace"
    >
      <div className="user-dashboard">

        {/* =========================
            CENTER PHOENIX LOGO
        ========================= */}

        <div className="user-dashboard-center-logo">
          <img
            src={phoenixLogo}
            alt="PHOENIX"
          />
        </div>

        {/* =========================
            HERO
        ========================= */}

        <section className="user-hero">
          <div className="hero-content">
            <div className="hero-small">
              PHOENIX WORKSPACE
            </div>

            <h1>
              Welcome back,{" "}
              <span>
                {profile?.name?.split(" ")[0] || "there"}!
              </span>
            </h1>

            <p>
              Manage your requests, track projects and stay updated
              with your work — all in one place.
            </p>

            <button
              className="primary-action"
              onClick={() => setShowRequestModal(true)}
            >
              <span>＋</span>
              Submit a Request
            </button>
          </div>

          <div className="hero-orb">
            <div className="orb-inner">P</div>
          </div>
        </section>

        {/* =========================
            STATS
        ========================= */}

        <section className="user-stats">

          <div className="user-stat-card">
            <div className="stat-icon purple">◫</div>

            <div>
              <span>My Requests</span>
              <strong>{requests.length}</strong>
            </div>
          </div>

          <div className="user-stat-card">
            <div className="stat-icon blue">↗</div>

            <div>
              <span>Active Requests</span>
              <strong>{activeRequests}</strong>
            </div>
          </div>

          <div className="user-stat-card">
            <div className="stat-icon green">✓</div>

            <div>
              <span>Completed</span>
              <strong>{completedRequests}</strong>
            </div>
          </div>

          <div className="user-stat-card">
            <div className="stat-icon orange">▦</div>

            <div>
              <span>Active Projects</span>
              <strong>{activeProjects}</strong>
            </div>
          </div>

        </section>

        {/* =========================
            MAIN GRID
        ========================= */}

        <section className="user-main-grid">

          {/* REQUESTS */}

          <div className="user-panel requests-panel">

            <div className="panel-heading">
              <div>
                <span className="panel-label">
                  ACTIVITY
                </span>

                <h2>Recent Requests</h2>
              </div>

              <span className="count-badge">
                {requests.length}
              </span>
            </div>

            {requests.length === 0 ? (
              <div className="empty-state">

                <div className="empty-icon">
                  ＋
                </div>

                <h3>No requests yet</h3>

                <p>
                  Tell us what you need and our team will take
                  it from there.
                </p>

                <button
                  onClick={() => setShowRequestModal(true)}
                  className="outline-button"
                >
                  Create Request
                </button>

              </div>
            ) : (
              <div className="request-list">

                {requests.slice(0, 5).map((request) => (
                  <div
                    className="request-item"
                    key={request.id}
                  >

                    <div className="request-symbol">
                      {request.title
                        ?.charAt(0)
                        ?.toUpperCase() || "R"}
                    </div>

                    <div className="request-info">

                      <h3>
                        {request.title}
                      </h3>

                      <div className="request-meta">

                        <span>
                          {request.services?.name ||
                            "General Service"}
                        </span>

                        <span>•</span>

                        <span>
                          {formatDate(request.created_at)}
                        </span>

                      </div>

                    </div>

                    <span
                      className={`status-pill ${getStatusClass(
                        request.status
                      )}`}
                    >
                      {formatStatus(request.status)}
                    </span>

                  </div>
                ))}

              </div>
            )}

          </div>

          {/* PROJECTS */}

          <div className="user-panel projects-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-label">
                  WORKSPACE
                </span>

                <h2>My Projects</h2>
              </div>

              <span className="count-badge">
                {projects.length}
              </span>

            </div>

            {projects.length === 0 ? (
              <div className="empty-state compact">

                <div className="empty-icon">
                  ▦
                </div>

                <h3>No projects assigned</h3>

                <p>
                  Your assigned projects will appear here.
                </p>

              </div>
            ) : (
              <div className="project-list">

                {projects.slice(0, 4).map((project) => (
                  <div
                    className="project-item"
                    key={project.id}
                  >

                    <div className="project-top">

                      <div className="project-avatar">
                        {project.name
                          ?.charAt(0)
                          ?.toUpperCase() || "P"}
                      </div>

                      <span
                        className={`status-pill ${getStatusClass(
                          project.status
                        )}`}
                      >
                        {formatStatus(project.status)}
                      </span>

                    </div>

                    <h3>
                      {project.name}
                    </h3>

                    <p>
                      {project.description ||
                        project.services?.name ||
                        "Phoenix project"}
                    </p>

                    <div className="project-date">

                      <span>Due date</span>

                      <strong>
                        {formatDate(project.due_date)}
                      </strong>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </section>

        {/* =========================
            BOTTOM
        ========================= */}

        <section className="user-bottom-grid">

          <div className="info-card">

            <div className="info-card-icon">
              ✦
            </div>

            <div>
              <span>Need something new?</span>

              <h3>
                Start a new request
              </h3>

              <p>
                Describe what you need and our team will review it.
              </p>
            </div>

            <button
              onClick={() => setShowRequestModal(true)}
              className="arrow-button"
            >
              →
            </button>

          </div>

          <div className="profile-mini-card">

            <div className="mini-avatar">
              {profile?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "U"}
            </div>

            <div>
              <span>Your account</span>

              <h3>
                {profile?.name}
              </h3>

              <p>
                {profile?.email}
              </p>
            </div>

            <span className="active-dot">
              Active
            </span>

          </div>

        </section>

      </div>

      {/* =====================================================
          SUBMIT REQUEST MODAL
      ===================================================== */}

      {showRequestModal && (
        <div
          className="request-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowRequestModal(false);
            }
          }}
        >

          <div className="request-modal">

            <div className="request-modal-header">

              <div>
                <span>PHOENIX</span>

                <h2>
                  Submit a Request
                </h2>

                <p>
                  Tell our team what you need.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowRequestModal(false)}
              >
                ×
              </button>

            </div>

            <form
              className="request-form"
              onSubmit={handleSubmitRequest}
            >

              {/* Title */}

              <div className="form-group">

                <label>
                  Request Title
                  <span>*</span>
                </label>

                <input
                  type="text"
                  placeholder="Example: Create a company website"
                  value={requestForm.title}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      title: event.target.value,
                    })
                  }
                  required
                />

              </div>

              {/* Service + Priority */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Service
                  </label>

                  <select
                    value={requestForm.service_id}
                    onChange={(event) =>
                      setRequestForm({
                        ...requestForm,
                        service_id: event.target.value,
                      })
                    }
                  >

                    <option value="">
                      Select a service
                    </option>

                    {services.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.name}
                      </option>
                    ))}

                  </select>

                </div>

                <div className="form-group">

                  <label>
                    Priority
                  </label>

                  <select
                    value={requestForm.priority}
                    onChange={(event) =>
                      setRequestForm({
                        ...requestForm,
                        priority: event.target.value,
                      })
                    }
                  >

                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>

                    <option value="urgent">
                      Urgent
                    </option>

                  </select>

                </div>

              </div>

              {/* Description */}

              <div className="form-group">

                <label>
                  What do you need?
                  <span>*</span>
                </label>

                <textarea
                  rows="4"
                  placeholder="Describe your request in detail..."
                  value={requestForm.description}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      description: event.target.value,
                    })
                  }
                  required
                />

              </div>

              {/* Requirements */}

              <div className="form-group">

                <label>
                  Additional Requirements
                </label>

                <textarea
                  rows="3"
                  placeholder="Mention any specific features, references, deadline, etc."
                  value={requestForm.requirements}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      requirements: event.target.value,
                    })
                  }
                />

              </div>

              {/* Buttons */}

              <div className="request-form-actions">

                <button
                  type="button"
                  className="cancel-request"
                  onClick={() =>
                    setShowRequestModal(false)
                  }
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-request"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Request"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </DashboardLayout>
  );
}

export default UserDashboard;