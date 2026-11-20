import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import phoenixLogo from "../../assets/phoenix-logo.png";
import "./AdminInvoices.css";

function AdminInvoices() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Fetch overview
      const ovRes = await fetch("/api/admin/financials/overview", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const ovJson = await ovRes.json();
      if (ovJson.success) {
        setTransactions(ovJson.recentTransactions || []);
      }

      // 2. Fetch projects
      const { data: projList } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          status,
          created_at,
          services:service_id(name),
          manager:manager_id(name)
        `)
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
      console.error("Invoices error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
    <DashboardLayout title="Invoices & Receipts" navigation={navigation}>
      <div className="admin-invoices-page">
        <div className="invoices-header">
          <div>
            <span className="invoices-badge">OFFICIAL BILLING LEDGER</span>
            <h1>Invoices & Payment Receipts</h1>
            <p>
              Generate professional downloadable receipts and billing schedules for enterprise clients.
            </p>
          </div>
        </div>

        {/* Section 1: Verified Payment Receipts */}
        <div className="invoices-section-card">
          <div className="section-title-row">
            <h2>Verified Payment Receipts (Ready for Download)</h2>
            <span>{transactions.length} Verified Receipts</span>
          </div>

          {loading ? (
            <div className="inv-empty">Loading receipts...</div>
          ) : transactions.length === 0 ? (
            <div className="inv-empty">No payment receipts issued yet. Approve customer proofs under Proof Verification.</div>
          ) : (
            <div className="receipts-grid">
              {transactions.map((tx) => (
                <div key={tx.id} className="receipt-card">
                  <div className="receipt-card-header">
                    <div>
                      <span className="rcpt-num">{tx.receipt_number || "PHX-REC-2026"}</span>
                      <strong className="rcpt-proj">{tx.project_name}</strong>
                    </div>
                    <span className="rcpt-badge-verified">✓ Confirmed</span>
                  </div>

                  <div className="rcpt-body">
                    <div className="rcpt-row">
                      <span>Customer:</span>
                      <strong>{tx.customer_name || "Enterprise Client"}</strong>
                    </div>
                    <div className="rcpt-row">
                      <span>Amount Received:</span>
                      <strong className="amt-bold">₹{Number(tx.amount || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="rcpt-row">
                      <span>Method & UTR:</span>
                      <code>{tx.transaction_ref_id}</code>
                    </div>
                    <div className="rcpt-row">
                      <span>Payment Date:</span>
                      <span>{tx.payment_date || new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="receipt-footer">
                    <button
                      className="view-receipt-btn"
                      onClick={() => setSelectedReceipt(tx)}
                    >
                      View & Print Official Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Project Invoices Overview */}
        <div className="invoices-section-card">
          <div className="section-title-row">
            <h2>Project Invoices & Advance Schedules</h2>
            <span>{projects.length} Active Accounts</span>
          </div>

          <div className="table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Project Name</th>
                  <th>Total Cost</th>
                  <th>Advance Assigned</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th>Advance Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((proj) => {
                  const fin = proj.financials || {};
                  const invNum = `PHX-INV-${proj.id.substring(0, 6).toUpperCase()}`;

                  return (
                    <tr key={proj.id}>
                      <td>
                        <strong>{invNum}</strong>
                      </td>
                      <td>
                        <strong>{proj.name}</strong>
                        <span className="inv-sub">{proj.services?.name}</span>
                      </td>
                      <td>₹{Number(fin.total_cost || 0).toLocaleString("en-IN")}</td>
                      <td>
                        <span className="cyan-txt">₹{Number(fin.advance_assigned || 0).toLocaleString("en-IN")}</span>
                      </td>
                      <td>
                        <span className="green-txt">₹{Number(fin.verified_paid || 0).toLocaleString("en-IN")}</span>
                      </td>
                      <td>
                        <strong className="gold-txt">₹{Number(fin.remaining_balance || 0).toLocaleString("en-IN")}</strong>
                      </td>
                      <td>
                        <span className={`status-pill pill-${fin.advance_status || "not_assigned"}`}>
                          {(fin.advance_status || "not_assigned").replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receipt Printable Modal */}
        {selectedReceipt && (
          <div className="rcpt-modal-backdrop" onClick={() => setSelectedReceipt(null)}>
            <div className="rcpt-modal-paper" onClick={(e) => e.stopPropagation()}>
              <div className="paper-header">
                <div className="paper-brand">
                  <img src={phoenixLogo} alt="Phoenix Solutions Logo" className="paper-logo" />
                  <div>
                    <h2>PHOENIX SOLUTIONS</h2>
                    <p>Creating Beyond Limits • Enterprise Digital Engineering</p>
                  </div>
                </div>
                <div className="paper-receipt-meta">
                  <h3>OFFICIAL PAYMENT RECEIPT</h3>
                  <span>{selectedReceipt.receipt_number || "PHX-REC-2026"}</span>
                  <p>Date: {selectedReceipt.payment_date || new Date().toISOString().split("T")[0]}</p>
                </div>
              </div>

              <div className="paper-divider" />

              <div className="paper-details-grid">
                <div>
                  <label>Received From (Client):</label>
                  <strong>{selectedReceipt.customer_name || "Enterprise Client"}</strong>
                  <p>Account ID: {selectedReceipt.customer_id}</p>
                </div>
                <div>
                  <label>Project Reference:</label>
                  <strong>{selectedReceipt.project_name || "Phoenix Solutions Project"}</strong>
                  <p>Service: Digital Engineering & Design</p>
                </div>
              </div>

              <div className="paper-table-wrap">
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Payment Method</th>
                      <th>UTR / Transaction Ref</th>
                      <th>Amount Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Project Milestone / Advance Payment</td>
                      <td>{selectedReceipt.payment_method || "UPI"}</td>
                      <td>{selectedReceipt.transaction_ref_id}</td>
                      <td>
                        <strong>₹{Number(selectedReceipt.amount || 0).toLocaleString("en-IN")}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="paper-total-row">
                <span>Total Amount Paid (INR):</span>
                <strong>₹{Number(selectedReceipt.amount || 0).toLocaleString("en-IN")}</strong>
              </div>

              <div className="paper-footer">
                <div>
                  <p className="seal-txt">✓ Electronic Audit Verification Confirmed</p>
                  <p className="sub-txt">This is an authorized computer-generated receipt issued by Phoenix Solutions.</p>
                </div>
                <button className="paper-print-btn" onClick={handlePrint}>
                  🖨 Print or Save as PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminInvoices;
