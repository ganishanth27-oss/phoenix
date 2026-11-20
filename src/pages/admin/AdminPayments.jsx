import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./AdminPayments.css";

function AdminPayments() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [metrics, setMetrics] = useState({
    totalProjectValue: 0,
    totalAdvanceAssigned: 0,
    totalPaymentsReceived: 0,
    outstandingAmount: 0,
  });

  const [savingId, setSavingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  // Modal edit financial state
  const [financialForm, setFinancialForm] = useState({
    total_cost: "",
    advance_assigned: "",
    advance_due_date: "",
    payment_instructions: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Fetch overview metrics
      const ovRes = await fetch("/api/admin/financials/overview", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const ovJson = await ovRes.json();
      if (ovJson.success) {
        setMetrics(ovJson.metrics);
      }

      // 2. Fetch projects with services and assigned managers
      const { data: projList } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          status,
          priority,
          due_date,
          created_at,
          services:service_id(name),
          manager:manager_id(name, email)
        `)
        .order("created_at", { ascending: false });

      // 3. For each project, fetch its financial info
      const enriched = await Promise.all(
        (projList || []).map(async (p) => {
          try {
            const fRes = await fetch(`/api/projects/${p.id}/financials`, {
              headers: { Authorization: `Bearer ${session?.access_token || ""}` },
            });
            const fJson = await fRes.json();
            return {
              ...p,
              financials: fJson.financials || {
                total_cost: 0,
                advance_assigned: 0,
                advance_status: "not_assigned",
                verified_paid: 0,
                remaining_balance: 0,
              },
            };
          } catch {
            return { ...p, financials: {} };
          }
        })
      );

      setProjects(enriched);
    } catch (e) {
      console.error("Failed to load payments data:", e);
    } finally {
      setLoading(false);
    }
  };

  const openFinancialModal = (proj) => {
    setSelectedProject(proj);
    setFinancialForm({
      total_cost: proj.financials?.total_cost || "",
      advance_assigned: proj.financials?.advance_assigned || "",
      advance_due_date: proj.financials?.advance_due_date || "",
      payment_instructions: proj.financials?.payment_instructions || "",
    });
  };

  const handleSaveFinancials = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSavingId(selectedProject.id);
    setStatusMsg({ text: "", type: "" });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/admin/projects/${selectedProject.id}/financials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify(financialForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update project financials.");
      }

      setStatusMsg({
        text: `Financial schedule updated for "${selectedProject.name}".`,
        type: "success",
      });
      setSelectedProject(null);
      await loadData();
    } catch (err) {
      setStatusMsg({ text: err.message, type: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const handleReviewManagerProposal = async (projId, action) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/projects/${projId}/review-final-amount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message);
      }
      alert(json.message);
      await loadData();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

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
    <DashboardLayout title="Payment & Advance Management" navigation={navigation}>
      <div className="admin-payments-page">
        {/* Header */}
        <div className="admin-payments-header">
          <div>
            <span className="pay-badge">ENTERPRISE TREASURY</span>
            <h1>Project Advance & Payment Management</h1>
            <p>
              Assign advance amounts, manage project costs, review manager final amount proposals, and track verified customer payments.
            </p>
          </div>

          <button className="refresh-btn" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh Ledger"}
          </button>
        </div>

        {statusMsg.text && (
          <div className={`pay-alert ${statusMsg.type}`}>
            {statusMsg.type === "success" ? "✓" : "⚠"} {statusMsg.text}
          </div>
        )}

        {/* 4 Summary Metric Cards */}
        <div className="payments-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Total Project Value</span>
            <strong className="val-white">
              ₹{Number(metrics.totalProjectValue || 0).toLocaleString("en-IN")}
            </strong>
            <span className="metric-sub">Across all enterprise projects</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Advance Assigned</span>
            <strong className="val-cyan">
              ₹{Number(metrics.totalAdvanceAssigned || 0).toLocaleString("en-IN")}
            </strong>
            <span className="metric-sub">Upfront commitment</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Verified Payments Received</span>
            <strong className="val-green">
              ₹{Number(metrics.totalPaymentsReceived || 0).toLocaleString("en-IN")}
            </strong>
            <span className="metric-sub">Confirmed bank/UPI funds</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Outstanding Balance</span>
            <strong className="val-gold">
              ₹{Number(metrics.outstandingAmount || 0).toLocaleString("en-IN")}
            </strong>
            <span className="metric-sub">Remaining to be collected</span>
          </div>
        </div>

        {/* Projects Financials Ledger Table */}
        <div className="payments-table-card">
          <div className="table-header-row">
            <h2>Project Financial Ledger</h2>
            <span>{projects.length} Projects Total</span>
          </div>

          {loading ? (
            <div className="pay-empty-state">Loading financial ledger...</div>
          ) : projects.length === 0 ? (
            <div className="pay-empty-state">No projects found. Create projects under Project Management.</div>
          ) : (
            <div className="table-scroll">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Manager</th>
                    <th>Total Cost</th>
                    <th>Advance Assigned</th>
                    <th>Verified Paid</th>
                    <th>Remaining Balance</th>
                    <th>Advance Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => {
                    const fin = proj.financials || {};
                    const hasProposal = fin.manager_proposal_status === "pending_approval";

                    return (
                      <tr key={proj.id}>
                        <td>
                          <strong>{proj.name}</strong>
                          <span className="tbl-sub">{proj.services?.name || "General"}</span>
                          {hasProposal && (
                            <span className="proposal-badge">
                              Manager Proposed: ₹{Number(fin.manager_proposed_amount || 0).toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>
                        <td>{proj.manager?.name || "Unassigned"}</td>
                        <td>
                          <strong>₹{Number(fin.total_cost || 0).toLocaleString("en-IN")}</strong>
                        </td>
                        <td>
                          <span className="adv-assigned-val">
                            ₹{Number(fin.advance_assigned || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td>
                          <span className="verified-paid-val">
                            ₹{Number(fin.verified_paid || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td>
                          <strong className="remaining-val">
                            ₹{Number(fin.remaining_balance || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span className={`status-pill pill-${fin.advance_status || "not_assigned"}`}>
                            {(fin.advance_status || "not_assigned").replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            <button
                              className="action-btn-primary"
                              onClick={() => openFinancialModal(proj)}
                            >
                              Edit / Assign Advance
                            </button>

                            {hasProposal && (
                              <div className="proposal-actions">
                                <button
                                  className="btn-approve-sm"
                                  onClick={() => handleReviewManagerProposal(proj.id, "approve")}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-reject-sm"
                                  onClick={() => handleReviewManagerProposal(proj.id, "reject")}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Advance & Total Cost Modal */}
        {selectedProject && (
          <div className="pay-modal-backdrop" onClick={() => setSelectedProject(null)}>
            <div className="pay-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title-row">
                <div>
                  <h3>Assign Advance & Cost</h3>
                  <p>{selectedProject.name}</p>
                </div>
                <button className="modal-close" onClick={() => setSelectedProject(null)}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveFinancials} className="modal-form">
                <div className="form-group">
                  <label>Total Project Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={financialForm.total_cost}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, total_cost: e.target.value })
                    }
                    placeholder="e.g. 50000"
                    required
                  />
                  <span className="field-hint">The complete agreed price for this project.</span>
                </div>

                <div className="form-group">
                  <label>Advance Payment Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={financialForm.advance_assigned}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, advance_assigned: e.target.value })
                    }
                    placeholder="e.g. 15000"
                    required
                  />
                  <span className="field-hint">Required upfront deposit for work to commence.</span>
                </div>

                <div className="form-group">
                  <label>Advance Payment Due Date</label>
                  <input
                    type="date"
                    value={financialForm.advance_due_date}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, advance_due_date: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Special Payment Instructions (Optional)</label>
                  <textarea
                    rows="3"
                    value={financialForm.payment_instructions}
                    onChange={(e) =>
                      setFinancialForm({ ...financialForm, payment_instructions: e.target.value })
                    }
                    placeholder="Custom notes or milestone terms for the customer..."
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setSelectedProject(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-save-btn" disabled={savingId !== null}>
                    {savingId ? "Saving Schedule..." : "Save Financial Schedule"}
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

export default AdminPayments;
