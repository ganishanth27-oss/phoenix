import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./ManagerPermissions.css";

function ManagerPermissions() {
  const [managers, setManagers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");

  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /* =====================================================
     LOAD MANAGERS + PERMISSIONS
  ===================================================== */

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Admin session not found.");
      }

      /* -----------------------------------------------
         Load Managers
      ------------------------------------------------ */

      const {
        data: managerData,
        error: managerError,
      } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("role", "manager")
        .order("name", {
          ascending: true,
        });

      if (managerError) {
        throw managerError;
      }

      /* -----------------------------------------------
         Load Permissions
      ------------------------------------------------ */

      const {
        data: permissionData,
        error: permissionError,
      } = await supabase
        .from("permissions")
        .select("id, name, description")
        .order("name", {
          ascending: true,
        });

      if (permissionError) {
        throw permissionError;
      }

      setManagers(managerData || []);
      setPermissions(permissionData || []);

      console.log(
        "PHOENIX Managers:",
        managerData
      );

      console.log(
        "PHOENIX Permissions:",
        permissionData
      );
    } catch (error) {
      console.error(
        "Manager permissions loading error:",
        error
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  /* =====================================================
     LOAD SELECTED MANAGER PERMISSIONS
  ===================================================== */

  const loadManagerPermissions = async (
    managerId
  ) => {
    if (!managerId) {
      setSelectedPermissions([]);
      return;
    }

    setError("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("manager_permissions")
        .select("permission_id")
        .eq("manager_id", managerId);

      if (error) {
        throw error;
      }

      setSelectedPermissions(
        (data || []).map(
          (item) => item.permission_id
        )
      );
    } catch (error) {
      console.error(
        "Loading manager permissions error:",
        error
      );

      setError(error.message);
      setSelectedPermissions([]);
    }
  };


  /* =====================================================
     MANAGER CHANGE
  ===================================================== */

  const handleManagerChange = async (e) => {
    const managerId = e.target.value;

    setSelectedManager(managerId);

    await loadManagerPermissions(managerId);
  };


  /* =====================================================
     PERMISSION CHECKBOX
  ===================================================== */

  const handlePermissionChange = (
    permissionId
  ) => {
    setSelectedPermissions((previous) => {
      if (previous.includes(permissionId)) {
        return previous.filter(
          (id) => id !== permissionId
        );
      }

      return [
        ...previous,
        permissionId,
      ];
    });
  };


  /* =====================================================
     SELECT ALL
  ===================================================== */

  const selectAllPermissions = () => {
    setSelectedPermissions(
      permissions.map(
        (permission) => permission.id
      )
    );
  };


  /* =====================================================
     CLEAR ALL
  ===================================================== */

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };


  /* =====================================================
     SAVE PERMISSIONS
  ===================================================== */

  const savePermissions = async () => {
    if (!selectedManager) {
      alert("Please select a manager.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      /* -----------------------------------------------
         Remove existing permissions
      ------------------------------------------------ */

      const {
        error: deleteError,
      } = await supabase
        .from("manager_permissions")
        .delete()
        .eq("manager_id", selectedManager);

      if (deleteError) {
        throw deleteError;
      }


      /* -----------------------------------------------
         Add selected permissions
      ------------------------------------------------ */

      if (selectedPermissions.length > 0) {
        const rows =
          selectedPermissions.map(
            (permissionId) => ({
              manager_id: selectedManager,
              permission_id: permissionId,
            })
          );

        const {
          error: insertError,
        } = await supabase
          .from("manager_permissions")
          .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      alert(
        "Manager permissions saved successfully."
      );

      await loadManagerPermissions(
        selectedManager
      );
    } catch (error) {
      console.error(
        "Saving manager permissions error:",
        error
      );

      setError(error.message);
    } finally {
      setSaving(false);
    }
  };


  /* =====================================================
     GET SELECTED MANAGER
  ===================================================== */

  const currentManager = managers.find(
    (manager) =>
      manager.id === selectedManager
  );


  return (
    <div className="manager-permissions-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="permissions-header">

        <span className="permissions-label">
          PHOENIX ADMIN
        </span>

        <h1>
          Manager Permissions
        </h1>

        <p>
          Control which features each PHOENIX
          manager can access.
        </p>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="permissions-error">
          <strong>
            Error:
          </strong>{" "}
          {error}
        </div>
      )}


      {/* =================================================
          MAIN CARD
      ================================================= */}

      <div className="permissions-card">

        {/* Manager Selection */}

        <div className="manager-selector">

          <label>
            Select Manager
          </label>

          <select
            value={selectedManager}
            onChange={handleManagerChange}
            disabled={loading}
          >

            <option value="">
              {loading
                ? "Loading managers..."
                : managers.length === 0
                  ? "No managers found"
                  : "Select a manager"}
            </option>

            {managers.map((manager) => (
              <option
                key={manager.id}
                value={manager.id}
              >
                {manager.name} — {manager.email}
                {manager.status !== "active"
                  ? " (Inactive)"
                  : ""}
              </option>
            ))}

          </select>

          {managers.length === 0 &&
            !loading && (
              <p className="selector-help">
                No manager profiles were found
                in the PHOENIX database.
              </p>
            )}

        </div>


        {/* =================================================
            SELECTED MANAGER
        ================================================= */}

        {currentManager && (
          <div className="selected-manager-card">

            <div className="manager-avatar">
              {currentManager.name
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {currentManager.name}
              </strong>

              <span>
                {currentManager.email}
              </span>
            </div>

            <span
              className={`manager-status ${
                currentManager.status
              }`}
            >
              {currentManager.status}
            </span>

          </div>
        )}


        {/* =================================================
            PERMISSIONS
        ================================================= */}

        {selectedManager ? (
          <div className="permissions-section">

            <div className="permissions-section-header">

              <div>
                <h2>
                  Access Permissions
                </h2>

                <p>
                  Select the features this manager
                  is allowed to use.
                </p>
              </div>

              <div className="permission-count">
                {selectedPermissions.length}{" "}
                permissions
              </div>

            </div>


            {/* Select / Clear */}

            <div className="permission-actions">

              <button
                type="button"
                onClick={selectAllPermissions}
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAllPermissions}
              >
                Clear All
              </button>

            </div>


            {/* Permission List */}

            {permissions.length === 0 ? (
              <div className="no-permissions">
                No permissions found.
              </div>
            ) : (
              <div className="permission-list">

                {permissions.map(
                  (permission) => {

                    const checked =
                      selectedPermissions.includes(
                        permission.id
                      );

                    return (
                      <label
                        className={`permission-item ${
                          checked
                            ? "checked"
                            : ""
                        }`}
                        key={permission.id}
                      >

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            handlePermissionChange(
                              permission.id
                            )
                          }
                        />

                        <div className="permission-info">

                          <strong>
                            {permission.name}
                          </strong>

                          <span>
                            {permission.description ||
                              "No description"}
                          </span>

                        </div>

                      </label>
                    );
                  }
                )}

              </div>
            )}


            {/* Save */}

            <div className="save-permissions-container">

              <button
                className="save-permissions-button"
                onClick={savePermissions}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Permissions"}
              </button>

            </div>

          </div>
        ) : (
          <div className="no-manager-selected">

            <div className="lock-icon">
              🔐
            </div>

            <h3>
              Select a manager
            </h3>

            <p>
              Choose a manager above to configure
              their permissions.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

export default ManagerPermissions;