import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./ManagerProjects.css";

function ManagerProjects() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [permissions, setPermissions] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "",
    service_id: "",
    start_date: "",
    due_date: "",
    priority: "medium",
    status: "not_started",
    description: "",
  });

  const hasPermission = (permissionName) =>
    permissions.includes(permissionName);

  const navigation = [
    {
      section: "MAIN MENU",
      items: [
        { label: "Dashboard", path: "/manager", icon: "⌂" },
        ...(hasPermission("view_requests")
          ? [{ label: "Requests", path: "/manager/requests", icon: "▣" }]
          : []),
        ...(hasPermission("view_users")
          ? [{ label: "Users", path: "/manager/users", icon: "◉" }]
          : []),
        ...(hasPermission("view_projects")
          ? [{ label: "Projects", path: "/manager/projects", icon: "◆" }]
          : []),
      ],
    },
    {
      section: "WORK",
      items: [
        ...(hasPermission("view_tasks")
          ? [{ label: "Tasks", path: "/manager/tasks", icon: "✓" }]
          : []),
        ...(hasPermission("upload_files")
          ? [{ label: "Files", path: "/manager/files", icon: "▤" }]
          : []),
        ...(hasPermission("review_work")
          ? [{ label: "Review Work", path: "/manager/review", icon: "◈" }]
          : []),
        ...(hasPermission("view_reports")
          ? [{ label: "Reports", path: "/manager/reports", icon: "▥" }]
          : []),
      ],
    },
  ];

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: managerProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      if (
        managerProfile.role !== "manager" ||
        managerProfile.status !== "active"
      ) {
        navigate("/");
        return;
      }

      setProfile(managerProfile);

      const { data: permissionRows, error: permissionError } =
        await supabase
          .from("manager_permissions")
          .select(`
            permissions (
              name
            )
          `)
          .eq("manager_id", user.id);

      if (permissionError) throw permissionError;

      const permissionNames =
        permissionRows?.map((row) => row.permissions?.name).filter(Boolean) ||
        [];

      setPermissions(permissionNames);

      if (!permissionNames.includes("view_projects")) {
        navigate("/manager");
        return;
      }

      setCanCreate(permissionNames.includes("create_projects"));
      setCanEdit(permissionNames.includes("edit_projects"));
      setCanDelete(permissionNames.includes("delete_projects"));

      await Promise.all([loadServices(), loadProjects(user.id)]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error) throw error;

    setServices(data || []);
  }

  async function loadProjects(managerId) {
    const id = managerId || profile?.id;

    if (!id) return;

    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        services (
          id,
          name
        )
      `)
      .eq("manager_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    setProjects(data || []);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      service_id: "",
      start_date: "",
      due_date: "",
      priority: "medium",
      status: "not_started",
      description: "",
    });
  }

  async function createProject(e) {
    e.preventDefault();

    if (!canCreate) return;

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (
      form.start_date &&
      form.due_date &&
      form.due_date < form.start_date
    ) {
      setError("Due date cannot be before the start date.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          service_id: form.service_id || null,
          manager_id: user.id,
          start_date: form.start_date || null,
          due_date: form.due_date || null,
          priority: form.priority,
          status: form.status,
          created_by: user.id,
        })
        .select(`
          *,
          services (
            id,
            name
          )
        `)
        .single();

      if (insertError) throw insertError;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "project_created",
        description: `Created project "${form.name.trim()}"`,
      });

      setProjects((previous) => [data, ...previous]);

      resetForm();
      setShowCreate(false);
      setSuccess("Project created successfully.");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to create project.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(projectId, status) {
    if (!canEdit) return;

    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (updateError) throw updateError;

      const currentProject = projects.find(
        (project) => project.id === projectId
      );

      if (profile?.id) {
        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          action: "project_status_updated",
          description: `Updated project "${currentProject?.name || "Project"}" to ${formatStatus(
            status
          )}`,
        });
      }

      setProjects((previous) =>
        previous.map((project) =>
          project.id === projectId
            ? { ...project, status }
            : project
        )
      );

      setSuccess("Project status updated.");

      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update project.");
    }
  }

  async function deleteProject(projectId) {
    if (!canDelete) return;

    const project = projects.find((item) => item.id === projectId);

    const confirmed = window.confirm(
      `Delete "${project?.name || "this project"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (deleteError) throw deleteError;

      if (profile?.id) {
        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          action: "project_deleted",
          description: `Deleted project "${project?.name || "Project"}"`,
        });
      }

      setProjects((previous) =>
        previous.filter((item) => item.id !== projectId)
      );

      setSuccess("Project deleted.");

      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to delete project.");
    }
  }

  function formatDate(date) {
    if (!date) return "Not set";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(status) {
    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      review: "Review",
      completed: "Completed",
      on_hold: "On Hold",
    };

    return labels[status] || status;
  }

  function formatPriority(priority) {
    return priority
      ? priority.charAt(0).toUpperCase() + priority.slice(1)
      : "Medium";
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (project) => project.status === "in_progress"
  ).length;
  const reviewProjects = projects.filter(
    (project) => project.status === "review"
  ).length;
  const completedProjects = projects.filter(
    (project) => project.status === "completed"
  ).length;

  if (loading) {
    return (
      <div className="manager-projects-loading">
        <div className="loading-spinner"></div>
        <p>Loading your projects...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={profile}
      navigation={navigation}
      title="Projects"
    >
      <div className="manager-projects-page">
        <div className="projects-header">
          <div>
            <span className="page-eyebrow">WORKSPACE</span>
            <h1>Projects</h1>
            <p>Manage and track the projects assigned to you.</p>
          </div>

          <div className="header-actions">
            <button
              className="refresh-button"
              onClick={() => loadProjects(profile?.id)}
              title="Refresh projects"
            >
              ↻
            </button>

            {canCreate && (
              <button
                className="create-project-button"
                onClick={() => {
                  setShowCreate((previous) => !previous);
                  setError("");
                }}
              >
                <span>+</span>
                Create Project
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="project-alert error">
            <span>!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="project-alert success">
            <span>✓</span>
            {success}
          </div>
        )}

        <div className="project-stats">
          <div className="project-stat-card">
            <div className="stat-icon purple">◆</div>
            <div>
              <span>Total Projects</span>
              <strong>{totalProjects}</strong>
            </div>
          </div>

          <div className="project-stat-card">
            <div className="stat-icon blue">◉</div>
            <div>
              <span>In Progress</span>
              <strong>{activeProjects}</strong>
            </div>
          </div>

          <div className="project-stat-card">
            <div className="stat-icon orange">◈</div>
            <div>
              <span>In Review</span>
              <strong>{reviewProjects}</strong>
            </div>
          </div>

          <div className="project-stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <span>Completed</span>
              <strong>{completedProjects}</strong>
            </div>
          </div>
        </div>

        {showCreate && canCreate && (
          <section className="create-project-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-label">NEW PROJECT</span>
                <h2>Create a project</h2>
                <p>Add a new project to your workspace.</p>
              </div>

              <button
                className="close-form-button"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={createProject}>
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Phoenix Website Redesign"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Service</label>
                  <select
                    name="service_id"
                    value={form.service_id}
                    onChange={handleChange}
                  >
                    <option value="">Select service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label>Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the project requirements..."
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-footer">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-project-button"
                  disabled={saving}
                >
                  {saving ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="projects-section">
          <div className="section-title-row">
            <div>
              <h2>Your Projects</h2>
              <p>{projects.length} project(s) assigned to you</p>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="empty-projects">
              <div className="empty-icon">◆</div>
              <h3>No projects yet</h3>
              <p>
                Projects assigned to you will appear here.
              </p>

              {canCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="empty-create-button"
                >
                  + Create your first project
                </button>
              )}
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="project-card-top">
                    <div className="project-service">
                      {project.services?.name || "General Project"}
                    </div>

                    <span
                      className={`priority-badge ${project.priority}`}
                    >
                      {formatPriority(project.priority)}
                    </span>
                  </div>

                  <div className="project-card-content">
                    <h3>{project.name}</h3>

                    <p className="project-description">
                      {project.description ||
                        "No project description provided."}
                    </p>

                    <div className="project-dates">
                      <div>
                        <span>START DATE</span>
                        <strong>{formatDate(project.start_date)}</strong>
                      </div>

                      <div>
                        <span>DUE DATE</span>
                        <strong>{formatDate(project.due_date)}</strong>
                      </div>
                    </div>

                    <div className="project-card-footer">
                      <div className="status-control">
                        <span>STATUS</span>

                        {canEdit ? (
                          <select
                            value={project.status}
                            onChange={(e) =>
                              updateStatus(
                                project.id,
                                e.target.value
                              )
                            }
                            className={`status-select ${project.status}`}
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
                            <option value="on_hold">
                              On Hold
                            </option>
                            <option value="completed">
                              Completed
                            </option>
                          </select>
                        ) : (
                          <strong className="status-text">
                            {formatStatus(project.status)}
                          </strong>
                        )}
                      </div>

                      {canDelete && (
                        <button
                          className="delete-project-button"
                          onClick={() =>
                            deleteProject(project.id)
                          }
                          title="Delete project"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default ManagerProjects;