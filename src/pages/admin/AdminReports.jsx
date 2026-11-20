import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./AdminReports.css";

function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalProjectValue: 0,
    totalAdvanceAssigned: 0,
    totalPaymentsReceived: 0,
    outstandingAmount: 0,
    totalProofsCount: 0,
    approvedProofsCount: 0,
    rejectedProofsCount: 0,
  });
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/financials/overview", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const json = await res.json();
      if (json.success) {
        setMetrics(json.metrics || {});
        setTransactions(json.recentTransactions || []);
      }
    } catch (e) {
      console.error("Failed to load financial report:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No verified transactions to export.");
      return;
    }
    const headers = ["Receipt Number", "Customer Name", "Project", "Amount (INR)", "Payment Method", "UTR / Ref", "Date", "Status"];
    const rows = transactions.map((t) => [
      t.receipt_number || "",
      `"${t.customer_name || ""}"`,
      `"${t.project_name || ""}"`,
      t.amount || 0,
      t.payment_method || "UPI",
      `"${t.transaction_ref_id || ""}"`,
      t.payment_date || "",
      t.status || "verified",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Phoenix_Financial_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <DashboardLayout title="Financial Reports" navigation={navigation}>
      <div className="admin-reports-page">
        {/* Header */}
        <div className="reports-header-row">
          <div>
            <span className="reports-badge">AUDITED TREASURY STATS</span>
            <h1>Enterprise Financial Reports & Ledger</h1>
            <p>
              Official financial summary differentiating assigned, invoiced, pending verification, and verified collected revenues.
            </p>
          </div>

          <div className="reports-actions">
            <button className="export-btn" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
            <button className="print-btn" onClick={handlePrint}>
              🖨 Print Report
            </button>
          </div>
        </div>

        {/* 4 Primary Financial KPI Cards */}
        <div className="reports-kpi-grid">
          <div className="kpi-card">
            <span>Total Enterprise Project Value</span>
            <strong>₹{Number(metrics.totalProjectValue || 0).toLocaleString("en-IN")}</strong>
            <small>Committed contract portfolio</small>
          </div>
          <div className="kpi-card">
            <span>Total Advance Assigned</span>
            <strong className="val-cyan">₹{Number(metrics.totalAdvanceAssigned || 0).toLocaleString("en-IN")}</strong>
            <small>Target upfront deposits</small>
          </div>
          <div className="kpi-card">
            <span>Total Collected (Verified)</span>
            <strong className="val-green">₹{Number(metrics.totalPaymentsReceived || 0).toLocaleString("en-IN")}</strong>
            <small>Confirmed bank receipts only</small>
          </div>
          <div className="kpi-card">
            <span>Outstanding Accounts Receivable</span>
            <strong className="val-gold">₹{Number(metrics.outstandingAmount || 0).toLocaleString("en-IN")}</strong>
            <small>Remaining pipeline to collect</small>
          </div>
        </div>

        {/* Audit Verification KPI Cards */}
        <div className="reports-audit-grid">
          <div className="audit-box">
            <span>Total Proofs Processed</span>
            <strong>{metrics.totalProofsCount || 0}</strong>
          </div>
          <div className="audit-box">
            <span>Approved Bank Transactions</span>
            <strong className="val-green">{metrics.approvedProofsCount || 0}</strong>
          </div>
          <div className="audit-box">
            <span>Rejected Submissions</span>
            <strong className="val-red">{metrics.rejectedProofsCount || 0}</strong>
          </div>
          <div className="audit-box">
            <span>Pending Audit Amount</span>
            <strong className="val-cyan">₹{Number(metrics.pendingProofsAmount || 0).toLocaleString("en-IN")}</strong>
          </div>
        </div>

        {/* Official Verified Transactions Table */}
        <div className="reports-table-card">
          <div className="card-top-row">
            <h2>Official Audited Payment Transactions (Receipts)</h2>
            <span>{transactions.length} Verified Entries</span>
          </div>

          {loading ? (
            <div className="reports-empty">Loading financial ledger...</div>
          ) : transactions.length === 0 ? (
            <div className="reports-empty">
              No verified transactions on record yet. Once payment proofs are approved by Admin, they appear here.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Receipt Number</th>
                    <th>Customer Name</th>
                    <th>Project</th>
                    <th>Amount Received</th>
                    <th>Method</th>
                    <th>UTR / Transaction Ref</th>
                    <th>Date</th>
                    <th>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <strong>{tx.receipt_number || tx.id}</strong>
                      </td>
                      <td>{tx.customer_name || "Customer"}</td>
                      <td>{tx.project_name || "Project"}</td>
                      <td>
                        <strong className="amt-green">
                          ₹{Number(tx.amount || 0).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td>{tx.payment_method || "UPI"}</td>
                      <td>
                        <span className="utr-txt">{tx.transaction_ref_id}</span>
                      </td>
                      <td>{tx.payment_date || new Date(tx.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className="audit-verified-pill">✓ Verified by Admin</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminReports;
