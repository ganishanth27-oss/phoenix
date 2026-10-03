import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Projects.css";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    service_id: "",
    manager_id: "",
    start_date: "",
    due_date: "",
    status: "not_started",
    priority: "medium",
  });

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        projectsResult,
        servicesResult,
        managersResult,
      ] = await Promise.all([
        supabase
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
            ),
            managers:manager_id (
              name,
              email
            )
          `)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("services")
          .select("id, name")
          .eq("status", "active")
          .order("name"),

        supabase
          .from("profiles")
          .select("id, name, email")
          .eq("role", "manager")
          .eq("status", "active")
          .order("name"),
      ]);

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      if (servicesResult.error) {
        throw servicesResult.error;
      }

      if (managersResult.error) {
        throw managersResult.error;
      }

      setProjects(projectsResult.data || []);
      setServices(servicesResult.data || []);
      setManagers(managersResult.data || []);
    } catch (error) {
      console.error(
        "Projects loading error:",
        error
      );

      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     CREATE PROJECT
  ===================================================== */

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Project name is required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Admin session not found."
        );
      }

      const {
        error,
      } = await supabase
        .from("projects")
        .insert({
          name: form.name.trim(),
          description:
            form.description.trim() || null,
          service_id:
            form.service_id || null,
          manager_id:
            form.manager_id || null,
          start_date:
            form.start_date || null,
          due_date:
            form.due_date || null,
          status: form.status,
          priority: form.priority,
          created_by: user.id,
        });

      if (error) {
        throw error;
      }

      alert(
        "Project created successfully."
      );

      setForm({
        name: "",
        description: "",
        service_id: "",
        manager_id: "",
        start_date: "",
        due_date: "",
        status: "not_started",
        priority: "medium",
      });

      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error(
        "Create project error:",
        error
      );

      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     UPDATE PROJECT
  ===================================================== */

  const updateProject = async (
    projectId,
    field,
    value
  ) => {
    try {
      const {
        error,
      } = await supabase
        .from("projects")
        .update({
          [field]: value || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error) {
      console.error(
        "Project update error:",
        error
      );

      alert(error.message);
    }
  };

  /* =====================================================
     STATUS LABEL
  ===================================================== */

  const getLabel = (value) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /* =====================================================
     COUNTS
  ===================================================== */

  const activeProjects = projects.filter(
    (project) =>
      project.status === "in_progress"
  ).length;

  const completedProjects = projects.filter(
    (project) =>
      project.status === "completed"
  ).length;

  const reviewProjects = projects.filter(
    (project) =>
      project.status === "review"
  ).length;

  return (
    <div className="admin-projects-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="projects-header">

        <div>
          <span className="projects-label">
            PHOENIX ADMIN
          </span>

          <h1>
            Projects
          </h1>

          <p>
            Create and manage company projects.
          </p>
        </div>

        <button
          className="create-project-button"
          onClick={() =>
            setShowForm(!showForm)
          }
        >
          {showForm
            ? "Close"
            : "+ Create Project"}
        </button>

      </div>


      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="project-summary">

        <div className="project-summary-card">
          <span>
            Total Projects
          </span>

          <strong>
            {projects.length}
          </strong>
        </div>

        <div className="project-summary-card">
          <span>
            In Progress
          </span>

          <strong>
            {activeProjects}
          </strong>
        </div>

        <div className="project-summary-card">
          <span>
            In Review
          </span>

          <strong>
            {reviewProjects}
          </strong>
        </div>

        <div className="project-summary-card">
          <span>
            Completed
          </span>

          <strong>
            {completedProjects}
          </strong>
        </div>

      </div>


      {/* =================================================
          CREATE FORM
      ================================================= */}

      {showForm && (
        <div className="project-form-card">

          <div className="project-form-header">

            <div>
              <h2>
                Create New Project
              </h2>

              <p>
                Add a new project to the
                PHOENIX workspace.
              </p>
            </div>

          </div>

          <form
            onSubmit={handleCreateProject}
          >

            <div className="project-form-grid">

              {/* Name */}

              <div className="project-field full-width">

                <label>
                  Project Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter project name"
                  required
                />

              </div>


              {/* Service */}

              <div className="project-field">

                <label>
                  Service
                </label>

                <select
                  name="service_id"
                  value={form.service_id}
                  onChange={handleChange}
                >

                  <option value="">
                    Select service
                  </option>

                  {services.map(
                    (service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* Manager */}

              <div className="project-field">

                <label>
                  Assign Manager
                </label>

                <select
                  name="manager_id"
                  value={form.manager_id}
                  onChange={handleChange}
                >

                  <option value="">
                    Select manager
                  </option>

                  {managers.map(
                    (manager) => (
                      <option
                        key={manager.id}
                        value={manager.id}
                      >
                        {manager.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* Start Date */}

              <div className="project-field">

                <label>
                  Start Date
                </label>

                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                />

              </div>


              {/* Due Date */}

              <div className="project-field">

                <label>
                  Due Date
                </label>

                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                />

              </div>


              {/* Priority */}

              <div className="project-field">

                <label>
                  Priority
                </label>

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                >

                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>

                  <option value="urgent">
                    Urgent
                  </option>

                </select>

              </div>


              {/* Status */}

              <div className="project-field">

                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
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


              {/* Description */}

              <div className="project-field full-width">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the project..."
                  rows="4"
                />

              </div>

            </div>


            <div className="project-form-actions">

              <button
                type="button"
                className="cancel-project-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-project-button"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create Project"}
              </button>

            </div>

          </form>

        </div>
      )}


      {/* =================================================
          PROJECT LIST
      ================================================= */}

      <div className="projects-card">

        <div className="projects-card-header">

          <div>
            <h2>
              All Projects
            </h2>

            <p>
              Manage current PHOENIX projects.
            </p>
          </div>

          <button
            className="refresh-projects-button"
            onClick={loadData}
          >
            ↻ Refresh
          </button>

        </div>


        {loading ? (
          <div className="projects-empty">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (

          <div className="projects-empty">

            <div className="empty-project-icon">
              📁
            </div>

            <h3>
              No projects yet
            </h3>

            <p>
              Create your first project to
              get started.
            </p>

          </div>

        ) : (

          <div className="project-list">

            {projects.map(
              (project) => (

                <div
                  className="project-item"
                  key={project.id}
                >

                  {/* Top */}

                  <div className="project-top">

                    <div>

                      <div className="project-title-row">

                        <h3>
                          {project.name}
                        </h3>

                        <span
                          className={`project-priority priority-${project.priority}`}
                        >
                          {project.priority}
                        </span>

                        <span
                          className={`project-status status-${project.status}`}
                        >
                          {getLabel(
                            project.status
                          )}
                        </span>

                      </div>

                      <p className="project-manager-text">

                        Manager:{" "}

                        <strong>
                          {project.managers?.name ||
                            "Not assigned"}
                        </strong>

                      </p>

                    </div>

                    <span className="project-created">
                      {new Date(
                        project.created_at
                      ).toLocaleDateString()}
                    </span>

                  </div>


                  {/* Details */}

                  <div className="project-details">

                    <div>
                      <span>
                        Service
                      </span>

                      <strong>
                        {project.services?.name ||
                          "Not selected"}
                      </strong>
                    </div>

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

                  </div>


                  {/* Description */}

                  {project.description && (
                    <div className="project-description">

                      <span>
                        Description
                      </span>

                      <p>
                        {project.description}
                      </p>

                    </div>
                  )}


                  {/* Controls */}

                  <div className="project-controls">

                    <div>

                      <label>
                        Status
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


                    <div>

                      <label>
                        Manager
                      </label>

                      <select
                        value={
                          project.manager_id || ""
                        }
                        onChange={(e) =>
                          updateProject(
                            project.id,
                            "manager_id",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Not assigned
                        </option>

                        {managers.map(
                          (manager) => (
                            <option
                              key={manager.id}
                              value={manager.id}
                            >
                              {manager.name}
                            </option>
                          )
                        )}

                      </select>

                    </div>


                    <div>

                      <label>
                        Priority
                      </label>

                      <select
                        value={project.priority}
                        onChange={(e) =>
                          updateProject(
                            project.id,
                            "priority",
                            e.target.value
                          )
                        }
                      >

                        <option value="low">
                          Low
                        </option>

                        <option value="medium">
                          Medium
                        </option>

                        <option value="high">
                          High
                        </option>

                        <option value="urgent">
                          Urgent
                        </option>

                      </select>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Projects;