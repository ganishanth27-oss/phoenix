import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, pay_qr, upload_proof, history, receipts

  // Selected project for payment
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Payment QR settings from backend
  const [qrSettings, setQrSettings] = useState({
    payee_name: "Phoenix Solutions",
    upi_id: "phoenixsolutions@icici",
    payment_description: "Phoenix Solutions Project Payment",
    payment_instructions: "",
  });

  // Proof submission state
  const [proofForm, setProofForm] = useState({
    amount_claimed: "",
    payment_method: "UPI",
    transaction_ref_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    screenshot_url: "",
    customer_notes: "",
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofStatusMsg, setProofStatusMsg] = useState({ text: "", type: "" });

  // History & Receipts
  const [proofHistory, setProofHistory] = useState([]);
  const [verifiedTransactions, setVerifiedTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Copy helper
  const [copiedUPI, setCopiedUPI] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        navigate("/login");
        return;
      }

      setProfile(profileData);

      // Fetch public QR configuration
      try {
        const qrRes = await fetch("/api/public/qr-settings");
        const qrJson = await qrRes.json();
        if (qrJson.success && qrJson.settings) {
          setQrSettings(qrJson.settings);
        }
      } catch (e) {
        console.error("QR settings fetch error:", e);
      }

      // Load user projects
      const { data: projectUsers } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", user.id);

      const projectIds = (projectUsers || []).map((item) => item.project_id);

      let fetchedProjects = [];
      if (projectIds.length > 0) {
        const { data: projectData } = await supabase
          .from("projects")
          .select(`
            *,
            services (name)
          `)
          .in("id", projectIds)
          .order("created_at", { ascending: false });

        fetchedProjects = projectData || [];
      }

      // If user has no linked projects yet, also look up public projects / requests
      if (fetchedProjects.length === 0) {
        const { data: allProjs } = await supabase
          .from("projects")
          .select("*, services(name)")
          .limit(3);
        fetchedProjects = allProjs || [];
      }

      // Enrich projects with real-time financial balance from backend
      const { data: { session } } = await supabase.auth.getSession();
      const enriched = await Promise.all(
        fetchedProjects.map(async (p) => {
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
                verified_paid: 0,
                remaining_balance: 0,
                advance_status: "not_assigned",
              },
              proofs: fJson.proofs || [],
              transactions: fJson.transactions || [],
            };
          } catch {
            return { ...p, financials: {} };
          }
        })
      );

      setProjects(enriched);

      if (enriched.length > 0) {
        setSelectedProjectId(enriched[0].id);
        const allUserProofs = enriched.flatMap((p) => p.proofs || []);
        const allUserTxs = enriched.flatMap((p) => p.transactions || []);
        setProofHistory(allUserProofs);
        setVerifiedTransactions(allUserTxs);

        // Prepopulate claimed amount with assigned advance if available
        const firstFin = enriched[0].financials;
        if (firstFin?.advance_assigned > 0 && firstFin?.verified_paid === 0) {
          setProofForm((prev) => ({
            ...prev,
            amount_claimed: firstFin.advance_assigned,
          }));
        } else if (firstFin?.remaining_balance > 0) {
          setProofForm((prev) => ({
            ...prev,
            amount_claimed: firstFin.remaining_balance,
          }));
        }
      }

      // Load in-app notifications
      try {
        const nRes = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${session?.access_token || ""}` },
        });
        const nJson = await nRes.json();
        if (nJson.success) {
          setNotifications(nJson.notifications || []);
        }
      } catch (e) {
        console.error("Notifications fetch error:", e);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(qrSettings.upi_id);
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2500);
  };

  // Upload screenshot file to Supabase storage bucket `payment-proofs`
  const handleScreenshotFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Screenshot file size must be less than 5MB.");
      return;
    }

    // Validate format
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP.");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile?.id || "guest"}_${Date.now()}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;

      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);

      setProofForm((prev) => ({ ...prev, screenshot_url: publicUrl }));
      alert("Screenshot uploaded successfully! Fill in your UTR number to submit.");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert("Please select a project.");
      return;
    }

    if (!proofForm.screenshot_url) {
      alert("Please upload your payment confirmation screenshot.");
      return;
    }

    if (!proofForm.transaction_ref_id.trim()) {
      alert("Please enter the official UTR / Transaction Reference ID from your UPI app.");
      return;
    }

    setSubmittingProof(true);
    setProofStatusMsg({ text: "", type: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/customer/payment-proofs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          amount_claimed: Number(proofForm.amount_claimed),
          payment_method: proofForm.payment_method,
          transaction_ref_id: proofForm.transaction_ref_id.trim(),
          payment_date: proofForm.payment_date,
          screenshot_url: proofForm.screenshot_url,
          customer_notes: proofForm.customer_notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit payment proof.");
      }

      setProofStatusMsg({
        text: "Payment proof submitted successfully! Our treasury team will verify your payment against bank records shortly.",
        type: "success",
      });

      // Reset form
      setProofForm({
        amount_claimed: "",
        payment_method: "UPI",
        transaction_ref_id: "",
        payment_date: new Date().toISOString().split("T")[0],
        screenshot_url: "",
        customer_notes: "",
      });

      await loadDashboard();
    } catch (err) {
      setProofStatusMsg({ text: err.message, type: "error" });
    } finally {
      setSubmittingProof(false);
    }
  };

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  const fin = activeProject?.financials || {};

  // Financial calculations
  const totalCost = Number(fin.total_cost || 0);
  const advanceAssigned = Number(fin.advance_assigned || 0);
  const verifiedPaid = Number(fin.verified_paid || 0);
  const remainingBalance = Math.max(0, totalCost - verifiedPaid);
  const progressPercent = totalCost > 0 ? Math.min(100, Math.round((verifiedPaid / totalCost) * 100)) : 0;

  // Payable amount suggestion
  const payableAmount =
    advanceAssigned > 0 && verifiedPaid === 0 ? advanceAssigned : remainingBalance;

  // Generate UPI URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(
    qrSettings.upi_id || "phoenixsolutions@icici"
  )}&pn=${encodeURIComponent(
    qrSettings.payee_name || "Phoenix Solutions"
  )}&tn=${encodeURIComponent(
    `${activeProject?.name || "Phoenix"} Payment`
  )}&am=${encodeURIComponent(payableAmount || "0")}&cu=INR`;

  // Use the exact QR code image uploaded by Admin if provided; otherwise fallback to vector QR generator
  const activeQrImageUrl = qrSettings.qr_image_url
    ? qrSettings.qr_image_url
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        upiUri
      )}&color=030914&bgcolor=ffffff&qzone=2`;

  const isQrActive = qrSettings.is_active !== false;

  const navigation = [
    {
      label: "CUSTOMER PORTAL",
      items: [
        { label: "Payment Overview", path: "/dashboard", icon: "⌂" },
        { label: "Public Website", path: "/", icon: "🌐" },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="user-dashboard-loading">
        <div className="user-loading-spinner" />
        <p>Loading Your Phoenix Customer Portal...</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Customer Payment Portal" navigation={navigation}>
      <div className="customer-portal-page">
        {/* Portal Header */}
        <div className="portal-header-row">
          <div>
            <span className="portal-badge">CLIENT SECURE PORTAL</span>
            <h1>Welcome, {profile?.name || "Client"}</h1>
            <p>
              Manage your project finances, view assigned advance schedules, make instant UPI QR payments, and upload proof of payment.
            </p>
          </div>

          {projects.length > 0 && (
            <div className="project-selector-wrap">
              <label>Current Active Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  const sel = projects.find((p) => p.id === e.target.value);
                  if (sel?.financials) {
                    const f = sel.financials;
                    setProofForm((prev) => ({
                      ...prev,
                      amount_claimed:
                        f.advance_assigned > 0 && f.verified_paid === 0
                          ? f.advance_assigned
                          : f.remaining_balance || "",
                    }));
                  }
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.services?.name || "Project"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 6 Payment Overview Cards */}
        <div className="customer-metrics-grid">
          <div className="metric-card">
            <span>Total Project Cost</span>
            <strong>₹{totalCost.toLocaleString("en-IN")}</strong>
            <small>Agreed project contract</small>
          </div>

          <div className="metric-card">
            <span>Advance Assigned</span>
            <strong className="val-cyan">₹{advanceAssigned.toLocaleString("en-IN")}</strong>
            <small>Upfront deposit</small>
          </div>

          <div className="metric-card">
            <span>Verified Amount Paid</span>
            <strong className="val-green">₹{verifiedPaid.toLocaleString("en-IN")}</strong>
            <small>Confirmed bank receipts</small>
          </div>

          <div className="metric-card">
            <span>Remaining Balance</span>
            <strong className="val-gold">₹{remainingBalance.toLocaleString("en-IN")}</strong>
            <small>Balance due on completion</small>
          </div>

          <div className="metric-card">
            <span>Next Payable Amount</span>
            <strong className="val-cyan">₹{payableAmount.toLocaleString("en-IN")}</strong>
            <small>{verifiedPaid === 0 ? "Advance payment" : "Remaining balance"}</small>
          </div>

          <div className="metric-card">
            <span>Advance Status</span>
            <span className={`status-pill pill-${fin.advance_status || "not_assigned"}`}>
              {(fin.advance_status || "not_assigned").replace("_", " ")}
            </span>
            <small>{fin.advance_due_date ? `Due: ${fin.advance_due_date}` : "Standard schedule"}</small>
          </div>
        </div>

        {/* Payment Progress Bar */}
        <div className="payment-progress-card">
          <div className="progress-info-row">
            <span>Project Payment Completion: <strong>{progressPercent}%</strong></span>
            <span>₹{verifiedPaid.toLocaleString("en-IN")} of ₹{totalCost.toLocaleString("en-IN")} Paid</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="portal-tabs-bar">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            💳 Pay via QR Code
          </button>
          <button
            className={`tab-btn ${activeTab === "upload_proof" ? "active" : ""}`}
            onClick={() => setActiveTab("upload_proof")}
          >
            📤 Upload Payment Proof
          </button>
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            🕒 Payment History & Status
          </button>
          <button
            className={`tab-btn ${activeTab === "receipts" ? "active" : ""}`}
            onClick={() => setActiveTab("receipts")}
          >
            📄 Invoices & Receipts ({verifiedTransactions.length})
          </button>
        </div>

        {/* TAB 1: QR CODE PAYMENT */}
        {activeTab === "overview" && (
          <div className="qr-payment-container">
            <div className="qr-pay-card">
              <div className="pay-card-header">
                <h2>Make Your Payment</h2>
                <p>Scan with Google Pay, PhonePe, Paytm, or any UPI app to pay Phoenix Solutions.</p>
              </div>

              {!isQrActive ? (
                <div className="qr-unavailable-alert">
                  <span className="unavail-icon">⚠️</span>
                  <div>
                    <strong>Payment QR is currently unavailable.</strong>
                    <p>Please contact Phoenix Solutions support or your assigned manager to request payment instructions.</p>
                  </div>
                </div>
              ) : (
                <div className="qr-payment-split">
                  {/* QR Code Presentation Box */}
                  <div className="qr-box">
                    <div className="qr-white-frame">
                      <img
                        src={activeQrImageUrl}
                        alt="Phoenix Solutions Official Payment QR"
                        className="qr-code-img"
                      />
                    </div>

                    <div className="qr-details-strip">
                      <span className="payee-lbl">Phoenix Solutions Payee Name</span>
                      <strong className="payee-name">{qrSettings.payee_name || "Phoenix Solutions"}</strong>

                      <div className="upi-copy-row">
                        <code>{qrSettings.upi_id || "phoenixsolutions@icici"}</code>
                        <button className="copy-btn" onClick={handleCopyUPI}>
                          {copiedUPI ? "✓ Copied!" : "Copy UPI ID"}
                        </button>
                      </div>

                      <div className="qr-action-buttons-row">
                        <a
                          href={activeQrImageUrl}
                          download="Phoenix_Solutions_Payment_QR.png"
                          target="_blank"
                          rel="noreferrer"
                          className="download-qr-btn"
                        >
                          💾 Download QR Code
                        </a>

                        <a href={upiUri} className="open-upi-btn">
                          📱 Open UPI App
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Instructions & Summary Box */}
                  <div className="qr-instruction-box">
                    <h3>Payment Breakdown</h3>
                    <div className="breakdown-list">
                      <div className="breakdown-item">
                        <span>Project Name:</span>
                        <strong>{activeProject?.name || "Phoenix Project"}</strong>
                      </div>
                      <div className="breakdown-item">
                        <span>Total Project Cost:</span>
                        <span>₹{totalCost.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="breakdown-item">
                        <span>Advance Assigned:</span>
                        <span>₹{advanceAssigned.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="breakdown-item">
                        <span>Amount Already Paid:</span>
                        <span className="green-txt">₹{verifiedPaid.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="breakdown-item highlight-row">
                        <span>Current Payable Amount:</span>
                        <strong className="gold-amt">₹{payableAmount.toLocaleString("en-IN")}</strong>
                      </div>
                    </div>

                    <div className="steps-card">
                      <h4>Customer Payment Instructions:</h4>
                      <ol>
                        <li>Open Google Pay, PhonePe, Paytm or another supported UPI application.</li>
                        <li>Scan the displayed Phoenix Solutions QR code.</li>
                        <li>Verify the recipient name (<strong>{qrSettings.payee_name || "Phoenix Solutions"}</strong>).</li>
                        <li>Enter the assigned payment amount (<strong>₹{payableAmount.toLocaleString("en-IN")}</strong>).</li>
                        <li>Complete the payment.</li>
                        <li>Return to the Phoenix Solutions website.</li>
                        <li>Upload the payment screenshot.</li>
                        <li>Enter the transaction reference ID (UTR).</li>
                        <li>Submit for verification.</li>
                      </ol>
                    </div>

                    <div className="step-action-row">
                      <button
                        className="goto-upload-btn"
                        onClick={() => setActiveTab("upload_proof")}
                      >
                        Upload Payment Proof →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: UPLOAD PAYMENT PROOF */}
        {activeTab === "upload_proof" && (
          <div className="upload-proof-card">
            <div className="upload-card-header">
              <h2>Upload Payment Proof</h2>
              <p>
                Submit your transaction screenshot and UTR reference number so our accounts team can confirm your payment.
              </p>
            </div>

            {proofStatusMsg.text && (
              <div className={`proof-alert ${proofStatusMsg.type}`}>
                {proofStatusMsg.type === "success" ? "✓" : "⚠"} {proofStatusMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmitProof} className="proof-submission-form">
              <div className="proof-form-grid">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input type="text" value={profile?.name || "Client"} disabled />
                </div>

                <div className="form-group">
                  <label>Project Name</label>
                  <input type="text" value={activeProject?.name || "Phoenix Project"} disabled />
                </div>

                <div className="form-group">
                  <label>Payment Amount (₹) <span className="req-star">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={proofForm.amount_claimed}
                    onChange={(e) =>
                      setProofForm({ ...proofForm, amount_claimed: e.target.value })
                    }
                    placeholder="Enter exact paid amount"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={proofForm.payment_method}
                    onChange={(e) =>
                      setProofForm({ ...proofForm, payment_method: e.target.value })
                    }
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm / BHIM)</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS / NEFT / RTGS)</option>
                    <option value="Other">Other Verified Method</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Transaction Reference ID / UTR Number <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    value={proofForm.transaction_ref_id}
                    onChange={(e) =>
                      setProofForm({ ...proofForm, transaction_ref_id: e.target.value })
                    }
                    placeholder="12-digit UPI reference number (e.g. 432109876543)"
                    required
                  />
                  <span className="field-hint">Found on your UPI transaction receipt details screen.</span>
                </div>

                <div className="form-group">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={proofForm.payment_date}
                    onChange={(e) =>
                      setProofForm({ ...proofForm, payment_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Drag and Drop Screenshot Upload Box */}
              <div className="upload-dropzone">
                <label className="dropzone-label">
                  <span className="upload-icon">📸</span>
                  <strong>Upload Payment Screenshot <span className="req-star">*</span></strong>
                  <p>Click to browse or drop your screenshot (JPG, PNG, WEBP - Max 5MB)</p>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleScreenshotFileChange}
                    className="file-hidden-input"
                  />
                </label>

                {uploadingImage && <div className="upload-spinner">Uploading screenshot...</div>}

                {proofForm.screenshot_url && (
                  <div className="screenshot-preview-box">
                    <img
                      src={proofForm.screenshot_url}
                      alt="Uploaded Screenshot Preview"
                      className="preview-img"
                    />
                    <span className="preview-ok">✓ Screenshot attached</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Optional Remarks / Notes</label>
                <textarea
                  rows="2"
                  value={proofForm.customer_notes}
                  onChange={(e) =>
                    setProofForm({ ...proofForm, customer_notes: e.target.value })
                  }
                  placeholder="Any additional information about your transaction..."
                />
              </div>

              <button
                type="submit"
                className="submit-proof-btn"
                disabled={submittingProof || uploadingImage}
              >
                {submittingProof ? "Submitting Payment Proof..." : "Submit Payment Proof for Verification"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: PAYMENT HISTORY & VERIFICATION STATUS */}
        {activeTab === "history" && (
          <div className="history-card">
            <div className="card-top">
              <h2>Your Submitted Payment Proofs</h2>
              <span>{proofHistory.length} Submissions</span>
            </div>

            {proofHistory.length === 0 ? (
              <div className="history-empty">
                You have not submitted any payment proofs yet. Pay via QR and upload your screenshot to track verification.
              </div>
            ) : (
              <div className="table-scroll">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Proof ID</th>
                      <th>Amount Claimed</th>
                      <th>Method & UTR</th>
                      <th>Date</th>
                      <th>Screenshot</th>
                      <th>Verification Status</th>
                      <th>Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proofHistory.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.id}</strong>
                        </td>
                        <td>
                          <strong>₹{Number(p.amount_claimed || 0).toLocaleString("en-IN")}</strong>
                        </td>
                        <td>
                          <span>{p.payment_method}</span>
                          <code className="utr-code">{p.transaction_ref_id}</code>
                        </td>
                        <td>{p.payment_date || new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                          {p.screenshot_url ? (
                            <a
                              href={p.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="view-link"
                            >
                              View Image ↗
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className={`status-pill pill-${p.verification_status}`}>
                            {p.verification_status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {p.rejection_reason ? (
                            <span className="reject-reason-txt">
                              Rejected: {p.rejection_reason}
                            </span>
                          ) : (
                            p.admin_remarks || "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFICIAL INVOICES & RECEIPTS */}
        {activeTab === "receipts" && (
          <div className="receipts-card">
            <div className="card-top">
              <h2>Official Payment Receipts & Invoices</h2>
              <span>{verifiedTransactions.length} Confirmed Receipts</span>
            </div>

            {verifiedTransactions.length === 0 ? (
              <div className="history-empty">
                No verified receipts yet. Once your payment proof is reviewed and confirmed by our treasury, official downloadable receipts appear here.
              </div>
            ) : (
              <div className="receipt-list-grid">
                {verifiedTransactions.map((tx) => (
                  <div key={tx.id} className="client-receipt-card">
                    <div className="client-receipt-header">
                      <div>
                        <span className="rcpt-num-badge">{tx.receipt_number || "PHX-REC-2026"}</span>
                        <h3>{tx.project_name || "Phoenix Solutions Project"}</h3>
                      </div>
                      <span className="rcpt-verified-badge">✓ Verified & Audited</span>
                    </div>

                    <div className="client-receipt-body">
                      <div className="rcpt-line">
                        <span>Amount Received:</span>
                        <strong className="amt-green">₹{Number(tx.amount || 0).toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="rcpt-line">
                        <span>Transaction UTR:</span>
                        <code>{tx.transaction_ref_id}</code>
                      </div>
                      <div className="rcpt-line">
                        <span>Payment Date:</span>
                        <span>{tx.payment_date || new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="client-receipt-footer">
                      <button
                        className="print-receipt-btn"
                        onClick={() => window.print()}
                      >
                        🖨 Print or Save Receipt (PDF)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default UserDashboard;
