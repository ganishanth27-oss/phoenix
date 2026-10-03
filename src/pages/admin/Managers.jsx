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

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, status, created_at")
      .eq("role", "manager")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setManagers(data || []);
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

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

    setCreating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Your admin session has expired. Please login again.");
        return;
      }

      const response = await fetch(
        "http://localhost:8000/api/admin/managers",
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

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
      });

      setShowForm(false);

      await loadManagers();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (manager) => {
    const newStatus =
      manager.status === "active" ? "inactive" : "active";

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

    loadManagers();
  };

  return (
    <div className="managers-page">

      {/* Header */}
      <div className="managers-header">
        <div>
          <h1>Managers</h1>
          <p>
            Manage PHOENIX managers and their account status.
          </p>
        </div>

        <button
          className="add-manager-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Manager
        </button>
      </div>

      {/* Add Manager Form */}
      {showForm && (
        <div className="manager-form-card">

          <div className="manager-form-header">
            <div>
              <h2>Create Manager</h2>
              <p>
                Create a new manager account for PHOENIX.
              </p>
            </div>

            <button
              className="close-form-btn"
              onClick={() => setShowForm(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <form
            className="manager-form"
            onSubmit={handleCreateManager}
          >

            <div className="form-row">

              <div className="form-group">
                <label>Full Name</label>

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
                <label>Email</label>

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

            <div className="form-row">

              <div className="form-group">
                <label>Phone</label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Password</label>

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

            <div className="manager-form-actions">

              <button
                type="button"
                className="cancel-manager-btn"
                onClick={() => setShowForm(false)}
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

      {/* Managers List */}
      <div className="managers-card">

        <div className="managers-card-header">
          <h2>All Managers</h2>

          <span>
            {managers.length} managers
          </span>
        </div>

        {loading ? (
          <div className="empty-message">
            Loading managers...
          </div>
        ) : managers.length === 0 ? (
          <div className="empty-message">

            <div className="empty-icon">
              👤
            </div>

            <h3>No managers yet</h3>

            <p>
              Add a manager to start assigning
              company operations.
            </p>

          </div>
        ) : (
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

                    <td>
                      <strong>
                        {manager.name}
                      </strong>
                    </td>

                    <td>
                      {manager.email}
                    </td>

                    <td>
                      {manager.phone || "—"}
                    </td>

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

                    <td>
                      {new Date(
                        manager.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <button
                        className="status-btn"
                        onClick={() =>
                          handleToggleStatus(manager)
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