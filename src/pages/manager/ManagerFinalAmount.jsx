import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./ManagerFinalAmount.css";

function ManagerFinalAmount() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Proposal form state
  const [proposalForm, setProposalForm] = useState({
    proposal_type: "total_cost", // "total_cost" or "additional_amount"
    proposed_amount: "",
    proposal_notes: "",
  });

  useEffect(() => {
    loadAssignedProjects();
  }, []);

  const loadAssignedProjects = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      const { data: projList } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          status,
          priority,
          due_date,
          created_at,
          services:service_id(name)
        `)
        .eq("manager_id", user.id)
        .order("created_at", { ascending: false });

      const enriched = await Promise.all(
        (projList || []).map(async (p) => {
          try {
            const fRes = await fetch(`/api/projects/${p.id}/financials`, {
              headers: { Authorization: `Bearer ${session?.access_token || ""}` },
            });
            const fJson = await fRes.json();
            return {
              ...p,
              financials: fJson.financials || {},
            };
          } catch {
            return { ...p, financials: {} };
          }
        })
      );

      setProjects(enriched);
    } catch (e) {
      console.error("Failed to load manager projects:", e);
    } finally {
      setLoading(false);
    }
  };

  const openProposalModal = (proj) => {
    setSelectedProject(proj);
    setProposalForm({
      proposal_type: "total_cost",
      proposed_amount: proj.financials?.total_cost || "",
      proposal_notes: proj.financials?.manager_proposal_notes || "",
    });
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/manager/projects/${selectedProject.id}/final-amount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify(proposalForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit proposal.");
      }

      alert("Final amount proposal submitted for Admin review!");
      setSelectedProject(null);
      await loadAssignedProjects();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const navigation = [
    {
      label: "WORKSPACE",
      items: [
        { label: "Dashboard", path: "/manager", icon: "⌂" },
        { label: "Requests", path: "/manager/requests", icon: "▣" },
        { label: "Assigned Projects", path: "/manager/projects", icon: "◈" },
        { label: "Final Amount Assignment", path: "/manager/final-amount", icon: "💰" },
        { label: "Submit Project", path: "/manager/submit-project", icon: "📤" },
        { label: "Tasks", path: "/manager/tasks", icon: "✓" },
        { label: "Files", path: "/manager/files", icon: "▤" },
        { label: "Reports", path: "/manager/reports", icon: "▥" },
      ],
    },
  ];

  return (
    <DashboardLayout title="Final Amount Assignment" navigation={navigation}>
      <div className="manager-final-amount-page">
        <div className="final-amt-header">
          <div>
            <span className="badge-mgr">PROJECT COMPLETION BILLING</span>
            <h1>Final Amount Assignment</h1>
            <p>
              Submit final project costs or additional billing proposals to Admin upon milestone completion.
            </p>
          </div>
        </div>

        <div className="final-amt-card">
          <div className="card-top">
            <h2>Your Assigned Projects</h2>
            <span>{projects.length} Projects Total</span>
          </div>

          {loading ? (
            <div className="mgr-empty">Loading assigned projects...</div>
          ) : projects.length === 0 ? (
            <div className="mgr-empty">No projects currently assigned to you.</div>
          ) : (
            <div className="table-scroll">
              <table className="mgr-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Approved Total Cost</th>
                    <th>Advance Paid</th>
                    <th>Proposal Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => {
                    const fin = proj.financials || {};
                    const propStatus = fin.manager_proposal_status || "none";

                    return (
                      <tr key={proj.id}>
                        <td>
                          <strong>{proj.name}</strong>
                          <span className="tbl-sub">{proj.services?.name}</span>
                        </td>
                        <td>
                          <span className={`status-pill pill-${proj.status}`}>
                            {proj.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <strong>₹{Number(fin.total_cost || 0).toLocaleString("en-IN")}</strong>
                        </td>
                        <td>
                          <span className="green-txt">
                            ₹{Number(fin.verified_paid || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td>
                          <span className={`prop-pill pill-${propStatus}`}>
                            {propStatus === "none"
                              ? "No Proposal"
                              : propStatus === "pending_approval"
                              ? `Pending Admin (₹${Number(fin.manager_proposed_amount || 0).toLocaleString("en-IN")})`
                              : propStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-propose-amt"
                            onClick={() => openProposalModal(proj)}
                          >
                            {propStatus === "pending_approval" ? "Update Proposal" : "Submit Final Amount"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for Final Amount Proposal */}
        {selectedProject && (
          <div className="mgr-modal-backdrop" onClick={() => setSelectedProject(null)}>
            <div className="mgr-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Submit Final Amount Proposal</h3>
                  <p>{selectedProject.name}</p>
                </div>
                <button className="close-btn" onClick={() => setSelectedProject(null)}>✕</button>
              </div>

              <div className="current-fin-summary">
                <div>
                  <span>Current Approved Cost:</span>
                  <strong>₹{Number(selectedProject.financials?.total_cost || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span>Advance Received:</span>
                  <strong className="green-txt">₹{Number(selectedProject.financials?.verified_paid || 0).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <form onSubmit={handleSubmitProposal} className="mgr-prop-form">
                <div className="form-group">
                  <label>Proposal Type</label>
                  <select
                    value={proposalForm.proposal_type}
                    onChange={(e) =>
                      setProposalForm({ ...proposalForm, proposal_type: e.target.value })
                    }
                  >
                    <option value="total_cost">Final Total Project Cost (Full price)</option>
                    <option value="additional_amount">Additional Scope Amount to Be Added</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Proposed Amount (₹) <span className="req-star">*</span></label>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={proposalForm.proposed_amount}
                    onChange={(e) =>
                      setProposalForm({ ...proposalForm, proposed_amount: e.target.value })
                    }
                    placeholder="e.g. 50000"
                    required
                  />
                  <span className="field-hint">
                    {proposalForm.proposal_type === "total_cost"
                      ? "The new total cost of the project (advance received will be deducted automatically from customer's remaining balance)."
                      : "Additional amount added on top of current project total."}
                  </span>
                </div>

                <div className="form-group">
                  <label>Deliverables & Completion Notes for Admin</label>
                  <textarea
                    rows="3"
                    value={proposalForm.proposal_notes}
                    onChange={(e) =>
                      setProposalForm({ ...proposalForm, proposal_notes: e.target.value })
                    }
                    placeholder="Describe milestones achieved, extra features delivered, or adjustments..."
                    required
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
                  <button type="submit" className="modal-submit-btn" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Proposal to Admin"}
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

export default ManagerFinalAmount;
