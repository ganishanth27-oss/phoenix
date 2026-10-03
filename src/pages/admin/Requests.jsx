import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Requests.css";

function Requests() {
  const [requests, setRequests] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadData = async () => {
    setLoading(true);

    try {
      const [requestsResult, managersResult] =
        await Promise.all([
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
              admin_notes,
              manager_id,
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
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("profiles")
            .select("id, name, email")
            .eq("role", "manager")
            .eq("status", "active")
            .order("name"),
        ]);

      if (requestsResult.error) {
        throw requestsResult.error;
      }

      if (managersResult.error) {
        throw managersResult.error;
      }

      setRequests(requestsResult.data || []);
      setManagers(managersResult.data || []);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateRequest = async (
    request,
    changes
  ) => {
    setSavingId(request.id);

    try {
      const updateData = {
        ...changes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_requests")
        .update(updateData)
        .eq("id", request.id);

      if (error) {
        throw error;
      }

      // Create activity log
      const changedFields = Object.keys(changes).join(", ");

      await supabase.from("activity_logs").insert({
        user_id: request.profiles?.id || null,
        action: "admin_updated_request",
        description: `Request "${request.title}" updated: ${changedFields}`,
      });

      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSavingId(null);
    }
  };

  const getStatusLabel = (status) => {
    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not specified";
    }

    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="admin-requests-page">
      <div className="requests-page-header">
        <div>
          <span className="requests-label">
            PHOENIX ADMIN
          </span>

          <h1>User Requests</h1>

          <p>
            Review requests submitted by PHOENIX users
            and assign them to managers.
          </p>
        </div>

        <button
          className="refresh-requests-button"
          onClick={loadData}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="request-summary">
        <div className="summary-card">
          <span>Total Requests</span>

          <strong>
            {requests.length}
          </strong>
        </div>

        <div className="summary-card">
          <span>New</span>

          <strong>
            {
              requests.filter(
                (request) =>
                  request.status === "submitted"
              ).length
            }
          </strong>
        </div>

        <div className="summary-card">
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

        <div className="summary-card">
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
      </div>

      <div className="admin-requests-card">
        {loading ? (
          <div className="requests-empty">
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="requests-empty">
            <div className="empty-request-icon">
              ✓
            </div>

            <h3>No requests yet</h3>

            <p>
              User requests will appear here after
              they submit them.
            </p>
          </div>
        ) : (
          <div className="admin-request-list">
            {requests.map((request) => (
              <div
                className="admin-request-item"
                key={request.id}
              >
                <div className="admin-request-top">
                  <div>
                    <div className="request-title-row">
                      <h2>{request.title}</h2>

                      <span
                        className={`request-priority priority-${request.priority}`}
                      >
                        {request.priority}
                      </span>

                      <span
                        className={`request-status status-${request.status}`}
                      >
                        {getStatusLabel(
                          request.status
                        )}
                      </span>
                    </div>

                    <p className="request-user">
                      Submitted by{" "}
                      <strong>
                        {request.profiles?.name ||
                          "Unknown User"}
                      </strong>{" "}
                      ·{" "}
                      {request.profiles?.email ||
                        "No email"}
                    </p>
                  </div>

                  <span className="request-created">
                    {formatDate(
                      request.created_at
                    )}
                  </span>
                </div>

                <div className="request-info-grid">
                  <div>
                    <span>Service</span>

                    <strong>
                      {request.services?.name ||
                        "Not selected"}
                    </strong>
                  </div>

                  <div>
                    <span>User Phone</span>

                    <strong>
                      {request.profiles?.phone ||
                        "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Submitted</span>

                    <strong>
                      {formatDate(
                        request.created_at
                      )}
                    </strong>
                  </div>
                </div>

                <div className="request-description-box">
                  <span>Description</span>

                  <p>{request.description}</p>
                </div>

                {request.requirements && (
                  <div className="request-description-box">
                    <span>
                      Additional Requirements
                    </span>

                    <p>
                      {request.requirements}
                    </p>
                  </div>
                )}

                <div className="request-assignment">
                  <div>
                    <label>
                      Assign Manager
                    </label>

                    <select
                      value={
                        request.manager_id || ""
                      }
                      onChange={(e) => {
                        const managerId =
                          e.target.value || null;

                        updateRequest(
                          request,
                          {
                            manager_id:
                              managerId,
                            status:
                              managerId
                                ? "assigned"
                                : "under_review",
                          }
                        );
                      }}
                      disabled={
                        savingId === request.id
                      }
                    >
                      <option value="">
                        Select a manager
                      </option>

                      {managers.map((manager) => (
                        <option
                          key={manager.id}
                          value={manager.id}
                        >
                          {manager.name} —{" "}
                          {manager.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>
                      Request Status
                    </label>

                    <select
                      value={request.status}
                      onChange={(e) =>
                        updateRequest(
                          request,
                          {
                            status:
                              e.target.value,
                          }
                        )
                      }
                      disabled={
                        savingId === request.id
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

                    <input
                      type="date"
                      value={
                        request.due_date || ""
                      }
                      onChange={(e) =>
                        updateRequest(
                          request,
                          {
                            due_date:
                              e.target.value ||
                              null,
                          }
                        )
                      }
                      disabled={
                        savingId === request.id
                      }
                    />
                  </div>
                </div>

                <div className="admin-notes-section">
                  <label>
                    Admin Notes
                  </label>

                  <textarea
                    defaultValue={
                      request.admin_notes || ""
                    }
                    placeholder="Add internal notes about this request..."
                    rows="3"
                    onBlur={(e) => {
                      const newNotes =
                        e.target.value;

                      if (
                        newNotes !==
                        (request.admin_notes || "")
                      ) {
                        updateRequest(
                          request,
                          {
                            admin_notes:
                              newNotes,
                          }
                        );
                      }
                    }}
                    disabled={
                      savingId === request.id
                    }
                  />
                </div>

                {request.managers && (
                  <div className="assigned-manager">
                    <span>
                      Current Manager
                    </span>

                    <strong>
                      {request.managers.name}
                    </strong>

                    <small>
                      {request.managers.email}
                    </small>
                  </div>
                )}

                {savingId === request.id && (
                  <div className="request-saving">
                    Saving changes...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Requests;