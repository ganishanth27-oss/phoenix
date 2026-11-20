import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./AdminProofVerification.css";

function AdminProofVerification() {
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [verifyingId, setVerifyingId] = useState(null);

  // Review modal state
  const [reviewAction, setReviewAction] = useState("approve");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadProofs();
  }, [filterStatus]);

  const loadProofs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const query = filterStatus === "all" ? "" : `?status=${filterStatus}`;
      const res = await fetch(`/api/admin/payment-proofs${query}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const json = await res.json();
      if (json.success) {
        setProofs(json.proofs || []);
      }
    } catch (e) {
      console.error("Failed to load payment proofs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (proof, defaultAction = "approve") => {
    setSelectedProof(proof);
    setReviewAction(defaultAction);
    setAdminRemarks("");
    setRejectionReason("");
  };

  const handleExecuteVerification = async (e) => {
    e.preventDefault();
    if (!selectedProof) return;

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      alert("Please enter a specific rejection reason.");
      return;
    }

    setVerifyingId(selectedProof.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/payment-proofs/${selectedProof.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action: reviewAction,
          admin_remarks: adminRemarks,
          rejection_reason: rejectionReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to verify payment proof.");
      }

      alert(json.message);
      setSelectedProof(null);
      await loadProofs();
    } catch (err) {
      alert("Verification error: " + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  // Metrics
  const totalCount = proofs.length;
  const pendingCount = proofs.filter((p) => p.verification_status === "pending_verification").length;
  const approvedCount = proofs.filter((p) => p.verification_status === "approved").length;
  const rejectedCount = proofs.filter((p) => p.verification_status === "rejected").length;
  const totalVerifiedAmount = proofs
    .filter((p) => p.verification_status === "approved")
    .reduce((sum, p) => sum + Number(p.amount_claimed || 0), 0);

  const navigation = [
    {
      label: "MAIN MENU",
      items: [
        { label: "Dashboard Overview", path: "/admin", icon: "⌂" },
        { label: "User Requests", path: "/admin/requests", icon: "▣" },
        { label: "Project Management", path: "/admin/projects", icon: "◈" },
        { label: "Submissions", path: "/admin/submissions", icon: "📥" },
        { label: "Tasks", path: "/admin/tasks", icon: "✓" },
      ],
    },
    {
      label: "FINANCIAL & PAYMENTS",
      items: [
        { label: "Payment Overview", path: "/admin/payments", icon: "💳" },
        { label: "QR Code Management", path: "/admin/qr-settings", icon: "📱" },
        { label: "Payment Proof Verification", path: "/admin/proofs", icon: "🛡️" },
        { label: "Invoices & Receipts", path: "/admin/invoices", icon: "📄" },
        { label: "Financial Reports", path: "/admin/reports", icon: "📊" },
      ],
    },
    {
      label: "ADMINISTRATION",
      items: [
        { label: "Customer Management", path: "/admin/users", icon: "👥" },
        { label: "Manager Management", path: "/admin/managers", icon: "♙" },
        { label: "Services Management", path: "/admin/services", icon: "⚙" },
        { label: "Activity Logs", path: "/admin/logs", icon: "📜" },
        { label: "Settings", path: "/admin/settings", icon: "⚙" },
      ],
    },
  ];

  return (
    <DashboardLayout title="Payment Proof Verification" navigation={navigation}>
      <div className="admin-proofs-page">
        {/* Header */}
        <div className="proofs-page-header">
          <div>
            <span className="proofs-badge">AUDIT & COMPLIANCE</span>
            <h1>Customer Payment Proof Verification</h1>
            <p>
              Inspect customer-submitted payment screenshots and UTR transaction numbers against bank statements before confirming revenue.
            </p>
          </div>

          <button className="refresh-btn" onClick={loadProofs} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh Submissions"}
          </button>
        </div>

        {/* 5 Summary Cards */}
        <div className="proofs-summary-grid">
          <div className="summary-box">
            <span>Total Proofs</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="summary-box">
            <span>Pending Verification</span>
            <strong className="val-cyan">{pendingCount}</strong>
          </div>
          <div className="summary-box">
            <span>Approved Payments</span>
            <strong className="val-green">{approvedCount}</strong>
          </div>
          <div className="summary-box">
            <span>Rejected Submissions</span>
            <strong className="val-red">{rejectedCount}</strong>
          </div>
          <div className="summary-box">
            <span>Total Verified Amount</span>
            <strong className="val-gold">₹{totalVerifiedAmount.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        {/* Filters */}
        <div className="proofs-filter-bar">
          <button
            className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All Submissions ({totalCount})
          </button>
          <button
            className={`filter-btn ${filterStatus === "pending_verification" ? "active" : ""}`}
            onClick={() => setFilterStatus("pending_verification")}
          >
            Pending Verification ({pendingCount})
          </button>
          <button
            className={`filter-btn ${filterStatus === "approved" ? "active" : ""}`}
            onClick={() => setFilterStatus("approved")}
          >
            Approved ({approvedCount})
          </button>
          <button
            className={`filter-btn ${filterStatus === "rejected" ? "active" : ""}`}
            onClick={() => setFilterStatus("rejected")}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        {/* Proofs Table */}
        <div className="proofs-table-card">
          {loading ? (
            <div className="proofs-empty">Loading submitted payment proofs...</div>
          ) : proofs.length === 0 ? (
            <div className="proofs-empty">
              <span className="empty-icon">✓</span>
              <h3>No payment proofs found</h3>
              <p>When customers upload UPI payment screenshots, they appear here for verification.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="proofs-table">
                <thead>
                  <tr>
                    <th>Proof ID & Date</th>
                    <th>Customer Name</th>
                    <th>Project</th>
                    <th>Amount Claimed</th>
                    <th>Method & UTR</th>
                    <th>Screenshot</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proofs.map((proof) => {
                    return (
                      <tr key={proof.id}>
                        <td>
                          <strong>{proof.id}</strong>
                          <span className="tbl-sub">
                            {new Date(proof.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <strong>{proof.customer_name || "Customer"}</strong>
                          <span className="tbl-sub">{proof.customer_email}</span>
                        </td>
                        <td>{proof.project_name || "Project"}</td>
                        <td>
                          <strong className="amt-claimed-val">
                            ₹{Number(proof.amount_claimed || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span className="method-pill">{proof.payment_method}</span>
                          <span className="utr-code">{proof.transaction_ref_id}</span>
                        </td>
                        <td>
                          {proof.screenshot_url ? (
                            <a
                              href={proof.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="view-screenshot-link"
                            >
                              View Image ↗
                            </a>
                          ) : (
                            <span className="tbl-sub">No image</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill pill-${proof.verification_status}`}>
                            {proof.verification_status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {proof.verification_status === "approved" ? (
                            <span className="approved-check">✓ Verified</span>
                          ) : (
                            <button
                              className="review-btn"
                              onClick={() => handleOpenReview(proof)}
                            >
                              Review Proof
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verification Review Modal */}
        {selectedProof && (
          <div className="review-modal-backdrop" onClick={() => setSelectedProof(null)}>
            <div className="review-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title-row">
                <div>
                  <h3>Verify Payment Screenshot</h3>
                  <p>Proof ID: {selectedProof.id} • UTR: {selectedProof.transaction_ref_id}</p>
                </div>
                <button className="modal-close" onClick={() => setSelectedProof(null)}>
                  ✕
                </button>
              </div>

              {/* Screenshot Preview */}
              <div className="modal-screenshot-view">
                <img
                  src={selectedProof.screenshot_url}
                  alt="Customer Payment Screenshot"
                  className="full-proof-img"
                />
              </div>

              <div className="review-meta-grid">
                <div>
                  <span>Customer</span>
                  <strong>{selectedProof.customer_name}</strong>
                </div>
                <div>
                  <span>Claimed Amount</span>
                  <strong className="amt-highlight">
                    ₹{Number(selectedProof.amount_claimed || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
                <div>
                  <span>Payment Date</span>
                  <strong>{selectedProof.payment_date}</strong>
                </div>
                <div>
                  <span>Transaction UTR</span>
                  <strong className="utr-highlight">{selectedProof.transaction_ref_id}</strong>
                </div>
              </div>

              {selectedProof.customer_notes && (
                <div className="customer-notes-callout">
                  <strong>Customer Notes:</strong>
                  <p>{selectedProof.customer_notes}</p>
                </div>
              )}

              <form onSubmit={handleExecuteVerification} className="review-form">
                <div className="action-toggle-row">
                  <label className={`toggle-option ${reviewAction === "approve" ? "sel-approve" : ""}`}>
                    <input
                      type="radio"
                      name="reviewAction"
                      value="approve"
                      checked={reviewAction === "approve"}
                      onChange={() => setReviewAction("approve")}
                    />
                    Approve Payment (Confirm Bank Receipt)
                  </label>

                  <label className={`toggle-option ${reviewAction === "reject" ? "sel-reject" : ""}`}>
                    <input
                      type="radio"
                      name="reviewAction"
                      value="reject"
                      checked={reviewAction === "reject"}
                      onChange={() => setReviewAction("reject")}
                    />
                    Reject Payment Proof
                  </label>
                </div>

                {reviewAction === "reject" && (
                  <div className="form-group">
                    <label>Rejection Reason (Required) <span className="req-star">*</span></label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    >
                      <option value="">Select a reason...</option>
                      <option value="Screenshot unclear or unreadable">Screenshot unclear or unreadable</option>
                      <option value="Incorrect payment amount">Incorrect payment amount</option>
                      <option value="Invalid transaction reference / UTR not found in bank statement">Invalid transaction reference / UTR not found in bank statement</option>
                      <option value="Payment not found in company account">Payment not found in company account</option>
                      <option value="Duplicate submission of previous transaction">Duplicate submission of previous transaction</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Admin Internal Remarks</label>
                  <input
                    type="text"
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="e.g. Verified with ICICI bank current account statement at 14:30."
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setSelectedProof(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`modal-confirm-btn ${reviewAction}`}
                    disabled={verifyingId !== null}
                  >
                    {verifyingId
                      ? "Processing..."
                      : reviewAction === "approve"
                      ? "Approve & Issue Official Receipt"
                      : "Confirm Rejection"}
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

export default AdminProofVerification;
