import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Requests.css";

const GUEST_USER_ID = "383fcb79-2475-4b65-8ca8-e014ea872324";

function Requests() {
  const [requests, setRequests] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);

    try {
      const [requestsResult, managersResult] = await Promise.all([
        supabase
          .from("user_requests")
          .select(`
            id,
            user_id,
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
    if (!status) return "Unknown";
    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not specified";
    }

    return new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to extract customer details if requirements block exists
  const parseRequirementsDetails = (reqString) => {
    if (!reqString || !reqString.includes("[CUSTOMER DETAILS]")) {
      return null;
    }
    const lines = reqString.split("\n");
    const details = {};
    for (const line of lines) {
      if (line.startsWith("Name: ")) details.name = line.replace("Name: ", "").trim();
      if (line.startsWith("Email: ")) details.email = line.replace("Email: ", "").trim();
      if (line.startsWith("Phone: ")) details.phone = line.replace("Phone: ", "").trim();
      if (line.startsWith("Company/Organization: ")) details.company = line.replace("Company/Organization: ", "").trim();
      if (line.startsWith("Service Category: ")) details.category = line.replace("Service Category: ", "").trim();
    }
    return details;
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    if (!matchesStatus) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const parsed = parseRequirementsDetails(req.requirements);

    const titleMatch = req.title?.toLowerCase().includes(term);
    const descMatch = req.description?.toLowerCase().includes(term);
    const profileNameMatch = req.profiles?.name?.toLowerCase().includes(term);
    const profileEmailMatch = req.profiles?.email?.toLowerCase().includes(term);
    const parsedNameMatch = parsed?.name?.toLowerCase().includes(term);
    const parsedEmailMatch = parsed?.email?.toLowerCase().includes(term);
    const parsedCompanyMatch = parsed?.company?.toLowerCase().includes(term);

    return (
      titleMatch ||
      descMatch ||
      profileNameMatch ||
      profileEmailMatch ||
      parsedNameMatch ||
      parsedEmailMatch ||
      parsedCompanyMatch
    );
  });

  return (
    <div className="admin-requests-page">
      <div className="requests-page-header">
        <div>
          <span className="requests-label">PHOENIX ADMIN</span>
          <h1>User Requests & Customer Enquiries</h1>
          <p>
            Review enquiries and project requests, assign managers, and track fulfillment status.
          </p>
        </div>

        <button
          className="refresh-requests-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="request-summary">
        <div className="summary-card">
          <span>Total Requests</span>
          <strong>{requests.length}</strong>
        </div>

        <div className="summary-card">
          <span>New Submissions</span>
          <strong>
            {requests.filter((r) => r.status === "submitted").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>Assigned</span>
          <strong>
            {requests.filter((r) => r.status === "assigned" || r.status === "in_progress").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>Completed</span>
          <strong>
            {requests.filter((r) => r.status === "completed").length}
          </strong>
        </div>
      </div>

      <div className="requests-filter-bar">
        <input
          type="text"
          className="requests-search"
          placeholder="Search by customer name, email, company, or service..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <button
          className={`filter-status-btn ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All ({requests.length})
        </button>
        <button
          className={`filter-status-btn ${statusFilter === "submitted" ? "active" : ""}`}
          onClick={() => setStatusFilter("submitted")}
        >
          Submitted ({requests.filter((r) => r.status === "submitted").length})
        </button>
        <button
          className={`filter-status-btn ${statusFilter === "assigned" ? "active" : ""}`}
          onClick={() => setStatusFilter("assigned")}
        >
          Assigned ({requests.filter((r) => r.status === "assigned").length})
        </button>
        <button
          className={`filter-status-btn ${statusFilter === "in_progress" ? "active" : ""}`}
          onClick={() => setStatusFilter("in_progress")}
        >
          In Progress ({requests.filter((r) => r.status === "in_progress").length})
        </button>
        <button
          className={`filter-status-btn ${statusFilter === "completed" ? "active" : ""}`}
          onClick={() => setStatusFilter("completed")}
        >
          Completed ({requests.filter((r) => r.status === "completed").length})
        </button>
      </div>

      <div className="admin-requests-card">
        {loading ? (
          <div className="requests-empty">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="requests-empty">
            <div className="empty-request-icon">✓</div>
            <h3>No requests found</h3>
            <p>
              {searchTerm || statusFilter !== "all"
                ? "Try clearing filters or search terms."
                : "Customer enquiries and user requests will appear here after submission."}
            </p>
          </div>
        ) : (
          <div className="admin-request-list">
            {filteredRequests.map((request) => {
              const isGuest = request.user_id === GUEST_USER_ID;
              const parsedCustomer = parseRequirementsDetails(request.requirements);

              const displayName =
                parsedCustomer?.name || request.profiles?.name || (isGuest ? "Guest Client" : "Unknown User");
              const displayEmail =
                parsedCustomer?.email || request.profiles?.email || "No email";
              const displayPhone =
                parsedCustomer?.phone || request.profiles?.phone || "Not provided";
              const displayCompany =
                parsedCustomer?.company || "Not provided";

              return (
                <div className="admin-request-item" key={request.id}>
                  <div className="admin-request-top">
                    <div>
                      <div className="request-title-row">
                        <h2>{request.title}</h2>

                        {isGuest && (
                          <span className="guest-enquiry-badge">Public Enquiry</span>
                        )}

                        <span className={`request-priority priority-${request.priority}`}>
                          {request.priority}
                        </span>

                        <span className={`request-status status-${request.status}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      <p className="request-user">
                        Customer: <strong>{displayName}</strong> · {displayEmail}
                        {displayCompany !== "Not provided" && ` (${displayCompany})`}
                      </p>
                    </div>

                    <span className="request-created">
                      {formatDate(request.created_at)}
                    </span>
                  </div>

                  <div className="request-info-grid">
                    <div>
                      <span>Service</span>
                      <strong>
                        {request.services?.name || parsedCustomer?.category || "General / Not selected"}
                      </strong>
                    </div>

                    <div>
                      <span>Contact Phone</span>
                      <strong>{displayPhone}</strong>
                    </div>

                    <div>
                      <span>Organization</span>
                      <strong>{displayCompany}</strong>
                    </div>
                  </div>

                  <div className="request-description-box">
                    <span>Message / Requirements</span>
                    <p>{request.description}</p>
                  </div>

                  {request.requirements && !parsedCustomer && (
                    <div className="request-description-box">
                      <span>Additional Requirements</span>
                      <p>{request.requirements}</p>
                    </div>
                  )}

                  <div className="request-assignment">
                    <div>
                      <label>Assign Manager</label>
                      <select
                        value={request.manager_id || ""}
                        onChange={(e) => {
                          const managerId = e.target.value || null;
                          updateRequest(request, {
                            manager_id: managerId,
                            status: managerId ? "assigned" : "under_review",
                          });
                        }}
                        disabled={savingId === request.id}
                      >
                        <option value="">Select a manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} — {manager.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Request Status</label>
                      <select
                        value={request.status}
                        onChange={(e) =>
                          updateRequest(request, {
                            status: e.target.value,
                          })
                        }
                        disabled={savingId === request.id}
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_for_user">Waiting for User</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label>Due Date</label>
                      <input
                        type="date"
                        value={request.due_date || ""}
                        onChange={(e) =>
                          updateRequest(request, {
                            due_date: e.target.value || null,
                          })
                        }
                        disabled={savingId === request.id}
                      />
                    </div>
                  </div>

                  <div className="admin-notes-section">
                    <label>Admin Notes</label>
                    <textarea
                      defaultValue={request.admin_notes || ""}
                      placeholder="Add internal notes about this request..."
                      rows="2"
                      onBlur={(e) => {
                        const newNotes = e.target.value;
                        if (newNotes !== (request.admin_notes || "")) {
                          updateRequest(request, {
                            admin_notes: newNotes,
                          });
                        }
                      }}
                      disabled={savingId === request.id}
                    />
                  </div>

                  {request.managers && (
                    <div className="assigned-manager">
                      <span>Current Manager Assigned</span>
                      <strong>{request.managers.name}</strong>
                      <small>{request.managers.email}</small>
                    </div>
                  )}

                  {savingId === request.id && (
                    <div className="request-saving">Saving changes...</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Requests;
