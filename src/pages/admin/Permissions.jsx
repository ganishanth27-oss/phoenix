import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function Permissions() {
  const [managers, setManagers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");
  const [assignedPermissions, setAssignedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedManager) {
      loadManagerPermissions(selectedManager);
    } else {
      setAssignedPermissions([]);
    }
  }, [selectedManager]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [
      { data: managerData, error: managerError },
      { data: permissionData, error: permissionError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "manager")
        .eq("status", "active")
        .order("name"),

      supabase
        .from("permissions")
        .select("id, name, description")
        .order("name"),
    ]);

    if (managerError) {
      console.error(managerError);
      setMessage("Failed to load managers.");
    }

    if (permissionError) {
      console.error(permissionError);
      setMessage("Failed to load permissions.");
    }

    setManagers(managerData || []);
    setPermissions(permissionData || []);
    setLoading(false);
  }

  async function loadManagerPermissions(managerId) {
    setMessage("");

    const { data, error } = await supabase
      .from("manager_permissions")
      .select("permission_id")
      .eq("manager_id", managerId);

    if (error) {
      console.error(error);
      setMessage("Failed to load manager permissions.");
      return;
    }

    setAssignedPermissions(
      (data || []).map((item) => item.permission_id)
    );
  }

  function togglePermission(permissionId) {
    setAssignedPermissions((current) => {
      if (current.includes(permissionId)) {
        return current.filter((id) => id !== permissionId);
      }

      return [...current, permissionId];
    });
  }

  async function savePermissions() {
    if (!selectedManager) {
      setMessage("Please select a manager.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: deleteError } = await supabase
      .from("manager_permissions")
      .delete()
      .eq("manager_id", selectedManager);

    if (deleteError) {
      console.error(deleteError);
      setMessage("Failed to update permissions.");
      setSaving(false);
      return;
    }

    if (assignedPermissions.length > 0) {
      const rows = assignedPermissions.map((permissionId) => ({
        manager_id: selectedManager,
        permission_id: permissionId,
      }));

      const { error: insertError } = await supabase
        .from("manager_permissions")
        .insert(rows);

      if (insertError) {
        console.error(insertError);
        setMessage("Failed to save permissions.");
        setSaving(false);
        return;
      }
    }

    setMessage("Permissions saved successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card">
          <p>Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Manager Permissions</h1>
          <p>
            Control what each manager can access in PHOENIX.
          </p>
        </div>
      </div>

      <div className="page-card">
        <label className="form-label">
          Select Manager
        </label>

        <select
          className="form-input"
          value={selectedManager}
          onChange={(e) =>
            setSelectedManager(e.target.value)
          }
        >
          <option value="">
            -- Select a Manager --
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

      {selectedManager && (
        <div className="page-card">
          <div className="permissions-header">
            <div>
              <h2>Available Permissions</h2>
              <p>
                Select the permissions this manager should have.
              </p>
            </div>

            <span className="permission-count">
              {assignedPermissions.length} /{" "}
              {permissions.length} selected
            </span>
          </div>

          <div className="permissions-grid">
            {permissions.map((permission) => {
              const checked =
                assignedPermissions.includes(
                  permission.id
                );

              return (
                <label
                  key={permission.id}
                  className={`permission-item ${
                    checked ? "selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      togglePermission(permission.id)
                    }
                  />

                  <div>
                    <strong>
                      {formatPermissionName(
                        permission.name
                      )}
                    </strong>

                    <span>
                      {permission.description ||
                        "No description available."}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="permissions-actions">
            <button
              className="primary-button"
              onClick={savePermissions}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Permissions"}
            </button>
          </div>

          {message && (
            <div className="status-message">
              {message}
            </div>
          )}
        </div>
      )}

      {!selectedManager && (
        <div className="empty-state">
          <h2>Select a Manager</h2>
          <p>
            Choose a manager above to view and manage
            their permissions.
          </p>
        </div>
      )}
    </div>
  );
}

function formatPermissionName(name) {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default Permissions;