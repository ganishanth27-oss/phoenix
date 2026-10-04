import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerProjects.css";

function ManagerProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      // ============================
      // LOAD MANAGER PERMISSIONS
      // ============================

      const {
        data: permissionData,
        error: permissionError,
      } = await supabase
        .from("manager_permissions")
        .select(`
          permissions:permission_id (
            name
          )
        `)
        .eq("manager_id", user.id);

      if (permissionError) {
        throw permissionError;
      }

      const permissions =
        permissionData
          ?.map((item) => item.permissions?.name)
          .filter(Boolean) || [];

      // ============================
      // VIEW PERMISSION
      // ============================

      if (!permissions.includes("view_projects")) {
        alert("You do not have permission to view projects.");
        navigate("/manager");
        return;
      }

      // ============================
      // OTHER PERMISSIONS
      // ============================

      setCanCreate(permissions.includes("create_projects"));
      setCanEdit(permissions.includes("edit_projects"));
      setCanDelete(permissions.includes("delete_projects"));

      // ============================
      // LOAD PROJECTS
      // ============================

      const {
        data,
        error,
      } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          description,
          service_id,
          manager_id,
          start_date,
          due_date,
          status,
          priority,
          created_at,
          services:service_id (
            name
          )
        `)
        .eq("manager_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setProjects(data || []);
    } catch (error) {
      console.error("Manager projects error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // UPDATE PROJECT
  // ============================

  const updateProject = async (projectId, field, value) => {
    if (!canEdit) {
      alert("You do not have permission to edit projects.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("projects")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      await loadProjects();
    } catch (error) {
      console.error("Project update error:", error);
      alert(error.message);
    }
  };

  // ============================
  // DELETE PROJECT
  // ============================

  const deleteProject = async (projectId) => {
    if (!canDelete) {
      alert("You do not have permission to delete projects.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      alert("Project deleted successfully.");

      await loadProjects();
    } catch (error) {
      console.error("Project delete error:", error);
      alert(error.message);
    }
  };

  // ============================
  // CREATE PROJECT
  // ============================

  const createProject = () => {
    if (!canCreate) {
      alert("You do not have permission to create projects.");
      return;
    }

    /*
      The actual project creation form can be connected here later.

      For now, this button takes the manager to the dashboard.
      We will build the complete Create Project form in the next step.
    */

    alert(
      "Create Project permission is enabled. The project creation form will be added next."
    );
  };

  // ============================
  // LABEL FORMAT
  // ============================

  const getLabel = (value) => {
    if (!value) {
      return "";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  // ============================
  // UI
  // ============================

  return (
    <div className="manager-projects-page">

      {/* ================= HEADER ================= */}

      <header className="manager-projects-header">

        <div>
          <span>PHOENIX MANAGER</span>

          <h1>
            My Projects
          </h1>

          <p>
            Projects assigned to your account.
          </p>
        </div>

        <div className="manager-project-header-actions">

          {canCreate && (
            <button
              className="create-project-button"
              onClick={createProject}
            >
              + Create Project
            </button>
          )}

          <button
            className="back-manager-button"
            onClick={() => navigate("/manager")}
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* ================= CONTENT ================= */}

      {loading ? (

        <div className="manager-projects-loading">
          Loading projects...
        </div>

      ) : projects.length === 0 ? (

        <div className="manager-projects-empty">

          <div className="empty-icon">
            📁
          </div>

          <h2>
            No Projects Assigned
          </h2>

          <p>
            You currently don't have any projects assigned to you.
          </p>

          {canCreate && (
            <button
              onClick={createProject}
              className="create-project-empty-button"
            >
              + Create Project
            </button>
          )}

          <button
            onClick={() => navigate("/manager")}
          >
            Back to Dashboard
          </button>

        </div>

      ) : (

        <div className="manager-project-list">

          {projects.map((project) => (

            <div
              className="manager-project-card"
              key={project.id}
            >

              {/* ================= PROJECT TOP ================= */}

              <div className="manager-project-top">

                <div>

                  <div className="manager-project-title">

                    <h2>
                      {project.name}
                    </h2>

                    <span
                      className={`manager-project-priority priority-${project.priority}`}
                    >
                      {project.priority}
                    </span>

                  </div>

                  <p className="manager-project-service">
                    {project.services?.name ||
                      "No service selected"}
                  </p>

                </div>

                <span
                  className={`manager-project-status status-${project.status}`}
                >
                  {getLabel(project.status)}
                </span>

              </div>

              {/* ================= DESCRIPTION ================= */}

              {project.description && (

                <div className="manager-project-description">

                  <span>
                    Description
                  </span>

                  <p>
                    {project.description}
                  </p>

                </div>

              )}

              {/* ================= DETAILS ================= */}

              <div className="manager-project-details">

                <div>
                  <span>
                    Start Date
                  </span>

                  <strong>
                    {project.start_date
                      ? new Date(
                          project.start_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Due Date
                  </span>

                  <strong>
                    {project.due_date
                      ? new Date(
                          project.due_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Priority
                  </span>

                  <strong>
                    {getLabel(project.priority)}
                  </strong>
                </div>

              </div>

              {/* ================= EDIT ================= */}

              {canEdit && (

                <div className="manager-project-controls">

                  <label>
                    Update Status
                  </label>

                  <select
                    value={project.status}
                    onChange={(e) =>
                      updateProject(
                        project.id,
                        "status",
                        e.target.value
                      )
                    }
                  >

                    <option value="not_started">
                      Not Started
                    </option>

                    <option value="in_progress">
                      In Progress
                    </option>

                    <option value="review">
                      Review
                    </option>

                    <option value="completed">
                      Completed
                    </option>

                    <option value="on_hold">
                      On Hold
                    </option>

                  </select>

                </div>

              )}

              {/* ================= DELETE ================= */}

              {canDelete && (

                <div className="manager-project-delete-area">

                  <button
                    className="manager-project-delete"
                    onClick={() =>
                      deleteProject(project.id)
                    }
                  >
                    Delete Project
                  </button>

                </div>

              )}

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

export default ManagerProjects;