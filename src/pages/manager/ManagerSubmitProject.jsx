import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./ManagerSubmitProject.css";

/* =====================================================
   CONSTANTS
===================================================== */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200 MB total
const MAX_FILES = 20;

const SUBMISSION_STATUSES = {
  pending_review: { label: "Pending Review", color: "#f59e0b" },
  under_review: { label: "Under Review", color: "#3b82f6" },
  changes_requested: { label: "Changes Requested", color: "#ef4444" },
  approved: { label: "Approved", color: "#10b981" },
  rejected: { label: "Rejected", color: "#dc2626" },
};

/* =====================================================
   COMPONENT
===================================================== */

function ManagerSubmitProject() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const [services, setServices] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  /* Form state */
  const [form, setForm] = useState({
    title: "",
    description: "",
    client_name: "",
    service_id: "",
    start_date: "",
    completion_date: "",
    technologies: "",
    admin_notes_from_manager: "",
  });

  const [files, setFiles] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  /* Submission detail view */
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviews, setReviews] = useState([]);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      // Load services
      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      setServices(serviceData || []);

      // Load own submissions
      const { data: submissionData, error: subError } = await supabase
        .from("project_submissions")
        .select(`
          id, title, description, client_name, service_id,
          start_date, completion_date, technologies,
          admin_notes_from_manager, thumbnail_path,
          status, is_published, created_at, updated_at,
          services:service_id ( name )
        `)
        .eq("manager_id", user.id)
        .order("created_at", { ascending: false });

      if (subError) throw subError;
      setSubmissions(submissionData || []);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FORM HANDLERS
  ===================================================== */

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      client_name: "",
      service_id: "",
      start_date: "",
      completion_date: "",
      technologies: "",
      admin_notes_from_manager: "",
    });
    setFiles([]);
    setThumbnailFile(null);
    setFormError("");
    setSuccessMessage("");
  };

  /* =====================================================
     FILE HANDLING
  ===================================================== */

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds the ${formatFileSize(MAX_FILE_SIZE)} limit.`;
    }
    return null;
  };

  const addFiles = (newFiles) => {
    const fileList = Array.from(newFiles);
    const errors = [];

    const currentCount = files.length;
    if (currentCount + fileList.length > MAX_FILES) {
      setFormError(`Maximum ${MAX_FILES} files allowed. You have ${currentCount} selected.`);
      return;
    }

    const currentTotalSize = files.reduce((sum, f) => sum + f.file.size, 0);
    let addedSize = 0;

    const validFiles = [];
    for (const file of fileList) {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
        continue;
      }
      if (currentTotalSize + addedSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`Adding "${file.name}" would exceed the total upload limit of ${formatFileSize(MAX_TOTAL_SIZE)}.`);
        continue;
      }

      // Prevent duplicates
      const alreadyAdded = files.some(
        (f) => f.file.name === file.name && f.file.size === file.size
      );
      if (alreadyAdded) continue;

      addedSize += file.size;
      validFiles.push({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending", // pending | uploading | success | error
        error: null,
        storagePath: null,
      });
    }

    if (errors.length > 0) {
      setFormError(errors.join(" "));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const retryFile = (fileId) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: "pending", error: null, progress: 0 }
          : f
      )
    );
  };

  /* Drag & Drop */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Thumbnail must be an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Thumbnail must be under 5 MB.");
      return;
    }
    setThumbnailFile(file);
    setFormError("");
  };

  /* =====================================================
     SANITIZE FILENAME
  ===================================================== */

  const sanitizeFilename = (name) => {
    return name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 200);
  };

  /* =====================================================
     SUBMIT PROJECT
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    // Validate
    if (!form.title.trim()) {
      setFormError("Project title is required.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Project description is required.");
      return;
    }
    if (form.start_date && form.completion_date && form.completion_date < form.start_date) {
      setFormError("Completion date cannot be before start date.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      /* 1. Upload thumbnail if provided */
      let thumbnailPath = null;
      if (thumbnailFile) {
        const thumbName = `${user.id}/thumbnails/${Date.now()}_${sanitizeFilename(thumbnailFile.name)}`;
        const { error: thumbError } = await supabase.storage
          .from("project-files")
          .upload(thumbName, thumbnailFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (thumbError) throw new Error(`Thumbnail upload failed: ${thumbError.message}`);
        thumbnailPath = thumbName;
      }

      /* 2. Create submission record */
      const { data: submission, error: subError } = await supabase
        .from("project_submissions")
        .insert({
          manager_id: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          client_name: form.client_name.trim() || null,
          service_id: form.service_id || null,
          start_date: form.start_date || null,
          completion_date: form.completion_date || null,
          technologies: form.technologies.trim() || null,
          admin_notes_from_manager: form.admin_notes_from_manager.trim() || null,
          thumbnail_path: thumbnailPath,
          status: "pending_review",
        })
        .select("id, title, status, created_at")
        .single();

      if (subError) throw subError;

      /* 3. Upload files */
      const uploadResults = [];

      for (let i = 0; i < files.length; i++) {
        const fileEntry = files[i];

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id
              ? { ...f, status: "uploading", progress: 10 }
              : f
          )
        );

        try {
          const safeName = sanitizeFilename(fileEntry.file.name);
          const storagePath = `${user.id}/submissions/${submission.id}/${Date.now()}_${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("project-files")
            .upload(storagePath, fileEntry.file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Record attachment in DB
          const { error: attachError } = await supabase
            .from("project_attachments")
            .insert({
              submission_id: submission.id,
              manager_id: user.id,
              file_name: fileEntry.file.name,
              file_path: storagePath,
              file_size: fileEntry.file.size,
              content_type: fileEntry.file.type || "application/octet-stream",
            });

          if (attachError) {
            console.warn("Attachment record error:", attachError.message);
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, status: "success", progress: 100, storagePath }
                : f
            )
          );

          uploadResults.push({ success: true });
        } catch (uploadErr) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, status: "error", error: uploadErr.message, progress: 0 }
                : f
            )
          );
          uploadResults.push({ success: false, error: uploadErr.message });
        }
      }

      /* 4. Activity log */
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "submit_project",
        description: `Submitted project "${submission.title}" for admin review.`,
      });

      const failedUploads = uploadResults.filter((r) => !r.success);

      if (failedUploads.length > 0) {
        setSuccessMessage(
          `Project submitted successfully! However, ${failedUploads.length} file(s) failed to upload. You can retry them.`
        );
      } else {
        setSuccessMessage("Project submitted successfully! It is now pending admin review.");
        setTimeout(() => {
          resetForm();
          setShowForm(false);
          loadData();
        }, 2000);
      }

      loadData();
    } catch (error) {
      console.error("Submit error:", error);
      setFormError(error.message || "Failed to submit project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     VIEW SUBMISSION DETAILS
  ===================================================== */

  const viewSubmission = async (sub) => {
    setSelectedSubmission(sub);

    try {
      const { data: reviewData } = await supabase
        .from("submission_reviews")
        .select(`
          id, action, previous_status, new_status,
          reason, created_at,
          reviewer:reviewer_id ( name )
        `)
        .eq("submission_id", sub.id)
        .order("created_at", { ascending: false });

      setReviews(reviewData || []);
    } catch (err) {
      console.error("Reviews load error:", err);
    }
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const navigation = [
    {
      label: "WORKSPACE",
      items: [
        { label: "Dashboard", path: "/manager", icon: "⌂" },
        { label: "Requests", path: "/manager/requests", icon: "▣" },
        { label: "Users", path: "/manager/users", icon: "♙" },
        { label: "Projects", path: "/manager/projects", icon: "◈" },
        { label: "Submit Project", path: "/manager/submit-project", icon: "📤" },
        { label: "Tasks", path: "/manager/tasks", icon: "✓" },
        { label: "Files", path: "/manager/files", icon: "▤" },
        { label: "Review Work", path: "/manager/review", icon: "◉" },
        { label: "Reports", path: "/manager/reports", icon: "▥" },
      ],
    },
  ];

  /* =====================================================
     FORMAT HELPERS
  ===================================================== */

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const totalUploadSize = files.reduce((sum, f) => sum + f.file.size, 0);

  /* =====================================================
     RENDER
  ===================================================== */

  if (loading) {
    return (
      <div className="msp-loading">
        <div className="msp-loader" />
        <p>Loading submissions...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={null}
      navigation={navigation}
      title="Submit Project"
    >
      <div className="msp-page">

        {/* HEADER */}
        <section className="msp-header">
          <div>
            <span className="msp-eyebrow">WORKSPACE / SUBMIT PROJECT</span>
            <h1>Project Submissions</h1>
            <p>Submit projects for admin review and track your submissions.</p>
          </div>
          <div className="msp-header-actions">
            <button className="msp-refresh" onClick={loadData}>
              <span>↻</span> Refresh
            </button>
            <button
              className="msp-submit-btn"
              onClick={() => { setShowForm(true); setSuccessMessage(""); }}
            >
              <span>+</span> Submit New Project
            </button>
          </div>
        </section>

        {/* STATS */}
        <section className="msp-stats">
          {Object.entries(SUBMISSION_STATUSES).map(([key, val]) => {
            const count = submissions.filter((s) => s.status === key).length;
            return (
              <div className="msp-stat-card" key={key}>
                <div className="msp-stat-dot" style={{ background: val.color }} />
                <div>
                  <span className="msp-stat-label">{val.label}</span>
                  <strong>{count}</strong>
                </div>
              </div>
            );
          })}
        </section>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="msp-success-banner">
            <span>✓</span>
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage("")}>×</button>
          </div>
        )}

        {/* =====================================================
            SUBMIT NEW PROJECT FORM
        ===================================================== */}

        {showForm && (
          <section className="msp-form-card">
            <div className="msp-form-header">
              <div>
                <span className="msp-form-eyebrow">NEW SUBMISSION</span>
                <h2>Submit Project for Review</h2>
                <p>Fill in the project details and upload deliverables for admin review.</p>
              </div>
              <button
                className="msp-form-close"
                onClick={() => { if (!submitting) { setShowForm(false); resetForm(); } }}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="msp-error-banner">
                <span>⚠️</span>
                <p>{formError}</p>
              </div>
            )}

            <form className="msp-form" onSubmit={handleSubmit}>
              <div className="msp-form-grid">
                {/* Title */}
                <div className="msp-field">
                  <label htmlFor="sub-title">Project Title *</label>
                  <input
                    id="sub-title" type="text" name="title"
                    value={form.title} onChange={handleFormChange}
                    placeholder="Enter project title"
                    required disabled={submitting}
                  />
                </div>

                {/* Client Name */}
                <div className="msp-field">
                  <label htmlFor="sub-client">Client / Company Name</label>
                  <input
                    id="sub-client" type="text" name="client_name"
                    value={form.client_name} onChange={handleFormChange}
                    placeholder="Client or company name"
                    disabled={submitting}
                  />
                </div>

                {/* Service */}
                <div className="msp-field">
                  <label htmlFor="sub-service">Service Category</label>
                  <select
                    id="sub-service" name="service_id"
                    value={form.service_id} onChange={handleFormChange}
                    disabled={submitting}
                  >
                    <option value="">Select a service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Technologies */}
                <div className="msp-field">
                  <label htmlFor="sub-tech">Technologies / Tools Used</label>
                  <input
                    id="sub-tech" type="text" name="technologies"
                    value={form.technologies} onChange={handleFormChange}
                    placeholder="React, Node.js, Figma..."
                    disabled={submitting}
                  />
                </div>

                {/* Start Date */}
                <div className="msp-field">
                  <label htmlFor="sub-start">Start Date</label>
                  <input
                    id="sub-start" type="date" name="start_date"
                    value={form.start_date} onChange={handleFormChange}
                    disabled={submitting}
                  />
                </div>

                {/* Completion Date */}
                <div className="msp-field">
                  <label htmlFor="sub-end">Completion Date</label>
                  <input
                    id="sub-end" type="date" name="completion_date"
                    value={form.completion_date} onChange={handleFormChange}
                    min={form.start_date || undefined}
                    disabled={submitting}
                  />
                </div>

                {/* Description */}
                <div className="msp-field msp-field-full">
                  <label htmlFor="sub-desc">Project Description *</label>
                  <textarea
                    id="sub-desc" name="description"
                    value={form.description} onChange={handleFormChange}
                    placeholder="Describe the project, deliverables, and outcomes..."
                    rows="5" required disabled={submitting}
                  />
                </div>

                {/* Admin Notes */}
                <div className="msp-field msp-field-full">
                  <label htmlFor="sub-notes">Notes for Admin</label>
                  <textarea
                    id="sub-notes" name="admin_notes_from_manager"
                    value={form.admin_notes_from_manager} onChange={handleFormChange}
                    placeholder="Any additional notes or context for the admin reviewer..."
                    rows="3" disabled={submitting}
                  />
                </div>
              </div>

              {/* Thumbnail */}
              <div className="msp-thumbnail-section">
                <label>Project Thumbnail / Cover Image</label>
                <div className="msp-thumbnail-row">
                  <input
                    type="file" accept="image/*"
                    onChange={handleThumbnailSelect}
                    disabled={submitting}
                  />
                  {thumbnailFile && (
                    <div className="msp-thumb-preview">
                      <img src={URL.createObjectURL(thumbnailFile)} alt="Thumbnail" />
                      <span>{thumbnailFile.name}</span>
                      <button type="button" onClick={() => setThumbnailFile(null)}>×</button>
                    </div>
                  )}
                </div>
              </div>

              {/* File Upload Area */}
              <div className="msp-upload-section">
                <label>Project Files & Deliverables</label>
                <p className="msp-upload-limits">
                  Max {formatFileSize(MAX_FILE_SIZE)} per file · {formatFileSize(MAX_TOTAL_SIZE)} total · Up to {MAX_FILES} files
                </p>

                <div
                  ref={dropZoneRef}
                  className={`msp-dropzone ${dragActive ? "msp-dropzone-active" : ""}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="msp-dropzone-icon">📁</div>
                  <p><strong>Drag & drop files here</strong> or click to browse</p>
                  <p className="msp-dropzone-hint">
                    PDF, DOC, PPT, XLS, ZIP, images, videos, source code, and more
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file" multiple
                    onChange={handleFileInput}
                    style={{ display: "none" }}
                    disabled={submitting}
                  />
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="msp-file-list">
                    <div className="msp-file-list-header">
                      <span>{files.length} file(s) selected</span>
                      <span>{formatFileSize(totalUploadSize)} total</span>
                    </div>
                    {files.map((f) => (
                      <div key={f.id} className={`msp-file-item msp-file-${f.status}`}>
                        <div className="msp-file-info">
                          <span className="msp-file-icon">
                            {f.status === "success" ? "✓" :
                             f.status === "error" ? "⚠" :
                             f.status === "uploading" ? "⟳" : "📄"}
                          </span>
                          <div className="msp-file-details">
                            <span className="msp-file-name">{f.file.name}</span>
                            <span className="msp-file-size">{formatFileSize(f.file.size)}</span>
                          </div>
                        </div>
                        <div className="msp-file-actions">
                          {f.status === "error" && (
                            <button
                              type="button"
                              className="msp-file-retry"
                              onClick={() => retryFile(f.id)}
                            >
                              Retry
                            </button>
                          )}
                          {f.error && (
                            <span className="msp-file-error-text">{f.error}</span>
                          )}
                          {f.status !== "uploading" && (
                            <button
                              type="button"
                              className="msp-file-remove"
                              onClick={() => removeFile(f.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {f.status === "uploading" && (
                          <div className="msp-progress-bar">
                            <div
                              className="msp-progress-fill"
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="msp-form-actions">
                <button
                  type="button" className="msp-cancel-btn"
                  onClick={() => { if (!submitting) { setShowForm(false); resetForm(); } }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="msp-submit-project-btn" disabled={submitting}>
                  {submitting ? (
                    <><span className="msp-spinner" /> Submitting...</>
                  ) : (
                    <>📤 Submit Project</>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =====================================================
            SUBMISSION DETAIL VIEW
        ===================================================== */}

        {selectedSubmission && (
          <section className="msp-detail-card">
            <div className="msp-detail-header">
              <div>
                <span className="msp-form-eyebrow">SUBMISSION DETAILS</span>
                <h2>{selectedSubmission.title}</h2>
                <div className="msp-detail-meta">
                  <span
                    className="msp-status-badge"
                    style={{
                      background: SUBMISSION_STATUSES[selectedSubmission.status]?.color || "#999",
                    }}
                  >
                    {SUBMISSION_STATUSES[selectedSubmission.status]?.label || selectedSubmission.status}
                  </span>
                  <span>Submitted {formatDate(selectedSubmission.created_at)}</span>
                  {selectedSubmission.is_published && (
                    <span className="msp-published-badge">🌐 Published</span>
                  )}
                </div>
              </div>
              <button className="msp-form-close" onClick={() => setSelectedSubmission(null)}>×</button>
            </div>

            <div className="msp-detail-body">
              {selectedSubmission.description && (
                <div className="msp-detail-section">
                  <h4>Description</h4>
                  <p>{selectedSubmission.description}</p>
                </div>
              )}
              <div className="msp-detail-grid">
                <div><span>Service</span><strong>{selectedSubmission.services?.name || "—"}</strong></div>
                <div><span>Client</span><strong>{selectedSubmission.client_name || "—"}</strong></div>
                <div><span>Start Date</span><strong>{formatDate(selectedSubmission.start_date)}</strong></div>
                <div><span>Completion</span><strong>{formatDate(selectedSubmission.completion_date)}</strong></div>
                <div><span>Technologies</span><strong>{selectedSubmission.technologies || "—"}</strong></div>
              </div>

              {/* Review History */}
              {reviews.length > 0 && (
                <div className="msp-detail-section">
                  <h4>Review History</h4>
                  <div className="msp-review-timeline">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="msp-review-item">
                        <div className="msp-review-dot" />
                        <div className="msp-review-content">
                          <div className="msp-review-action">
                            <strong>{rev.action?.replace(/_/g, " ")}</strong>
                            <span>by {rev.reviewer?.name || "Admin"}</span>
                            <span className="msp-review-date">{formatDate(rev.created_at)}</span>
                          </div>
                          {rev.reason && <p className="msp-review-reason">{rev.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            SUBMISSIONS LIST
        ===================================================== */}

        <section className="msp-list-section">
          <div className="msp-list-header">
            <h2>Your Submissions</h2>
            <span className="msp-count">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</span>
          </div>

          {submissions.length === 0 ? (
            <div className="msp-empty">
              <div className="msp-empty-icon">📤</div>
              <h3>No Submissions Yet</h3>
              <p>Submit your first project for admin review.</p>
              <button
                className="msp-submit-btn"
                onClick={() => setShowForm(true)}
              >
                + Submit New Project
              </button>
            </div>
          ) : (
            <div className="msp-list">
              {submissions.map((sub) => (
                <article key={sub.id} className="msp-list-card" onClick={() => viewSubmission(sub)}>
                  <div className="msp-list-card-top">
                    <div>
                      <span className="msp-list-service">{sub.services?.name || "General"}</span>
                      <h3>{sub.title}</h3>
                      <p className="msp-list-date">
                        Submitted {formatDate(sub.created_at)}
                        {sub.client_name && ` · ${sub.client_name}`}
                      </p>
                    </div>
                    <span
                      className="msp-status-badge"
                      style={{
                        background: SUBMISSION_STATUSES[sub.status]?.color || "#999",
                      }}
                    >
                      {SUBMISSION_STATUSES[sub.status]?.label || sub.status}
                    </span>
                  </div>
                  {sub.description && (
                    <p className="msp-list-desc">
                      {sub.description.length > 150
                        ? sub.description.substring(0, 150) + "..."
                        : sub.description}
                    </p>
                  )}
                  {sub.is_published && (
                    <span className="msp-published-inline">🌐 Published in Portfolio</span>
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

export default ManagerSubmitProject;
