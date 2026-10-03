import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerRequests.css";

function ManagerRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      /* ================================
         MANAGER PROFILE
      ================================= */

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, email, phone, role, status")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      setManager(profile);

      /* ================================
         ASSIGNED REQUESTS
      ================================= */

      const { data, error } = await supabase
        .from("user_requests")
        .select(`
          id,
          title,
          description,
          requirements,
          priority,
          status,
          due_date,
          admin_notes,
          manager_notes,
          created_at,
          updated_at,

          profiles:user_id (
            id,
            name,
            email,
            phone
          ),

          services:service_id (
            id,
            name
          ),

          managers:manager_id (
            id,
            name,
            email
          )
        `)
        .eq("manager_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setRequests(data || []);
    } catch (error) {
      console.error("Manager requests error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  /* ================================
     UPDATE REQUEST
  ================================= */

  const updateRequest = async (request, changes) => {
    setSavingId(request.id);

    try {
      const updateData = {
        ...changes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_requests")
        .update(updateData)
        .eq("id", request.id)
        .eq("manager_id", manager.id);

      if (error) {
        throw error;
      }

      /* ================================
         ACTIVITY LOG
      ================================= */

      await supabase.from("activity_logs").insert({
        user_id: manager.id,
        action: "manager_updated_request",
        description: `Manager updated request "${request.title}"`,
      });

      await loadRequests();
    } catch (error) {
      console.error("Update request error:", error);
      alert(error.message);
    } finally {
      setSavingId(null);
    }
  };

  /* ================================
     STATUS LABEL
  ================================= */

  const getStatusLabel = (status) => {
    if (!status) return "Unknown";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /* ================================
     DATE FORMAT
  ================================= */

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString();
  };

  /* ================================
     PRIORITY CLASS
  ================================= */

  const getPriorityClass = (priority) => {
    return `manager-request-priority priority-${priority}`;
  };

  /* ================================
     LOADING
  ================================= */

  if (loading) {
    return (
      <div className="manager-requests-loading">
        Loading assigned requests...
      </div>
    );
  }

  return (
    <div className="manager-requests-page">

      {/* ================================
          HEADER
      ================================= */}

      <header className="manager-requests-header">

        <div>
          <span className="manager-requests-label">
            PHOENIX MANAGER
          </span>

          <h1>
            Assigned Requests
          </h1>

          <p>
            Review customer requests assigned
            to your account and manage their
            progress.
          </p>
        </div>

        <div className="manager-request-header-actions">

          <button
            className="manager-back-button"
            onClick={() =>
              navigate("/manager")
            }
          >
            ← Dashboard
          </button>

          <button
            className="manager-refresh-button"
            onClick={loadRequests}
          >
            ↻ Refresh
          </button>

        </div>

      </header>


      {/* ================================
          SUMMARY
      ================================= */}

      <section className="manager-request-summary">

        <div className="manager-request-summary-card">
          <span>Total</span>

          <strong>
            {requests.length}
          </strong>
        </div>

        <div className="manager-request-summary-card">
          <span>Assigned</span>

          <strong>
            {
              requests.filter(
                (request) =>
                  request.status === "assigned"
              ).length
            }
          </strong>
        </div>

        <div className="manager-request-summary-card">
          <span>In Progress</span>

          <strong>
            {
              requests.filter(
                (request) =>
                  request.status === "in_progress"
              ).length
            }
          </strong>
        </div>

        <div className="manager-request-summary-card">
          <span>Completed</span>

          <strong>
            {
              requests.filter(
                (request) =>
                  request.status === "completed"
              ).length
            }
          </strong>
        </div>

      </section>


      {/* ================================
          REQUEST LIST
      ================================= */}

      <section className="manager-request-list-container">

        {requests.length === 0 ? (

          <div className="manager-request-empty">

            <div className="manager-request-empty-icon">
              ✓
            </div>

            <h2>
              No Requests Assigned
            </h2>

            <p>
              New customer requests assigned
              to you by the administrator will
              appear here.
            </p>

            <button
              onClick={() =>
                navigate("/manager")
              }
            >
              Back to Dashboard
            </button>

          </div>

        ) : (

          <div className="manager-request-list">

            {requests.map((request) => (

              <article
                className="manager-request-card"
                key={request.id}
              >

                {/* ================================
                    REQUEST HEADER
                ================================= */}

                <div className="manager-request-card-header">

                  <div>

                    <div className="manager-request-title-row">

                      <h2>
                        {request.title}
                      </h2>

                      <span
                        className={getPriorityClass(
                          request.priority
                        )}
                      >
                        {request.priority}
                      </span>

                      <span
                        className={`manager-request-status status-${request.status}`}
                      >
                        {getStatusLabel(
                          request.status
                        )}
                      </span>

                    </div>

                    <p className="manager-request-created">
                      Submitted on{" "}
                      {formatDate(
                        request.created_at
                      )}
                    </p>

                  </div>

                </div>


                {/* ================================
                    CUSTOMER DETAILS
                ================================= */}

                <div className="manager-request-section">

                  <h3>
                    👤 Customer Details
                  </h3>

                  <div className="manager-request-info-grid">

                    <div>
                      <span>Name</span>

                      <strong>
                        {request.profiles?.name ||
                          "Unknown"}
                      </strong>
                    </div>

                    <div>
                      <span>Email</span>

                      <strong>
                        {request.profiles?.email ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>Phone</span>

                      <strong>
                        {request.profiles?.phone ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>Service</span>

                      <strong>
                        {request.services?.name ||
                          "Not selected"}
                      </strong>
                    </div>

                  </div>

                </div>


                {/* ================================
                    REQUEST DETAILS
                ================================= */}

                <div className="manager-request-section">

                  <h3>
                    📋 Request Details
                  </h3>

                  <div className="manager-request-description">

                    <span>
                      Description
                    </span>

                    <p>
                      {request.description}
                    </p>

                  </div>

                  {request.requirements && (

                    <div className="manager-request-description">

                      <span>
                        Additional Requirements
                      </span>

                      <p>
                        {request.requirements}
                      </p>

                    </div>

                  )}

                </div>


                {/* ================================
                    ADMIN INFORMATION
                ================================= */}

                {request.admin_notes && (

                  <div className="manager-admin-note">

                    <div className="manager-note-icon">
                      🛡️
                    </div>

                    <div>

                      <span>
                        Admin Notes
                      </span>

                      <p>
                        {request.admin_notes}
                      </p>

                    </div>

                  </div>

                )}


                {/* ================================
                    MANAGEMENT
                ================================= */}

                <div className="manager-request-management">

                  <div>

                    <label>
                      Request Status
                    </label>

                    <select
                      value={request.status}
                      disabled={
                        savingId === request.id
                      }
                      onChange={(event) =>
                        updateRequest(
                          request,
                          {
                            status:
                              event.target.value,
                          }
                        )
                      }
                    >

                      <option value="submitted">
                        Submitted
                      </option>

                      <option value="under_review">
                        Under Review
                      </option>

                      <option value="assigned">
                        Assigned
                      </option>

                      <option value="in_progress">
                        In Progress
                      </option>

                      <option value="waiting_for_user">
                        Waiting for User
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="rejected">
                        Rejected
                      </option>

                    </select>

                  </div>


                  <div>

                    <label>
                      Due Date
                    </label>

                    <div className="manager-due-date">

                      {request.due_date
                        ? formatDate(
                            request.due_date
                          )
                        : "Not specified"}

                    </div>

                  </div>

                </div>


                {/* ================================
                    MANAGER NOTES
                ================================= */}

                <div className="manager-notes-section">

                  <label>
                    Manager Notes
                  </label>

                  <textarea
                    defaultValue={
                      request.manager_notes || ""
                    }
                    rows="4"
                    placeholder="Add progress updates, questions, or notes for the customer..."
                    disabled={
                      savingId === request.id
                    }
                    onBlur={(event) => {

                      const newNotes =
                        event.target.value;

                      if (
                        newNotes !==
                        (request.manager_notes || "")
                      ) {
                        updateRequest(
                          request,
                          {
                            manager_notes:
                              newNotes,
                          }
                        );
                      }

                    }}
                  />

                  <small>
                    Changes are saved automatically
                    when you leave the notes field.
                  </small>

                </div>


                {/* ================================
                    SAVING
                ================================= */}

                {savingId === request.id && (

                  <div className="manager-request-saving">
                    Saving changes...
                  </div>

                )}

              </article>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}

export default ManagerRequests;