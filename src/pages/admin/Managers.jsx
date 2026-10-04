import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Managers.css";

function Managers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // Render backend URL from .env
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadManagers();
  }, []);

  // =========================
  // LOAD MANAGERS
  // =========================

  const loadManagers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, name, email, phone, role, status, created_at"
      )
      .eq("role", "manager")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setManagers(data || []);
    }

    setLoading(false);
  };

  // =========================
  // HANDLE INPUT
  // =========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // CREATE MANAGER
  // =========================

  const handleCreateManager = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required.");
      return;
    }

    if (form.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (!API_URL) {
      alert(
        "Backend API URL is not configured. Please check your .env file."
      );
      return;
    }

    setCreating(true);

    try {
      // Get currently logged-in admin session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert(
          "Your admin session has expired. Please login again."
        );
        return;
      }

      // Send request to Render backend
      const response = await fetch(
        `${API_URL}/api/admin/managers`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create manager."
        );
      }

      alert("Manager created successfully.");

      // Reset form
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
      });

      // Close form
      setShowForm(false);

      // Refresh manager list
      await loadManagers();
    } catch (error) {
      console.error(
        "Create manager error:",
        error
      );

      alert(
        error.message ||
          "Unable to connect to the backend."
      );
    } finally {
      setCreating(false);
    }
  };

  // =========================
  // TOGGLE MANAGER STATUS
  // =========================

  const handleToggleStatus = async (manager) => {
    const newStatus =
      manager.status === "active"
        ? "inactive"
        : "active";

    const { error } = await supabase
      .from("profiles")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", manager.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadManagers();
  };

  // =========================
  // CLOSE FORM
  // =========================

  const handleCloseForm = () => {
    if (creating) {
      return;
    }

    setShowForm(false);

    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
    });
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="managers-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="managers-header">

        <div>
          <h1>Managers</h1>

          <p>
            Manage PHOENIX managers and their
            account status.
          </p>
        </div>

        <button
          className="add-manager-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Manager
        </button>

      </div>

      {/* =========================
          ADD MANAGER FORM
      ========================= */}

      {showForm && (
        <div className="manager-form-card">

          <div className="manager-form-header">

            <div>
              <h2>Create Manager</h2>

              <p>
                Create a new manager account for
                PHOENIX.
              </p>
            </div>

            <button
              className="close-form-btn"
              onClick={handleCloseForm}
              type="button"
              disabled={creating}
            >
              ×
            </button>

          </div>

          <form
            className="manager-form"
            onSubmit={handleCreateManager}
          >

            {/* NAME + EMAIL */}

            <div className="form-row">

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter manager name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="manager@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>

            {/* PHONE + PASSWORD */}

            <div className="form-row">

              <div className="form-group">

                <label>
                  Phone
                </label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={handleChange}
                />

              </div>

              <div className="form-group">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />

              </div>

            </div>

            {/* FORM ACTIONS */}

            <div className="manager-form-actions">

              <button
                type="button"
                className="cancel-manager-btn"
                onClick={handleCloseForm}
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-manager-btn"
                disabled={creating}
              >
                {creating
                  ? "Creating..."
                  : "Create Manager"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* =========================
          MANAGERS LIST
      ========================= */}

      <div className="managers-card">

        <div className="managers-card-header">

          <h2>
            All Managers
          </h2>

          <span>
            {managers.length} managers
          </span>

        </div>

        {/* LOADING */}

        {loading ? (

          <div className="empty-message">
            Loading managers...
          </div>

        ) : managers.length === 0 ? (

          /* EMPTY STATE */

          <div className="empty-message">

            <div className="empty-icon">
              👤
            </div>

            <h3>
              No managers yet
            </h3>

            <p>
              Add a manager to start assigning
              company operations.
            </p>

          </div>

        ) : (

          /* MANAGERS TABLE */

          <div className="managers-table-wrapper">

            <table className="managers-table">

              <thead>

                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {managers.map((manager) => (

                  <tr key={manager.id}>

                    {/* NAME */}

                    <td>
                      <strong>
                        {manager.name}
                      </strong>
                    </td>

                    {/* EMAIL */}

                    <td>
                      {manager.email}
                    </td>

                    {/* PHONE */}

                    <td>
                      {manager.phone || "—"}
                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={
                          manager.status === "active"
                            ? "manager-status active"
                            : "manager-status inactive"
                        }
                      >
                        {manager.status}
                      </span>

                    </td>

                    {/* CREATED */}

                    <td>

                      {new Date(
                        manager.created_at
                      ).toLocaleDateString()}

                    </td>

                    {/* ACTION */}

                    <td>

                      <button
                        className="status-btn"
                        onClick={() =>
                          handleToggleStatus(
                            manager
                          )
                        }
                      >
                        {manager.status === "active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Managers;