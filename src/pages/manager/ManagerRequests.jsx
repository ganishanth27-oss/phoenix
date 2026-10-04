import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, phone, role, status")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setManager(profile);

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

      if (error) throw error;

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

  const updateRequest = async (request, changes) => {
    if (!manager) return;

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

      if (error) throw error;

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

  const getStatusLabel = (status) => {
    if (!status) return "Unknown";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitial = (name) => {
    return name?.charAt(0)?.toUpperCase() || "U";
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
        {
          label: "Requests",
          path: "/manager/requests",
          icon: "▣",
        },
        {
          label: "Users",
          path: "/manager/users",
          icon: "♙",
        },
        {
          label: "Projects",
          path: "/manager/projects",
          icon: "◈",
        },
        {
          label: "Tasks",
          path: "/manager/tasks",
          icon: "✓",
        },
        {
          label: "Files",
          path: "/manager/files",
          icon: "▤",
        },
        {
          label: "Review Work",
          path: "/manager/review",
          icon: "◉",
        },
        {
          label: "Reports",
          path: "/manager/reports",
          icon: "▥",
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="manager-requests-loading">
        <div className="manager-requests-loader"></div>
        <p>Loading assigned requests...</p>
      </div>
    );
  }

  const totalRequests = requests.length;

  const assignedRequests = requests.filter(
    (request) => request.status === "assigned"
  ).length;

  const inProgressRequests = requests.filter(
    (request) => request.status === "in_progress"
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "completed"
  ).length;

  return (
    <DashboardLayout
      profile={manager}
      navigation={navigation}
      title="Assigned Requests"
    >
      <div className="manager-requests-page">

        {/* PAGE HEADER */}

        <section className="manager-requests-top">

          <div>
            <span className="manager-requests-eyebrow">
              WORKSPACE / REQUESTS
            </span>

            <h1>Assigned Requests</h1>

            <p>
              Review customer requests and manage their progress.
            </p>
          </div>

          <button
            className="manager-refresh-btn"
            onClick={loadRequests}
          >
            <span>↻</span>
            Refresh
          </button>

        </section>


        {/* SUMMARY */}

        <section className="manager-request-summary">

          <div className="request-stat-card">
            <div className="request-stat-icon purple">
              #
            </div>

            <div>
              <span>Total Requests</span>
              <strong>{totalRequests}</strong>
            </div>
          </div>


          <div className="request-stat-card">
            <div className="request-stat-icon blue">
              →
            </div>

            <div>
              <span>Assigned</span>
              <strong>{assignedRequests}</strong>
            </div>
          </div>


          <div className="request-stat-card">
            <div className="request-stat-icon orange">
              ◷
            </div>

            <div>
              <span>In Progress</span>
              <strong>{inProgressRequests}</strong>
            </div>
          </div>


          <div className="request-stat-card">
            <div className="request-stat-icon green">
              ✓
            </div>

            <div>
              <span>Completed</span>
              <strong>{completedRequests}</strong>
            </div>
          </div>

        </section>


        {/* REQUESTS */}

        <section className="manager-request-content">

          <div className="manager-request-content-header">

            <div>
              <h2>Customer Requests</h2>
              <p>
                Requests assigned to your manager account
              </p>
            </div>

            <span className="request-count">
              {requests.length} request
              {requests.length !== 1 ? "s" : ""}
            </span>

          </div>


          {requests.length === 0 ? (

            <div className="manager-request-empty">

              <div className="empty-request-icon">
                ▣
              </div>

              <h2>No Requests Assigned</h2>

              <p>
                New customer requests assigned to you
                by the administrator will appear here.
              </p>

              <button
                onClick={() => navigate("/manager")}
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

                  {/* REQUEST TOP */}

                  <div className="request-card-top">

                    <div className="request-title-area">

                      <div className="request-service">
                        {request.services?.name ||
                          "General Request"}
                      </div>

                      <h2>
                        {request.title}
                      </h2>

                      <p className="request-created">
                        Submitted {formatDate(request.created_at)}
                      </p>

                    </div>

                    <div className="request-badges">

                      <span
                        className={`request-priority priority-${request.priority}`}
                      >
                        {request.priority}
                      </span>

                      <span
                        className={`request-status status-${request.status}`}
                      >
                        {getStatusLabel(request.status)}
                      </span>

                    </div>

                  </div>


                  {/* CUSTOMER */}

                  <div className="request-customer">

                    <div className="customer-avatar">
                      {getInitial(request.profiles?.name)}
                    </div>

                    <div className="customer-main">

                      <span>Customer</span>

                      <strong>
                        {request.profiles?.name ||
                          "Unknown Customer"}
                      </strong>

                    </div>

                    <div className="customer-contact">
                      <span>Email</span>
                      <strong>
                        {request.profiles?.email ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div className="customer-contact">
                      <span>Phone</span>
                      <strong>
                        {request.profiles?.phone ||
                          "Not provided"}
                      </strong>
                    </div>

                  </div>


                  {/* DESCRIPTION */}

                  <div className="request-details">

                    <div className="request-detail-block">

                      <span className="detail-label">
                        Request Details
                      </span>

                      <p>
                        {request.description}
                      </p>

                    </div>

                    {request.requirements && (

                      <div className="request-detail-block">

                        <span className="detail-label">
                          Additional Requirements
                        </span>

                        <p>
                          {request.requirements}
                        </p>

                      </div>

                    )}

                  </div>


                  {/* ADMIN NOTE */}

                  {request.admin_notes && (

                    <div className="admin-note-box">

                      <div className="admin-note-icon">
                        !
                      </div>

                      <div>
                        <span>Admin Note</span>

                        <p>
                          {request.admin_notes}
                        </p>
                      </div>

                    </div>

                  )}


                  {/* MANAGEMENT */}

                  <div className="request-management">

                    <div className="management-field">

                      <label>Request Status</label>

                      <select
                        value={request.status}
                        disabled={
                          savingId === request.id
                        }
                        onChange={(event) =>
                          updateRequest(
                            request,
                            {
                              status: event.target.value,
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


                    <div className="management-field">

                      <label>Due Date</label>

                      <div className="due-date-display">
                        {formatDate(request.due_date)}
                      </div>

                    </div>

                  </div>


                  {/* NOTES */}

                  <div className="manager-notes">

                    <label>Manager Notes</label>

                    <textarea
                      defaultValue={
                        request.manager_notes || ""
                      }
                      rows="4"
                      placeholder="Add progress updates, questions, or notes..."
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
                              manager_notes: newNotes,
                            }
                          );
                        }

                      }}
                    />

                    <small>
                      Changes save automatically when you
                      leave this field.
                    </small>

                  </div>


                  {savingId === request.id && (

                    <div className="request-saving">
                      <span className="saving-spinner"></span>
                      Saving changes...
                    </div>

                  )}

                </article>

              ))}

            </div>

          )}

        </section>

      </div>
    </DashboardLayout>
  );
}

export default ManagerRequests;