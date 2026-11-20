import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./AdminQRSettings.css";

function AdminQRSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  const [settings, setSettings] = useState({
    payee_name: "Phoenix Solutions",
    upi_id: "phoenixsolutions@icici",
    payment_description: "Phoenix Solutions Project Payment",
    qr_image_url: "",
    qr_type: "static",
    is_active: true,
    payment_instructions:
      "1. Open Google Pay, PhonePe, Paytm, or any UPI-supported app.\n2. Scan the Phoenix Solutions QR code or use the provided UPI ID.\n3. Verify the Payee Name displays 'Phoenix Solutions'.\n4. Enter the exact assigned amount and complete payment.\n5. Save or screenshot the transaction confirmation with UTR.\n6. Submit the screenshot and UTR in the form below for verification.",
    updated_at: null,
  });

  const [previewAmount, setPreviewAmount] = useState("15000");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/qr-settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setSettings(json.settings);
      }
    } catch (e) {
      console.error("Failed to fetch QR settings:", e);
    } finally {
      setLoading(false);
    }
  };

  // Upload QR code image from local computer directly to Supabase storage bucket `qr-codes`
  const handleQRFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("QR image must be under 5MB.");
      return;
    }

    // Validate format
    const validFormats = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validFormats.includes(file.type)) {
      alert("Supported formats: PNG, JPG, JPEG, WEBP.");
      return;
    }

    setUploadingQr(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `company_qr_${Date.now()}.${fileExt}`;
      const filePath = `active/${fileName}`;

      const { data, error } = await supabase.storage
        .from("qr-codes")
        .upload(filePath, file, { upsert: true });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("qr-codes")
        .getPublicUrl(filePath);

      setSettings((prev) => ({
        ...prev,
        qr_image_url: publicUrl,
      }));

      setStatusMsg({
        text: "QR code image uploaded successfully! Click 'Save & Activate QR Code' below to publish it to clients.",
        type: "success",
      });
    } catch (err) {
      console.error("QR Upload error:", err);
      // Fallback: convert to base64 data URI so admin can still upload without storage permissions
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings((prev) => ({
          ...prev,
          qr_image_url: event.target.result,
        }));
        setStatusMsg({
          text: "QR code image loaded! Click 'Save & Activate QR Code' to store it permanently.",
          type: "success",
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRemoveUploadedQR = () => {
    setSettings((prev) => ({
      ...prev,
      qr_image_url: "",
    }));
    setStatusMsg({
      text: "Custom uploaded QR removed. System will default to dynamic vector QR code from UPI ID.",
      type: "success",
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ text: "", type: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/admin/qr-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update QR settings.");
      }

      setSettings(json.settings);
      setStatusMsg({
        text: "Payment QR code configuration successfully saved and activated across the platform! Clients now see this exact QR code.",
        type: "success",
      });
    } catch (err) {
      console.error("Save QR settings error:", err);
      setStatusMsg({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Generate standard UPI URI string
  const upiUri = `upi://pay?pa=${encodeURIComponent(
    settings.upi_id
  )}&pn=${encodeURIComponent(
    settings.payee_name
  )}&tn=${encodeURIComponent(
    settings.payment_description
  )}${
    settings.qr_type === "dynamic" && previewAmount
      ? `&am=${encodeURIComponent(previewAmount)}&cu=INR`
      : ""
  }`;

  // Priority: 1) Admin uploaded QR image, 2) Vector UPI QR fallback
  const activeQrDisplay =
    settings.qr_image_url ||
    `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      upiUri
    )}&color=030914&bgcolor=ffffff&qzone=2`;

  const navigation = [
    {
      label: "MAIN MENU",
      items: [
        { label: "Dashboard Overview", path: "/admin", icon: "⌂" },
        { label: "Work Requests", path: "/admin/requests", icon: "▣" },
        { label: "Project Management", path: "/admin/projects", icon: "◈" },
        { label: "Submissions", path: "/admin/submissions", icon: "📥" },
        { label: "Tasks", path: "/admin/tasks", icon: "✓" },
      ],
    },
    {
      label: "FINANCIAL & PAYMENTS",
      items: [
        { label: "Payment Overview", path: "/admin/payments", icon: "💳" },
        { label: "Payment QR Management", path: "/admin/qr-settings", icon: "📱" },
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
    <DashboardLayout title="Payment QR Management" navigation={navigation}>
      <div className="admin-qr-page">
        {/* Header */}
        <div className="admin-qr-header">
          <div>
            <span className="qr-badge">COMPANY TREASURY SETTINGS</span>
            <h1>Payment QR Management & Image Upload</h1>
            <p>
              Upload your official company UPI QR code image from your computer, set payment details, and activate it for all customer portals.
            </p>
          </div>

          <div className="qr-status-pill">
            <span
              className={`status-dot ${
                settings.is_active ? "dot-active" : "dot-inactive"
              }`}
            />
            <span>{settings.is_active ? "Payment QR Active & Visible" : "Payment QR Deactivated"}</span>
          </div>
        </div>

        {statusMsg.text && (
          <div className={`qr-alert-box ${statusMsg.type}`}>
            {statusMsg.type === "success" ? "✓" : "⚠"} {statusMsg.text}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="admin-qr-grid">
          {/* Settings Form Column */}
          <div className="qr-form-card">
            <h2>Payment QR Configuration & File Upload</h2>
            <p className="section-subtext">
              The uploaded QR code image will be securely stored and directly displayed to customers.
            </p>

            <form onSubmit={handleSave} className="qr-settings-form">
              {/* Dedicated Drag-and-Drop / File Upload Box */}
              <div className="admin-qr-upload-zone">
                <span className="zone-icon">📷</span>
                <div className="zone-text">
                  <strong>Upload Official QR Code Image From Computer</strong>
                  <p>PNG, JPG, JPEG, or WEBP (Max 5MB)</p>
                </div>

                <div className="upload-btn-row">
                  <label className="browse-qr-btn">
                    <span>{uploadingQr ? "Uploading Image..." : "Choose QR Image"}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleQRFileSelected}
                      disabled={uploadingQr}
                      style={{ display: "none" }}
                    />
                  </label>

                  {settings.qr_image_url && (
                    <button
                      type="button"
                      className="remove-qr-btn"
                      onClick={handleRemoveUploadedQR}
                    >
                      Remove Custom Image
                    </button>
                  )}
                </div>

                {settings.qr_image_url && (
                  <div className="attached-badge">
                    ✓ Custom uploaded QR image is attached and ready to save.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  Payee / Business Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  value={settings.payee_name}
                  onChange={(e) =>
                    setSettings({ ...settings, payee_name: e.target.value })
                  }
                  placeholder="e.g. Phoenix Solutions"
                  required
                />
                <span className="field-hint">
                  This official business name appears in Google Pay, PhonePe, and Paytm upon scan.
                </span>
              </div>

              <div className="form-group">
                <label>
                  Company UPI ID (VPA) <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  value={settings.upi_id}
                  onChange={(e) =>
                    setSettings({ ...settings, upi_id: e.target.value })
                  }
                  placeholder="e.g. phoenixsolutions@icici"
                  required
                />
                <span className="field-hint">
                  Format: yourbusiness@bank (e.g. @okaxis, @okhdfcbank, @icici).
                </span>
              </div>

              <div className="form-group">
                <label>Payment Description / Note</label>
                <input
                  type="text"
                  value={settings.payment_description}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment_description: e.target.value,
                    })
                  }
                  placeholder="Phoenix Solutions Project Payment"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>QR Code Status</label>
                  <select
                    value={settings.is_active ? "true" : "false"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        is_active: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">Active (Customers can scan & pay)</option>
                    <option value="false">Deactivated (Temporarily Hidden)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mode</label>
                  <select
                    value={settings.qr_image_url ? "uploaded" : settings.qr_type}
                    onChange={(e) => {
                      if (e.target.value !== "uploaded") {
                        setSettings({ ...settings, qr_type: e.target.value, qr_image_url: "" });
                      }
                    }}
                  >
                    {settings.qr_image_url && <option value="uploaded">Uploaded QR Image (Active)</option>}
                    <option value="static">Static (Customer enters amount)</option>
                    <option value="dynamic">Dynamic UPI QR (Embeds amount)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Customer Payment Instructions</label>
                <textarea
                  rows="4"
                  value={settings.payment_instructions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment_instructions: e.target.value,
                    })
                  }
                  placeholder="Step-by-step payment instructions for customers..."
                />
              </div>

              <button type="submit" className="save-qr-btn" disabled={saving || uploadingQr}>
                {saving ? "Saving Configuration..." : "Save & Activate QR Code"}
              </button>
            </form>
          </div>

          {/* Live Preview Column */}
          <div className="qr-preview-card">
            <h2>Active QR Preview (Customer Portal View)</h2>
            <p className="section-subtext">
              This exact image will be displayed when customers click "Pay via QR Code".
            </p>

            <div className="qr-render-box">
              <div className="qr-frame">
                <img
                  src={activeQrDisplay}
                  alt="Phoenix Solutions UPI Payment QR"
                  className="live-qr-img"
                />
              </div>

              <div className="qr-meta-info">
                <span className="payee-title">{settings.payee_name}</span>
                <span className="upi-id-badge">{settings.upi_id}</span>
                <span className="qr-mode-tag">
                  {settings.qr_image_url ? "✓ Admin Uploaded QR Code" : "Auto-Generated UPI QR"}
                </span>

                <div className="preview-status-strip">
                  <span>Status: </span>
                  <strong className={settings.is_active ? "txt-green" : "txt-red"}>
                    {settings.is_active ? "Active & Accepting Payments" : "Deactivated"}
                  </strong>
                </div>
              </div>

              <div className="qr-instructions-preview">
                <strong>Customer Step-by-Step Instructions:</strong>
                <pre>{settings.payment_instructions}</pre>
              </div>

              <div className="qr-security-notice">
                <span className="sec-icon">🔒</span>
                <div>
                  <strong>Enterprise Audit Security:</strong>
                  <p>
                    Scanning or uploading does not confirm payment automatically. All customer screenshot submissions require Admin bank statement verification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminQRSettings;
