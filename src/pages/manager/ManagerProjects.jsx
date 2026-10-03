import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerProjects.css";

function ManagerProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

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

      // Check manager permission
      const { data: permissionData, error: permissionError } =
        await supabase
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
        permissionData?.map((item) => item.permissions?.name).filter(Boolean) ||
        [];

      if (!permissions.includes("view_projects")) {
        setProjects([]);
        setLoading(false);
        return;
      }

      setCanEdit(permissions.includes("edit_projects"));

      // Load manager's projects
      const { data, error } = await supabase
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

  const updateProject = async (projectId, field, value) => {
    if (!canEdit) {
      alert("You do not have permission to edit projects.");
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("manager_id", (await supabase.auth.getUser()).data.user.id);

      if (error) {
        throw error;
      }

      await loadProjects();
    } catch (error) {
      console.error("Project update error:", error);
      alert(error.message);
    }
  };

  const getLabel = (value) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <div className="manager-projects-page">
      <header className="manager-projects-header">
        <div>
          <span>PHOENIX MANAGER</span>
          <h1>My Projects</h1>
          <p>Projects assigned to your account.</p>
        </div>

        <button
          className="back-manager-button"
          onClick={() => navigate("/manager")}
        >
          ← Dashboard
        </button>
      </header>

      {loading ? (
        <div className="manager-projects-loading">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="manager-projects-empty">
          <div className="empty-icon">📁</div>

          <h2>No Projects Assigned</h2>

          <p>
            You currently don't have any projects assigned to you.
          </p>

          <button onClick={() => navigate("/manager")}>
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="manager-project-list">
          {projects.map((project) => (
            <div className="manager-project-card" key={project.id}>
              <div className="manager-project-top">
                <div>
                  <div className="manager-project-title">
                    <h2>{project.name}</h2>

                    <span
                      className={`manager-project-priority priority-${project.priority}`}
                    >
                      {project.priority}
                    </span>
                  </div>

                  <p className="manager-project-service">
                    {project.services?.name || "No service selected"}
                  </p>
                </div>

                <span
                  className={`manager-project-status status-${project.status}`}
                >
                  {getLabel(project.status)}
                </span>
              </div>

              {project.description && (
                <div className="manager-project-description">
                  <span>Description</span>
                  <p>{project.description}</p>
                </div>
              )}

              <div className="manager-project-details">
                <div>
                  <span>Start Date</span>
                  <strong>
                    {project.start_date
                      ? new Date(
                          project.start_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Due Date</span>
                  <strong>
                    {project.due_date
                      ? new Date(
                          project.due_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong>{getLabel(project.priority)}</strong>
                </div>
              </div>

              {canEdit && (
                <div className="manager-project-controls">
                  <label>Update Status</label>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerProjects;