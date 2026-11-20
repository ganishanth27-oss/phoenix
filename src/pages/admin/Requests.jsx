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
  const [toastMessage, setToastMessage] = useState("");

  // Modals
  const [convertingProject, setConvertingProject] = useState(null);
  const [conversionForm, setConversionForm] = useState({
    name: "",
    manager_id: "",
    total_cost: "50000",
    advance_assigned: "15000",
    due_date: "",
  });
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // View Details Modal
  const [viewDetailsItem, setViewDetailsItem] = useState(null);

  // Delete Confirmation Modal
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deleted / Recycle Bin view
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedRequests, setDeletedRequests] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3500);
  };

  const loadData = async () => {
    setLoading(true);

    try {
      // 1. Fetch managers
      const managersPromise = supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "manager")
        .eq("status", "active")
        .order("name");

      // 2. Try fetching requests via our Express Admin Endpoint first
      // This bypasses browser client RLS restrictions and ensures 100% data visibility
      let fetchedRequests = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/requests", {
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json.requests;
          if (Array.isArray(list)) {
            fetchedRequests = list;
          }
        }
      } catch (e) {
        console.warn("Backend /api/admin/requests fetch error, falling back to direct Supabase:", e);
      }

      // If backend call returned data, use it; otherwise fallback to direct supabase
      if (!fetchedRequests) {
        const { data: directData, error: reqErr } = await supabase
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
          .order("created_at", { ascending: false });

        if (reqErr) throw reqErr;
        fetchedRequests = directData || [];
      }

      const { data: managersData, error: mgrErr } = await managersPromise;
      if (mgrErr) throw mgrErr;

      setRequests(fetchedRequests || []);
      setManagers(managersData || []);
    } catch (error) {
      console.error("Requests loadData error:", error);
      showToast("Error loading requests: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedItems = async () => {
    setLoadingDeleted(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/deleted-items?type=request", {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json.items || [];
        // Filter for user_requests
        const requestItems = list.filter((it) => it.category === "user_requests" || it.type === "Work Request");
        setDeletedRequests(requestItems);
      }
    } catch (err) {
      console.error("Failed to load deleted requests:", err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showRecycleBin) {
      loadDeletedItems();
    }
  }, [showRecycleBin]);

  const updateRequest = async (request, changes) => {
    setSavingId(request.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Update via backend PATCH endpoint with fallback to supabase update
      let updatedOk = false;
      try {
        const res = await fetch(`/api/admin/requests/${request.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify(changes),
        });
        if (res.ok) {
          updatedOk = true;
        }
      } catch (e) {
        console.warn("Backend patch error:", e);
      }

      if (!updatedOk) {
        const updateData = {
          ...changes,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("user_requests")
          .update(updateData)
          .eq("id", request.id);

        if (error) throw error;
      }

      showToast("Request updated successfully.");
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to update: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  // Safe soft delete execution
  const executeDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/requests/${deleteConfirmItem.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to delete request");
      }

      // Remove from state immediately
      setRequests((prev) => prev.filter((r) => r.id !== deleteConfirmItem.id));
      showToast("Customer enquiry deleted successfully.");
      setDeleteConfirmItem(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Could not delete request: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore soft-deleted request
  const restoreDeletedRequest = async (item) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/deleted-items/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          id: item.id,
          category: item.category || "user_requests",
          type: "request",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to restore");
      }

      showToast("Customer enquiry restored successfully.");
      await loadDeletedItems();
      await loadData();
    } catch (err) {
      console.error("Restore error:", err);
      alert("Restore failed: " + err.message);
    }
  };

  const openConversionModal = (request) => {
    setConvertingProject(request);
    setConversionForm({
      name: request.title || "New Enterprise Project",
      manager_id: request.manager_id || (managers[0]?.id || ""),
      total_cost: "50000",
      advance_assigned: "15000",
      due_date: request.due_date || "",
    });
  };

  const handleCreateProjectFromRequest = async (e) => {
    e.preventDefault();
    if (!convertingProject) return;

    setIsCreatingProject(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Create project in projects table
      const { data: newProj, error: projErr } = await supabase
        .from("projects")
        .insert({
          name: conversionForm.name,
          description: convertingProject.description || "Project created from customer request",
          service_id: convertingProject.service_id || null,
          manager_id: conversionForm.manager_id || null,
          status: "in_progress",
          priority: convertingProject.priority || "medium",
          due_date: conversionForm.due_date || null,
          created_by: user?.id || null,
        })
        .select("id")
        .single();

      if (projErr) throw projErr;

      // 2. Link user to project if not anonymous guest
      if (convertingProject.user_id && convertingProject.user_id !== GUEST_USER_ID) {
        await supabase.from("project_users").insert({
          project_id: newProj.id,
          user_id: convertingProject.user_id,
        });
      }

      // 3. Save financial schedule & advance assignment in backend
      await fetch(`/api/admin/projects/${newProj.id}/financials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          total_cost: Number(conversionForm.total_cost || 0),
          advance_assigned: Number(conversionForm.advance_assigned || 0),
          advance_due_date: conversionForm.due_date || null,
          advance_status: "assigned",
        }),
      });

      // 4. Update request status to 'completed' with note
      await updateRequest(convertingProject, {
        status: "completed",
        admin_notes: `[PROJECT CREATED ID: ${newProj.id}] Assigned advance ₹${conversionForm.advance_assigned}`,
      });

      showToast(`Project "${conversionForm.name}" created with advance ₹${conversionForm.advance_assigned}!`);
      setConvertingProject(null);
    } catch (err) {
      console.error("Conversion error:", err);
      alert("Failed to create project: " + err.message);
    } finally {
      setIsCreatingProject(false);
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
      if (line.startsWith("[WORK REQUEST ID: ")) {
        details.workRequestId = line.replace("[WORK REQUEST ID: ", "").replace("]", "").trim();
      }
      if (line.startsWith("Name: ")) details.name = line.replace("Name: ", "").trim();
      if (line.startsWith("Email: ")) details.email = line.replace("Email: ", "").trim();
      if (line.startsWith("Phone: ")) details.phone = line.replace("Phone: ", "").trim();
      if (line.startsWith("Organization / Client: ")) details.company = line.replace("Organization / Client: ", "").trim();
      if (line.startsWith("Service Category: ")) details.category = line.replace("Service Category: ", "").trim();
      if (line.startsWith("Expected Budget: ")) details.budget = line.replace("Expected Budget: ", "").trim();
      if (line.startsWith("Target Completion Date: ")) details.targetDate = line.replace("Target Completion Date: ", "").trim();
      if (line.startsWith("Reference Files: ")) details.referenceFile = line.replace("Reference Files: ", "").trim();
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
    const parsedReqIdMatch = parsed?.workRequestId?.toLowerCase().includes(term);

    return (
      titleMatch ||
      descMatch ||
      profileNameMatch ||
      profileEmailMatch ||
      parsedNameMatch ||
      parsedEmailMatch ||
      parsedReqIdMatch
    );
  });

  return (
    <div className="admin-requests-page">
      {/* Toast notification */}
      {toastMessage && (
        <div className="admin-floating-toast">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <div className="requests-page-header">
        <div>
          <span className="requests-label">PHOENIX ADMIN OPERATIONS</span>
          <h1>Customer Work Requests</h1>
          <p>
            Review direct client project submissions, assign managers, verify briefs, and convert accepted requests directly into projects.
          </p>
        </div>

        <div className="header-actions-group">
          <button
            className={`recycle-bin-toggle-btn ${showRecycleBin ? "active" : ""}`}
            onClick={() => setShowRecycleBin(!showRecycleBin)}
          >
            {showRecycleBin ? "← Back to Active Requests" : "🗑 Recycle Bin / Deleted Items"}
          </button>

          <button
            className="refresh-requests-button"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh Requests"}
          </button>
        </div>
      </div>

      {showRecycleBin ? (
        /* RECYCLE BIN / DELETED ITEMS VIEW */
        <div className="recycle-bin-container">
          <div className="recycle-bin-header">
            <div>
              <h2>🗑 Deleted Work Requests (Safe Soft-Delete)</h2>
              <p>Deleted items remain securely archived. You can restore any request to the active dashboard at any time.</p>
            </div>
            <button className="btn-refresh-deleted" onClick={loadDeletedItems} disabled={loadingDeleted}>
              {loadingDeleted ? "Loading..." : "↻ Refresh Bin"}
            </button>
          </div>

          {loadingDeleted ? (
            <div className="requests-empty">Loading deleted archive...</div>
          ) : deletedRequests.length === 0 ? (
            <div className="requests-empty">
              <div className="empty-request-icon">✓</div>
              <h3>Recycle Bin is Empty</h3>
              <p>No soft-deleted work requests currently in the archive.</p>
            </div>
          ) : (
            <div className="deleted-items-grid">
              {deletedRequests.map((del) => {
                const reqRecord = del.record || del.data;
                const parsed = parseRequirementsDetails(reqRecord?.requirements || del.requirements);
                const clientName = parsed?.name || reqRecord?.profiles?.name || "Direct Client";
                return (
                  <div key={del.id} className="deleted-card">
                    <div className="deleted-card-top">
                      <div>
                        <h3>{del.title || reqRecord?.title || del.id}</h3>
                        <span className="deleted-meta">
                          Deleted on {formatDate(del.deleted_at || del.deletedAt)} by {del.deleted_by_name || "Admin"}
                        </span>
                      </div>
                      <button
                        className="btn-restore-item"
                        onClick={() => restoreDeletedRequest(del)}
                      >
                        ↩ Restore to Dashboard
                      </button>
                    </div>

                    <p className="deleted-desc">{reqRecord?.description || del.description || "No description."}</p>
                    <div className="deleted-client-badge">
                      Client: <strong>{clientName}</strong> · Service: <strong>{reqRecord?.services?.name || parsed?.category || "General"}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE REQUESTS VIEW */
        <>
          <div className="request-summary">
            <div className="summary-card">
              <span>Total Requests</span>
              <strong>{requests.length}</strong>
            </div>

            <div className="summary-card">
              <span>New / Submitted</span>
              <strong>
                {requests.filter((r) => r.status === "submitted").length}
              </strong>
            </div>

            <div className="summary-card">
              <span>Assigned / In Progress</span>
              <strong>
                {requests.filter((r) => r.status === "assigned" || r.status === "in_progress").length}
              </strong>
            </div>

            <div className="summary-card">
              <span>Completed / Converted</span>
              <strong>
                {requests.filter((r) => r.status === "completed").length}
              </strong>
            </div>
          </div>

          <div className="requests-filter-bar">
            <input
              type="text"
              className="requests-search"
              placeholder="Search by customer name, request ID, email, or service..."
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
              New Requests ({requests.filter((r) => r.status === "submitted").length})
            </button>
            <button
              className={`filter-status-btn ${statusFilter === "under_review" ? "active" : ""}`}
              onClick={() => setStatusFilter("under_review")}
            >
              Under Review ({requests.filter((r) => r.status === "under_review").length})
            </button>
            <button
              className={`filter-status-btn ${statusFilter === "assigned" ? "active" : ""}`}
              onClick={() => setStatusFilter("assigned")}
            >
              Assigned ({requests.filter((r) => r.status === "assigned").length})
            </button>
            <button
              className={`filter-status-btn ${statusFilter === "completed" ? "active" : ""}`}
              onClick={() => setStatusFilter("completed")}
            >
              Converted ({requests.filter((r) => r.status === "completed").length})
            </button>
          </div>

          <div className="admin-requests-card">
            {loading ? (
              <div className="requests-empty">Loading customer requests...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="requests-empty">
                <div className="empty-request-icon">✓</div>
                <h3>No requests found</h3>
                <p>
                  {searchTerm || statusFilter !== "all"
                    ? "Try clearing filters or search terms."
                    : "Customer work requests submitted through the homepage will appear here."}
                </p>
              </div>
            ) : (
              <div className="admin-request-list">
                {filteredRequests.map((request) => {
                  const isGuest = request.user_id === GUEST_USER_ID;
                  const parsedCustomer = parseRequirementsDetails(request.requirements);

                  const displayName =
                    parsedCustomer?.name || request.profiles?.name || (isGuest ? "Direct Client" : "Registered User");
                  const displayEmail =
                    parsedCustomer?.email || request.profiles?.email || "No email";
                  const displayPhone =
                    parsedCustomer?.phone || request.profiles?.phone || "Not provided";
                  const displayCompany =
                    parsedCustomer?.company || "Individual Client";
                  const requestIdTag =
                    parsedCustomer?.workRequestId || `REQ-${request.id.substring(0, 6).toUpperCase()}`;

                  return (
                    <div className="admin-request-item" key={request.id}>
                      <div className="admin-request-top">
                        <div>
                          <div className="request-title-row">
                            <h2>{request.title}</h2>

                            <span className="guest-enquiry-badge">{requestIdTag}</span>

                            <span className={`request-priority priority-${request.priority}`}>
                              {request.priority}
                            </span>

                            <span className={`request-status status-${request.status}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </div>

                          <p className="request-user">
                            Client: <strong>{displayName}</strong> ({displayCompany}) · <a href={`mailto:${displayEmail}`} className="contact-link">{displayEmail}</a> · <a href={`tel:${displayPhone}`} className="contact-link">{displayPhone}</a>
                          </p>
                        </div>

                        <div className="top-right-actions">
                          <span className="request-created">
                            {formatDate(request.created_at)}
                          </span>

                          <div className="action-buttons-wrap">
                            <button
                              className="btn-view-details"
                              onClick={() => setViewDetailsItem(request)}
                            >
                              👁 View Brief
                            </button>

                            <button
                              className="btn-create-project-from-req"
                              onClick={() => openConversionModal(request)}
                            >
                              ⚡ Convert to Project
                            </button>

                            {/* Red Delete Button with Trash Icon */}
                            <button
                              className="btn-delete-request-red"
                              title="Delete Work Request"
                              onClick={() => setDeleteConfirmItem(request)}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="request-info-grid">
                        <div>
                          <span>Requested Service</span>
                          <strong>
                            {request.services?.name || parsedCustomer?.category || "Custom Engineering"}
                          </strong>
                        </div>

                        <div>
                          <span>Budget Estimate</span>
                          <strong className="budget-val">
                            {parsedCustomer?.budget || "Flexible"}
                          </strong>
                        </div>

                        <div>
                          <span>Target Launch Date</span>
                          <strong>
                            {parsedCustomer?.targetDate || "Not specified"}
                          </strong>
                        </div>
                      </div>

                      {parsedCustomer?.referenceFile && (
                        <div className="reference-file-callout">
                          <span>Attached Reference Asset: </span>
                          {parsedCustomer.referenceFile.startsWith("http") ? (
                            <a
                              href={parsedCustomer.referenceFile}
                              target="_blank"
                              rel="noreferrer"
                              className="file-dl-link"
                            >
                              Download / View Asset ↗
                            </a>
                          ) : (
                            <code>{parsedCustomer.referenceFile}</code>
                          )}
                        </div>
                      )}

                      <div className="request-description-box">
                        <span>Project Brief Summary</span>
                        <p>{request.description}</p>
                      </div>

                      <div className="request-assignment">
                        <div>
                          <label>Assign Project Manager</label>
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
                          <label>Request Status Workflow</label>
                          <select
                            value={request.status}
                            onChange={(e) =>
                              updateRequest(request, {
                                status: e.target.value,
                              })
                            }
                            disabled={savingId === request.id}
                          >
                            <option value="submitted">New Request</option>
                            <option value="under_review">Under Review</option>
                            <option value="assigned">Assigned to Manager</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Accepted / Project Created</option>
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
                          placeholder="Add internal notes about client conversations, cost estimates, or scoping..."
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
                          <span>Assigned Project Manager</span>
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
        </>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewDetailsItem && (
        <div className="conv-modal-backdrop" onClick={() => setViewDetailsItem(null)}>
          <div className="conv-modal-panel details-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <div>
                <span className="modal-pill-tag">REQUEST DETAILS</span>
                <h3>{viewDetailsItem.title}</h3>
              </div>
              <button className="modal-close" onClick={() => setViewDetailsItem(null)}>✕</button>
            </div>

            {(() => {
              const parsed = parseRequirementsDetails(viewDetailsItem.requirements);
              const displayName = parsed?.name || viewDetailsItem.profiles?.name || "Direct Client";
              const displayEmail = parsed?.email || viewDetailsItem.profiles?.email || "None";
              const displayPhone = parsed?.phone || viewDetailsItem.profiles?.phone || "None";
              const displayCompany = parsed?.company || "Not provided";
              const reqId = parsed?.workRequestId || `REQ-${viewDetailsItem.id.substring(0, 6).toUpperCase()}`;

              return (
                <div className="details-view-body">
                  <div className="details-two-col">
                    <div>
                      <span className="detail-meta-label">Reference ID</span>
                      <strong className="detail-meta-val">{reqId}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Client Name</span>
                      <strong className="detail-meta-val">{displayName}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Email Address</span>
                      <strong className="detail-meta-val">{displayEmail}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Phone Number</span>
                      <strong className="detail-meta-val">{displayPhone}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Company / Org</span>
                      <strong className="detail-meta-val">{displayCompany}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Service Category</span>
                      <strong className="detail-meta-val">{viewDetailsItem.services?.name || parsed?.category || "Custom Engineering"}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Expected Budget</span>
                      <strong className="detail-meta-val budget-highlight">{parsed?.budget || "Flexible"}</strong>
                    </div>
                    <div>
                      <span className="detail-meta-label">Target Completion</span>
                      <strong className="detail-meta-val">{parsed?.targetDate || "Not specified"}</strong>
                    </div>
                  </div>

                  <div className="detail-section-block">
                    <span className="detail-meta-label">Full Project Brief</span>
                    <p className="detail-full-text">{viewDetailsItem.description}</p>
                  </div>

                  {parsed?.referenceFile && (
                    <div className="detail-section-block">
                      <span className="detail-meta-label">Uploaded File Asset</span>
                      <div className="asset-link-box">
                        <a href={parsed.referenceFile} target="_blank" rel="noreferrer" className="asset-btn">
                          📥 Open Reference Asset ({parsed.referenceFile.split("/").pop() || "Document"})
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="modal-cancel-btn"
                      onClick={() => setViewDetailsItem(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="modal-save-btn"
                      onClick={() => {
                        const target = viewDetailsItem;
                        setViewDetailsItem(null);
                        openConversionModal(target);
                      }}
                    >
                      ⚡ Convert to Project
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="conv-modal-backdrop" onClick={() => !isDeleting && setDeleteConfirmItem(null)}>
          <div className="conv-modal-panel delete-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">⚠️</div>
            <h3>Delete Customer Enquiry</h3>
            <p className="delete-confirm-text">
              Are you sure you want to delete this customer enquiry?
            </p>

            <div className="delete-target-preview">
              <span className="delete-target-name">{deleteConfirmItem.title || "Customer Request"}</span>
              <span className="delete-target-id">
                {parseRequirementsDetails(deleteConfirmItem.requirements)?.workRequestId || deleteConfirmItem.id}
              </span>
            </div>

            <p className="delete-safe-notice">
              🛡️ <strong>Safe Soft Deletion:</strong> This item will be hidden from the active dashboard and archived in the Recycle Bin. You can restore it at any time.
            </p>

            <div className="modal-footer delete-actions-row">
              <button
                type="button"
                className="modal-cancel-btn"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                disabled={isDeleting}
                onClick={executeDelete}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Request to Project Modal */}
      {convertingProject && (
        <div className="conv-modal-backdrop" onClick={() => setConvertingProject(null)}>
          <div className="conv-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <div>
                <h3>Convert Request into Active Project</h3>
                <p>Client: {parseRequirementsDetails(convertingProject.requirements)?.name || "Direct Client"}</p>
              </div>
              <button className="modal-close" onClick={() => setConvertingProject(null)}>✕</button>
            </div>

            <form onSubmit={handleCreateProjectFromRequest} className="conv-form">
              <div className="form-group">
                <label>Official Project Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  value={conversionForm.name}
                  onChange={(e) => setConversionForm({ ...conversionForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Assign Senior Manager</label>
                <select
                  value={conversionForm.manager_id}
                  onChange={(e) => setConversionForm({ ...conversionForm, manager_id: e.target.value })}
                >
                  <option value="">Select a manager...</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Total Agreed Project Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={conversionForm.total_cost}
                    onChange={(e) => setConversionForm({ ...conversionForm, total_cost: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Advance Payment Assigned (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={conversionForm.advance_assigned}
                    onChange={(e) => setConversionForm({ ...conversionForm, advance_assigned: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Project Target Delivery Date</label>
                <input
                  type="date"
                  value={conversionForm.due_date}
                  onChange={(e) => setConversionForm({ ...conversionForm, due_date: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setConvertingProject(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-save-btn" disabled={isCreatingProject}>
                  {isCreatingProject ? "Creating Project..." : "Confirm & Launch Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Requests;
