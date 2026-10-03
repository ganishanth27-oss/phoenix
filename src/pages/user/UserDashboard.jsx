import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/phoenix-logo.png";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    service_id: "",
    description: "",
    requirements: "",
    priority: "medium",
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      // =========================
      // PROFILE
      // =========================

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, email, phone, role, status")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (
        profileData.role !== "user" ||
        profileData.status !== "active"
      ) {
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setProfile(profileData);

      // =========================
      // SERVICES + REQUESTS
      // =========================

      const [servicesResult, requestsResult] =
        await Promise.all([
          supabase
            .from("services")
            .select("id, name, description")
            .eq("status", "active")
            .order("name"),

          supabase
            .from("user_requests")
            .select(`
              id,
              title,
              description,
              requirements,
              priority,
              status,
              due_date,
              manager_id,
              manager_notes,
              admin_notes,
              created_at,
              updated_at,
              services:service_id (
                name
              ),
              managers:manager_id (
                name,
                email
              )
            `)
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (servicesResult.error) {
        throw servicesResult.error;
      }

      if (requestsResult.error) {
        throw requestsResult.error;
      }

      setServices(servicesResult.data || []);
      setRequests(requestsResult.data || []);
    } catch (error) {
      console.error("User dashboard error:", error);

      alert(
        error.message || "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FORM
  // =========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // SUBMIT REQUEST
  // =========================

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a request title.");
      return;
    }

    if (!form.service_id) {
      alert("Please select a service.");
      return;
    }

    if (!form.description.trim()) {
      alert("Please describe what you need.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("user_requests")
        .insert({
          user_id: user.id,
          service_id: form.service_id,
          title: form.title.trim(),
          description: form.description.trim(),
          requirements:
            form.requirements.trim() || null,
          priority: form.priority,
          status: "submitted",
        });

      if (error) {
        throw error;
      }

      alert(
        "Request submitted successfully. Admin will review it shortly."
      );

      setForm({
        title: "",
        service_id: "",
        description: "",
        requirements: "",
        priority: "medium",
      });

      setShowRequestForm(false);

      await loadDashboard();
    } catch (error) {
      console.error(
        "Request submission error:",
        error
      );

      alert(
        error.message || "Unable to submit request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // =========================
  // STATUS
  // =========================

  const getStatusLabel = (status) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getStatusClass = (status) => {
    return `request-status status-${status}`;
  };

  // =========================
  // STATS
  // =========================

  const totalRequests = requests.length;

  const underReview = requests.filter(
    (request) =>
      request.status === "submitted" ||
      request.status === "under_review"
  ).length;

  const inProgress = requests.filter(
    (request) =>
      request.status === "assigned" ||
      request.status === "in_progress" ||
      request.status === "waiting_for_user"
  ).length;

  const completed = requests.filter(
    (request) => request.status === "completed"
  ).length;

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="user-loading">
        <div className="user-loading-card">
          <div className="user-loading-logo">
            <img src={logo} alt="PHOENIX" />
          </div>

          <h2>Loading PHOENIX...</h2>

          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="user-sidebar">

        <div className="user-brand">
          <div className="user-brand-logo">
            <img src={logo} alt="PHOENIX" />
          </div>

          <div>
            <h2>PHOENIX</h2>
            <span>User Workspace</span>
          </div>
        </div>

        <div className="user-sidebar-label">
          WORKSPACE
        </div>

        <nav className="user-nav">

          <button
            className="user-nav-item active"
            onClick={() => navigate("/user")}
          >
            <span>⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className="user-nav-item"
            onClick={() => setShowRequestForm(true)}
          >
            <span>＋</span>
            <span>New Request</span>
          </button>

          <button
            className="user-nav-item"
            onClick={() =>
              document
                .getElementById("my-requests")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            <span>▣</span>
            <span>My Requests</span>
          </button>

          <button
            className="user-nav-item"
            onClick={() =>
              alert(
                "My Projects module will be connected next."
              )
            }
          >
            <span>▤</span>
            <span>My Projects</span>
          </button>

          <button
            className="user-nav-item"
            onClick={() =>
              alert(
                "My Tasks module will be connected next."
              )
            }
          >
            <span>✓</span>
            <span>My Tasks</span>
          </button>

          <button
            className="user-nav-item"
            onClick={() =>
              alert(
                "Files module will be connected next."
              )
            }
          >
            <span>□</span>
            <span>Files</span>
          </button>

        </nav>

        <div className="user-sidebar-label user-account-label">
          ACCOUNT
        </div>

        <div className="user-sidebar-bottom">

          <div className="user-profile-mini">

            <div className="user-avatar">
              {profile?.name
                ?.charAt(0)
                .toUpperCase() || "U"}
            </div>

            <div>
              <strong>
                {profile?.name || "User"}
              </strong>

              <span>User Account</span>
            </div>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span>↪</span>
            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main className="user-main">

        {/* HEADER */}

        <header className="user-header">

          <div>
            <div className="user-breadcrumb">
              PHOENIX <span>/</span> User Dashboard
            </div>

            <p className="user-header-label">
              CUSTOMER WORKSPACE
            </p>

            <h1>
              Welcome back,{" "}
              {profile?.name?.split(" ")[0] ||
                "User"}{" "}
              👋
            </h1>

            <p>
              Submit requests and track your work
              with the PHOENIX team.
            </p>
          </div>

          <div className="user-header-right">

            <button
              className="user-refresh"
              onClick={loadDashboard}
              title="Refresh"
            >
              ↻
            </button>

            <div className="user-header-profile">

              <div className="user-header-avatar">
                {profile?.name
                  ?.charAt(0)
                  .toUpperCase() || "U"}
              </div>

              <div>
                <strong>
                  {profile?.name || "User"}
                </strong>

                <span>User</span>
              </div>

            </div>

          </div>

        </header>

        {/* =========================
            STATS
        ========================= */}

        <section className="user-stats">

          <div className="user-stat-card">

            <div className="stat-icon purple">
              ▣
            </div>

            <div>
              <span>TOTAL REQUESTS</span>

              <strong>{totalRequests}</strong>

              <small>All submitted requests</small>
            </div>

          </div>

          <div className="user-stat-card">

            <div className="stat-icon orange">
              ◷
            </div>

            <div>
              <span>UNDER REVIEW</span>

              <strong>{underReview}</strong>

              <small>Waiting for review</small>
            </div>

          </div>

          <div className="user-stat-card">

            <div className="stat-icon blue">
              ⚙
            </div>

            <div>
              <span>IN PROGRESS</span>

              <strong>{inProgress}</strong>

              <small>Currently being handled</small>
            </div>

          </div>

          <div className="user-stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div>
              <span>COMPLETED</span>

              <strong>{completed}</strong>

              <small>Finished requests</small>
            </div>

          </div>

        </section>

        {/* =========================
            WELCOME BANNER
        ========================= */}

        <section className="user-welcome">

          <div className="user-welcome-content">

            <span className="user-welcome-label">
              PHOENIX USER WORKSPACE
            </span>

            <h2>
              Have something you need?
            </h2>

            <p>
              Tell us what you need, choose the
              service, and our team will review
              your request and keep you updated.
            </p>

            <button
              onClick={() =>
                setShowRequestForm(true)
              }
            >
              Create New Request
              <span>→</span>
            </button>

          </div>

          <div className="user-welcome-logo">
            <img src={logo} alt="PHOENIX" />
          </div>

        </section>

        {/* =========================
            REQUEST FORM
        ========================= */}

        {showRequestForm && (
          <section className="request-form-card">

            <div className="request-form-header">

              <div>
                <span className="section-label">
                  NEW REQUEST
                </span>

                <h2>What do you need?</h2>

                <p>
                  Give us enough information so
                  our team can understand your
                  request clearly.
                </p>
              </div>

              <button
                className="close-request-button"
                type="button"
                onClick={() =>
                  setShowRequestForm(false)
                }
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmitRequest}>

              <div className="request-form-grid">

                <div className="request-field full">

                  <label>Request Title</label>

                  <input
                    type="text"
                    name="title"
                    placeholder="Example: Create a company website"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="request-field">

                  <label>Service</label>

                  <select
                    name="service_id"
                    value={form.service_id}
                    onChange={handleChange}
                    required
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

                <div className="request-field">

                  <label>Priority</label>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
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

                <div className="request-field full">

                  <label>
                    What do you need?
                  </label>

                  <textarea
                    name="description"
                    placeholder="Explain what you want us to create or do..."
                    value={form.description}
                    onChange={handleChange}
                    rows="5"
                    required
                  />

                </div>

                <div className="request-field full">

                  <label>
                    Additional Requirements
                  </label>

                  <textarea
                    name="requirements"
                    placeholder="Mention features, references, files, deadlines or other requirements..."
                    value={form.requirements}
                    onChange={handleChange}
                    rows="4"
                  />

                </div>

              </div>

              <div className="request-form-actions">

                <button
                  type="button"
                  className="cancel-request-button"
                  onClick={() =>
                    setShowRequestForm(false)
                  }
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-request-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Request"}
                </button>

              </div>

            </form>

          </section>
        )}

        {/* =========================
            MY REQUESTS
        ========================= */}

        <section
          className="requests-section"
          id="my-requests"
        >

          <div className="section-heading">

            <div>
              <span className="section-label">
                REQUEST ACTIVITY
              </span>

              <h2>My Requests</h2>

              <p>
                Track the progress of everything
                you have submitted.
              </p>
            </div>

            <button
              className="small-new-request"
              onClick={() =>
                setShowRequestForm(true)
              }
            >
              + New Request
            </button>

          </div>

          {requests.length === 0 ? (

            <div className="empty-requests">

              <div className="empty-request-icon">
                +
              </div>

              <h3>No requests yet</h3>

              <p>
                Start by telling the PHOENIX team
                what you need.
              </p>

              <button
                onClick={() =>
                  setShowRequestForm(true)
                }
              >
                Create Your First Request
              </button>

            </div>

          ) : (

            <div className="request-list">

              {requests.map((request) => (

                <div
                  className="request-card"
                  key={request.id}
                >

                  <div className="request-card-main">

                    <div className="request-card-icon">
                      {request.services?.name
                        ?.charAt(0)
                        .toUpperCase() || "P"}
                    </div>

                    <div>

                      <h3>
                        {request.title}
                      </h3>

                      <p className="request-service">
                        {request.services?.name ||
                          "Service not selected"}
                      </p>

                      <p className="request-description">
                        {request.description}
                      </p>

                      {request.manager_id && (
                        <p className="request-manager">
                          Manager:{" "}
                          <strong>
                            {request.managers?.name ||
                              "Assigned"}
                          </strong>
                        </p>
                      )}

                      {request.due_date && (
                        <p className="request-due-date">
                          Due:{" "}
                          {new Date(
                            request.due_date
                          ).toLocaleDateString()}
                        </p>
                      )}

                    </div>

                  </div>

                  <div className="request-card-right">

                    <span
                      className={`priority priority-${request.priority}`}
                    >
                      {request.priority}
                    </span>

                    <span
                      className={getStatusClass(
                        request.status
                      )}
                    >
                      {getStatusLabel(
                        request.status
                      )}
                    </span>

                    <span className="request-date">
                      {new Date(
                        request.created_at
                      ).toLocaleDateString()}
                    </span>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>
    </div>
  );
}

export default UserDashboard;