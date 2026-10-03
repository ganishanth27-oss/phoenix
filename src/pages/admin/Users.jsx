import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    managerId: "",
  });

  useEffect(() => {
    loadUsers();
    loadManagers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, status, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

  const loadManagers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "manager")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setManagers(data || []);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateUser = async (e) => {
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
        throw new Error(
          "Your admin session has expired. Please login again."
        );
      }

      const response = await fetch(
        "http://localhost:8000/api/admin/users",
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
            managerId: form.managerId || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create user."
        );
      }

      alert("User created successfully.");

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        managerId: "",
      });

      setShowForm(false);

      await loadUsers();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus =
      user.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("profiles")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadUsers();
  };

  return (
    <div className="users-page">

      <div className="users-header">
        <div>
          <h1>Users</h1>
          <p>
            Manage PHOENIX users and their manager assignments.
          </p>
        </div>

        <button
          className="add-user-btn"
          onClick={() => setShowForm(true)}
        >
          + Add User
        </button>
      </div>

      {showForm && (
        <div className="user-form-card">

          <div className="user-form-header">
            <div>
              <h2>Create User</h2>
              <p>
                Create a new PHOENIX user account.
              </p>
            </div>

            <button
              type="button"
              className="close-user-btn"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>

          <form
            className="user-form"
            onSubmit={handleCreateUser}
          >

            <div className="form-row">

              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter user name"
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
                  placeholder="user@example.com"
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

            <div className="form-group">
              <label>Assign Manager</label>

              <select
                name="managerId"
                value={form.managerId}
                onChange={handleChange}
              >
                <option value="">
                  No manager assigned
                </option>

                {managers.map((manager) => (
                  <option
                    key={manager.id}
                    value={manager.id}
                  >
                    {manager.name} — {manager.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="user-form-actions">

              <button
                type="button"
                className="cancel-user-btn"
                onClick={() => setShowForm(false)}
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-user-btn"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create User"}
              </button>

            </div>

          </form>
        </div>
      )}

      <div className="users-card">

        <div className="users-card-header">
          <div>
            <h2>All Users</h2>
            <p>
              {users.length} user{users.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="users-empty">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="users-empty">

            <div className="users-empty-icon">
              👤
            </div>

            <h3>No users yet</h3>

            <p>
              Create your first PHOENIX user.
            </p>

          </div>
        ) : (
          <div className="users-table-wrapper">

            <table className="users-table">

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

                {users.map((user) => (
                  <tr key={user.id}>

                    <td>
                      <strong>{user.name}</strong>
                    </td>

                    <td>
                      {user.email}
                    </td>

                    <td>
                      {user.phone || "—"}
                    </td>

                    <td>
                      <span
                        className={
                          user.status === "active"
                            ? "user-status active"
                            : "user-status inactive"
                        }
                      >
                        {user.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        user.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <button
                        className="user-status-btn"
                        onClick={() =>
                          handleToggleStatus(user)
                        }
                      >
                        {user.status === "active"
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

export default Users;