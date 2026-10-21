import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./AdminSubmissions.css";

function AdminSubmissions() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Review Modal state
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionType, setActionType] = useState("approve"); // 'approve', 'reject', 'request_changes'
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: "", type: "" });

  // Download signed URL state
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
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

      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("id", user.id)
        .single();

      if (profError || prof?.role !== "admin") {
        navigate("/");
        return;
      }

      setProfile(prof);
      await fetchSubmissions();
    } catch (err) {
      console.error("Admin submissions error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("project_submissions")
        .select(`
          *,
          services:service_id (
            id,
            name
          ),
          manager:manager_id (
            id,
            name,
            email
          ),
          attachments:project_attachments (
            id,
            file_name,
            file_size,
            content_type,
            file_path,
            is_public_preview,
            created_at
          ),
          reviews:submission_reviews (
            id,
            action,
            previous_status,
            new_status,
            reason,
            internal_notes,
            created_at,
            reviewer:reviewer_id (
              name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
      applyFilters(data || [], statusFilter, categoryFilter, searchQuery);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setActionMessage({ text: "Failed to load project submissions: " + err.message, type: "error" });
    }
  };

  const applyFilters = (dataList, status, category, query) => {
    let result = [...dataList];

    if (status !== "all") {
      result = result.filter((s) => s.status === status);
    }

    if (category !== "all") {
      result = result.filter(
        (s) => (s.services?.name || s.service_category || "General") === category
      );
    }

    if (query.trim() !== "") {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.client_name?.toLowerCase().includes(q) ||
          s.manager?.name?.toLowerCase().includes(q) ||
          s.manager?.email?.toLowerCase().includes(q)
      );
    }

    setFilteredSubmissions(result);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    applyFilters(submissions, val, categoryFilter, searchQuery);
  };

  const handleCategoryFilterChange = (val) => {
    setCategoryFilter(val);
    applyFilters(submissions, statusFilter, val, searchQuery);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    applyFilters(submissions, statusFilter, categoryFilter, val);
  };

  const handleOpenReview = (submission, defaultAction = "approve") => {
    setSelectedSub(submission);
    setActionType(defaultAction);
    setDecisionNotes("");
    setIsPublished(submission.is_published ?? true);
    setActionMessage({ text: "", type: "" });
  };

  const handleCloseReview = () => {
    setSelectedSub(null);
    setDecisionNotes("");
    setActionMessage({ text: "", type: "" });
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      setDownloadingId(attachment.id);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/files/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ file_path: attachment.file_path }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to generate download URL");
      }

      window.open(result.signed_url, "_blank");
    } catch (err) {
      alert("Download error: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleProcessDecision = async () => {
    if (!selectedSub) return;
    if ((actionType === "reject" || actionType === "request_changes") && !decisionNotes.trim()) {
      setActionMessage({ text: "Please provide a reason/notes for this decision.", type: "error" });
      return;
    }

    setSubmittingReview(true);
    setActionMessage({ text: "", type: "" });

    try {
      let actionParam = "approve";
      if (actionType === "reject") actionParam = "reject";
      if (actionType === "request_changes") actionParam = "request_changes";
      if (actionType === "under_review") actionParam = "set_under_review";

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/admin/submissions/${selectedSub.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: actionParam,
          reason: decisionNotes,
          internal_notes: decisionNotes,
          is_published: actionType === "approve" ? isPublished : false,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update review status");
      }

      setActionMessage({ text: `Review recorded successfully!`, type: "success" });
      await fetchSubmissions();

      setTimeout(() => {
        handleCloseReview();
      }, 1200);
    } catch (err) {
      console.error("Decision error:", err);
      setActionMessage({ text: err.message, type: "error" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleTogglePublished = async (sub) => {
    try {
      const newStatus = !sub.is_published;
      const { error } = await supabase
        .from("project_submissions")
        .update({ is_published: newStatus, updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      if (error) throw error;
      await fetchSubmissions();
    } catch (err) {
      alert("Error toggling publication: " + err.message);
    }
  };

  const navigation = [
    {
      label: "MAIN MENU",
      items: [
        { label: "Dashboard", path: "/admin", icon: "⌂" },
        { label: "Requests", path: "/admin/requests", icon: "▣" },
        { label: "Projects", path: "/admin/projects", icon: "◈" },
        { label: "Project Submissions", path: "/admin/submissions", icon: "📥" },
        { label: "Tasks", path: "/admin/tasks", icon: "✓" },
        { label: "Files", path: "/admin/files", icon: "▤" },
      ],
    },
    {
      label: "MANAGEMENT",
      items: [
        { label: "Managers", path: "/admin/managers", icon: "♙" },
        { label: "Users", path: "/admin/users", icon: "♙" },
        { label: "Services", path: "/admin/services", icon: "◆" },
        { label: "Permissions", path: "/admin/permissions", icon: "◉" },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        { label: "Activity Logs", path: "/admin/activity-logs", icon: "◷" },
        { label: "Settings", path: "/admin/settings", icon: "⚙" },
      ],
    },
  ];

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <span className="admin-status-badge badge-approved">Approved</span>;
      case "rejected":
        return <span className="admin-status-badge badge-rejected">Rejected</span>;
      case "changes_requested":
      case "changes requested":
        return <span className="admin-status-badge badge-changes">Changes Requested</span>;
      case "under_review":
      case "under review":
        return <span className="admin-status-badge badge-under-review">Under Review</span>;
      case "pending_review":
      case "pending review":
      default:
        return <span className="admin-status-badge badge-pending">Pending Review</span>;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getDistinctCategories = () => {
    const cats = new Set(
      submissions
        .map((s) => s.services?.name || s.service_category || "General")
        .filter(Boolean)
    );
    return Array.from(cats);
  };

  if (loading) {
    return (
      <div className="admin-sub-loading">
        <div className="admin-loading-spinner" />
        <p>Loading Project Submissions Pipeline...</p>
      </div>
    );
  }

  return (
    <DashboardLayout profile={profile} navigation={navigation} title="Review Project Submissions">
      <div className="admin-submissions-page">
        {/* Top Header */}
        <section className="submissions-header-panel">
          <div>
            <span className="submissions-pill">ADMIN QA & PORTFOLIO GOVERNANCE</span>
            <h1>Manager Project Submissions</h1>
            <p>
              Review deliverables submitted by managers, inspect uploaded project assets, provide feedback or approval,
              and choose whether to publish them into the Public Client Portfolio.
            </p>
          </div>
          <button className="submissions-refresh-btn" onClick={fetchSubmissions}>
            ↻ Refresh Submissions
          </button>
        </section>

        {/* Filter Toolbar */}
        <section className="submissions-filter-toolbar">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, client, or manager name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <div className="filter-item">
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Under Review">Under Review</option>
                <option value="Changes Requested">Changes Requested</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Category:</label>
              <select value={categoryFilter} onChange={(e) => handleCategoryFilterChange(e.target.value)}>
                <option value="all">All Categories</option>
                {getDistinctCategories().map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="submissions-empty">
            <div className="empty-icon">📭</div>
            <h3>No Project Submissions Found</h3>
            <p>
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "No submissions match your active filter criteria."
                : "Managers have not submitted any project deliverables for review yet."}
            </p>
          </div>
        ) : (
          <div className="submissions-cards-grid">
            {filteredSubmissions.map((sub) => (
              <div key={sub.id} className="submission-card">
                <div className="submission-card-header">
                  <div className="card-top-meta">
                    <span className="category-tag">
                      {sub.services?.name || sub.service_category || "General Service"}
                    </span>
                    {getStatusBadge(sub.status)}
                  </div>
                  <h3>{sub.title}</h3>
                  <div className="client-subtitle">
                    Client / Organization: <strong>{sub.client_name || "Internal / Confidential"}</strong>
                  </div>
                </div>

                <div className="submission-card-body">
                  <p className="submission-desc-snippet">
                    {sub.description?.length > 180 ? `${sub.description.substring(0, 180)}...` : sub.description}
                  </p>

                  <div className="meta-details-grid">
                    <div className="meta-item">
                      <span className="meta-label">Manager</span>
                      <span className="meta-val">
                        {sub.manager?.name || "Phoenix Manager"}
                        <small>({sub.manager?.email})</small>
                      </span>
                    </div>

                    <div className="meta-item">
                      <span className="meta-label">Submitted On</span>
                      <span className="meta-val">
                        {new Date(sub.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="meta-item">
                      <span className="meta-label">Public Portfolio</span>
                      <span className="meta-val">
                        {sub.status?.toLowerCase() === "approved" ? (
                          <button
                            className={`portfolio-toggle ${sub.is_published ? "is-live" : "is-hidden"}`}
                            onClick={() => handleTogglePublished(sub)}
                            title="Click to toggle public portfolio visibility"
                          >
                            {sub.is_published ? "🌐 Published Live" : "🔒 Hidden"}
                          </button>
                        ) : (
                          <span className="text-muted">Not Approved</span>
                        )}
                      </span>
                    </div>

                    <div className="meta-item">
                      <span className="meta-label">Attachments</span>
                      <span className="meta-val">
                        {sub.attachments?.length || 0} secure deliverable{sub.attachments?.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="submission-card-footer">
                  <button className="btn-review-inspect" onClick={() => handleOpenReview(sub, "approve")}>
                    🔍 Inspect & Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Inspection & Review Modal */}
        {selectedSub && (
          <div className="admin-modal-backdrop">
            <div className="admin-review-modal">
              <div className="modal-header">
                <div>
                  <span className="category-pill">
                    {selectedSub.services?.name || selectedSub.service_category || "General"}
                  </span>
                  <h2>{selectedSub.title}</h2>
                  <span className="sub-header-manager">
                    Submitted by: <strong>{selectedSub.manager?.name}</strong> ({selectedSub.manager?.email}) •{" "}
                    {new Date(selectedSub.created_at).toLocaleString()}
                  </span>
                </div>
                <button className="btn-close-modal" onClick={handleCloseReview}>
                  ✕
                </button>
              </div>

              <div className="modal-body-scroll">
                {actionMessage.text && (
                  <div className={`modal-alert ${actionMessage.type}`}>{actionMessage.text}</div>
                )}

                <div className="modal-section">
                  <h4>Project Description</h4>
                  <p className="modal-desc-text">{selectedSub.description || "No description provided."}</p>
                </div>

                <div className="modal-details-row">
                  <div>
                    <span className="detail-tag">Client / Company</span>
                    <strong>{selectedSub.client_name || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="detail-tag">Timeline</span>
                    <strong>
                      {selectedSub.start_date || "—"} to {selectedSub.completion_date || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="detail-tag">Tech Stack / Tools</span>
                    <div className="tech-tags-list">
                      {selectedSub.technologies
                        ? selectedSub.technologies.split(",").map((t, i) => (
                            <span key={i} className="tech-pill">
                              {t.trim()}
                            </span>
                          ))
                        : "—"}
                    </div>
                  </div>
                </div>

                {selectedSub.admin_notes_from_manager && (
                  <div className="modal-section notes-box">
                    <h4>Internal Manager Notes</h4>
                    <p>{selectedSub.admin_notes_from_manager}</p>
                  </div>
                )}

                {/* Attachments Section */}
                <div className="modal-section">
                  <h4>Uploaded Project Deliverables ({selectedSub.attachments?.length || 0})</h4>
                  {(!selectedSub.attachments || selectedSub.attachments.length === 0) ? (
                    <p className="text-muted">No deliverable files uploaded for this submission.</p>
                  ) : (
                    <div className="modal-attachments-list">
                      {selectedSub.attachments.map((att) => (
                        <div key={att.id} className="modal-attachment-item">
                          <div className="att-info">
                            <span className="att-icon">📁</span>
                            <div>
                              <strong>{att.file_name}</strong>
                              <span>
                                {formatFileSize(att.file_size)} • {att.file_type || "File"}
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn-download-att"
                            disabled={downloadingId === att.id}
                            onClick={() => handleDownloadAttachment(att)}
                          >
                            {downloadingId === att.id ? "Generating Link..." : "Download File ⤓"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review History */}
                {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                  <div className="modal-section">
                    <h4>Previous Review History</h4>
                    <div className="review-history-list">
                      {selectedSub.reviews.map((rev) => (
                        <div key={rev.id} className="history-item">
                          <div className="history-header">
                            {getStatusBadge(rev.status)}
                            <span className="history-date">
                              by {rev.reviewer?.name || "Admin"} on {new Date(rev.created_at).toLocaleString()}
                            </span>
                          </div>
                          {rev.notes && <p className="history-notes">"{rev.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decision Form */}
                <div className="modal-section decision-form-panel">
                  <h4>Admin Review Decision</h4>

                  <div className="decision-tabs">
                    <button
                      type="button"
                      className={`tab-btn ${actionType === "approve" ? "active approve" : ""}`}
                      onClick={() => setActionType("approve")}
                    >
                      ✓ Approve Submission
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${actionType === "request_changes" ? "active changes" : ""}`}
                      onClick={() => setActionType("request_changes")}
                    >
                      ✎ Request Changes
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${actionType === "reject" ? "active reject" : ""}`}
                      onClick={() => setActionType("reject")}
                    >
                      ✕ Reject Submission
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${actionType === "under_review" ? "active review" : ""}`}
                      onClick={() => setActionType("under_review")}
                    >
                      ⏳ Mark Under Review
                    </button>
                  </div>

                  {actionType === "approve" && (
                    <div className="publish-checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={isPublished}
                          onChange={(e) => setIsPublished(e.target.checked)}
                        />
                        <span>
                          <strong>Publish to Public Customer Portfolio:</strong> Allow prospective clients and public
                          website visitors to view this project's title, description, and preview image without login.
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="decision-notes-input">
                    <label>
                      {actionType === "approve"
                        ? "Approval Notes / Comments (Optional)"
                        : "Reason / Feedback for Manager (Required for rejection or changes)"}
                    </label>
                    <textarea
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder={
                        actionType === "approve"
                          ? "Add any feedback or praise for this deliverable..."
                          : "Explain specifically what needs to be revised or reason for rejection..."
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={handleCloseReview} disabled={submittingReview}>
                  Cancel
                </button>
                <button
                  className={`btn-confirm-decision ${actionType}`}
                  onClick={handleProcessDecision}
                  disabled={submittingReview}
                >
                  {submittingReview
                    ? "Recording Decision..."
                    : actionType === "approve"
                    ? "Confirm Approval"
                    : actionType === "reject"
                    ? "Confirm Rejection"
                    : actionType === "request_changes"
                    ? "Send Change Request"
                    : "Save Status"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminSubmissions;
