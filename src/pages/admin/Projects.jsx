import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function ManagerProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    service_id: "",
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
      /* =================================================
         GET CURRENT USER
      ================================================= */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        navigate("/");
        return;
      }

      /* =================================================
         CHECK MANAGER PROFILE
      ================================================= */

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, email, role, status")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (
        profile.role !== "manager" ||
        profile.status !== "active"
      ) {
        alert("You do not have manager access.");
        navigate("/");
        return;
      }

      /* =================================================
         LOAD MANAGER PERMISSIONS
      ================================================= */

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
          ?.map(
            (item) =>
              item.permissions?.name
          )
          .filter(Boolean) || [];

      /* =================================================
         VIEW PROJECT PERMISSION
      ================================================= */

      if (!permissions.includes("view_projects")) {
        alert(
          "You do not have permission to view projects."
        );

        navigate("/manager");
        return;
      }

      /* =================================================
         SET PERMISSIONS
      ================================================= */

      setCanCreate(
        permissions.includes("create_projects")
      );

      setCanEdit(
        permissions.includes("edit_projects")
      );

      setCanDelete(
        permissions.includes("delete_projects")
      );

      /* =================================================
         LOAD MANAGER PROJECTS
      ================================================= */

      const {
        data: projectData,
        error: projectError,
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
          created_by,
          created_at,
          updated_at,

          services:service_id (
            id,
            name
          )
        `)
        .eq("manager_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (projectError) {
        throw projectError;
      }

      /* =================================================
         LOAD ACTIVE SERVICES
      ================================================= */

      const {
        data: serviceData,
        error: serviceError,
      } = await supabase
        .from("services")
        .select("id, name")
        .eq("status", "active")
        .order("name", {
          ascending: true,
        });

      if (serviceError) {
        throw serviceError;
      }

      setProjects(projectData || []);
      setServices(serviceData || []);
    } catch (error) {
      console.error(
        "Manager projects loading error:",
        error
      );

      alert(
        error.message ||
          "Failed to load projects."
      );
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

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      service_id: "",
      start_date: "",
      due_date: "",
      status: "not_started",
      priority: "medium",
    });
  };

  /* =====================================================
     CREATE PROJECT
  ===================================================== */

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!canCreate) {
      alert(
        "You do not have permission to create projects."
      );
      return;
    }

    const projectName = form.name.trim();

    if (!projectName) {
      alert("Project name is required.");
      return;
    }

    /* =================================================
       DATE VALIDATION
    ================================================= */

    if (
      form.start_date &&
      form.due_date &&
      form.due_date < form.start_date
    ) {
      alert(
        "Due date cannot be before the start date."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Manager session not found."
        );
      }

      /* =================================================
         CREATE PROJECT
      ================================================= */

      const {
        data: createdProject,
        error,
      } = await supabase
        .from("projects")
        .insert({
          name: projectName,

          description:
            form.description.trim() || null,

          service_id:
            form.service_id || null,

          /*
            Automatically assign the
            logged-in manager.
          */
          manager_id: user.id,

          start_date:
            form.start_date || null,

          due_date:
            form.due_date || null,

          status: form.status,

          priority: form.priority,

          created_by: user.id,
        })
        .select("id, name")
        .single();

      if (error) {
        throw error;
      }

      /* =================================================
         ACTIVITY LOG
      ================================================= */

      const { error: activityError } =
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user.id,
            action:
              "manager_created_project",
            description:
              `Manager created project "${projectName}"`,
          });

      if (activityError) {
        console.warn(
          "Activity log failed:",
          activityError.message
        );
      }

      console.log(
        "Created project:",
        createdProject
      );

      alert(
        "Project created successfully."
      );

      resetForm();
      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error(
        "Create project error:",
        error
      );

      alert(
        error.message ||
          "Failed to create project."
      );
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
    if (!canEdit) {
      alert(
        "You do not have permission to edit projects."
      );
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

      /* =================================================
         VERIFY PROJECT BELONGS TO MANAGER
      ================================================= */

      const project = projects.find(
        (item) =>
          item.id === projectId
      );

      if (
        !project ||
        project.manager_id !== user.id
      ) {
        alert(
          "You can only edit your own projects."
        );
        return;
      }

      /* =================================================
         UPDATE PROJECT
      ================================================= */

      const {
        error,
      } = await supabase
        .from("projects")
        .update({
          [field]: value,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      /* =================================================
         ACTIVITY LOG
      ================================================= */

      const { error: activityError } =
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user.id,
            action:
              "manager_updated_project",
            description:
              `Manager updated ${field} of project "${project.name}"`,
          });

      if (activityError) {
        console.warn(
          "Activity log failed:",
          activityError.message
        );
      }

      await loadData();
    } catch (error) {
      console.error(
        "Project update error:",
        error
      );

      alert(
        error.message ||
          "Failed to update project."
      );
    }
  };

  /* =====================================================
     DELETE PROJECT
  ===================================================== */

  const deleteProject = async (
    projectId
  ) => {
    if (!canDelete) {
      alert(
        "You do not have permission to delete projects."
      );
      return;
    }

    const project = projects.find(
      (item) =>
        item.id === projectId
    );

    if (!project) {
      alert("Project not found.");
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${project.name}"?`
      );

    if (!confirmed) {
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

      /* =================================================
         DELETE ONLY OWN PROJECT
      ================================================= */

      const {
        error,
      } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      /* =================================================
         ACTIVITY LOG
      ================================================= */

      const { error: activityError } =
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user.id,
            action:
              "manager_deleted_project",
            description:
              `Manager deleted project "${project.name}"`,
          });

      if (activityError) {
        console.warn(
          "Activity log failed:",
          activityError.message
        );
      }

      alert(
        "Project deleted successfully."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Project delete error:",
        error
      );

      alert(
        error.message ||
          "Failed to delete project."
      );
    }
  };

  /* =====================================================
     STATUS LABEL
  ===================================================== */

  const getLabel = (value) => {
    if (!value) {
      return "";
    }

    return value
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  /* =====================================================
     COUNTS
  ===================================================== */

  const activeProjects =
    projects.filter(
      (project) =>
        project.status ===
        "in_progress"
    ).length;

  const completedProjects =
    projects.filter(
      (project) =>
        project.status ===
        "completed"
    ).length;

  const reviewProjects =
    projects.filter(
      (project) =>
        project.status ===
        "review"
    ).length;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="manager-projects-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="manager-projects-header">

        <div>

          <span>
            PHOENIX MANAGER
          </span>

          <h1>
            My Projects
          </h1>

          <p>
            Projects assigned to your account.
          </p>

        </div>

        <div
          className="manager-project-header-actions"
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >

          {canCreate && (
            <button
              className="create-project-button"
              onClick={() =>
                setShowForm(
                  !showForm
                )
              }
            >
              {showForm
                ? "Close"
                : "+ Create Project"}
            </button>
          )}

          <button
            className="back-manager-button"
            onClick={() =>
              navigate("/manager")
            }
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="project-summary">

        <div className="project-summary-card">
          <span>
            My Projects
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

      {showForm &&
        canCreate && (
          <div className="project-form-card">

            <div className="project-form-header">

              <div>

                <h2>
                  Create New Project
                </h2>

                <p>
                  Add a new project to your
                  PHOENIX workspace.
                </p>

              </div>

            </div>

            <form
              onSubmit={
                handleCreateProject
              }
            >

              <div className="project-form-grid">

                {/* PROJECT NAME */}

                <div className="project-field full-width">

                  <label>
                    Project Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      form.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter project name"
                    required
                  />

                </div>

                {/* SERVICE */}

                <div className="project-field">

                  <label>
                    Service
                  </label>

                  <select
                    name="service_id"
                    value={
                      form.service_id
                    }
                    onChange={
                      handleChange
                    }
                  >

                    <option value="">
                      Select service
                    </option>

                    {services.map(
                      (service) => (
                        <option
                          key={
                            service.id
                          }
                          value={
                            service.id
                          }
                        >
                          {
                            service.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* START DATE */}

                <div className="project-field">

                  <label>
                    Start Date
                  </label>

                  <input
                    type="date"
                    name="start_date"
                    value={
                      form.start_date
                    }
                    onChange={
                      handleChange
                    }
                  />

                </div>

                {/* DUE DATE */}

                <div className="project-field">

                  <label>
                    Due Date
                  </label>

                  <input
                    type="date"
                    name="due_date"
                    value={
                      form.due_date
                    }
                    onChange={
                      handleChange
                    }
                  />

                </div>

                {/* PRIORITY */}

                <div className="project-field">

                  <label>
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={
                      form.priority
                    }
                    onChange={
                      handleChange
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

                {/* STATUS */}

                <div className="project-field">

                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      form.status
                    }
                    onChange={
                      handleChange
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

                {/* DESCRIPTION */}

                <div className="project-field full-width">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Describe the project..."
                    rows="4"
                  />

                </div>

              </div>

              {/* FORM ACTIONS */}

              <div className="project-form-actions">

                <button
                  type="button"
                  className="cancel-project-button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={saving}
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
              My Projects
            </h2>

            <p>
              Projects currently assigned
              to your account.
            </p>

          </div>

          <button
            className="refresh-projects-button"
            onClick={loadData}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : "↻ Refresh"}
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
              You currently don't have
              any projects assigned to you.
            </p>

            {canCreate && (
              <button
                className="create-project-button"
                onClick={() =>
                  setShowForm(true)
                }
              >
                + Create Project
              </button>
            )}

          </div>

        ) : (

          <div className="project-list">

            {projects.map(
              (project) => (

                <div
                  className="project-item"
                  key={
                    project.id
                  }
                >

                  {/* =================================================
                      PROJECT TOP
                  ================================================= */}

                  <div className="project-top">

                    <div>

                      <div className="project-title-row">

                        <h3>
                          {
                            project.name
                          }
                        </h3>

                        <span
                          className={`project-priority priority-${project.priority}`}
                        >
                          {
                            getLabel(
                              project.priority
                            )
                          }
                        </span>

                        <span
                          className={`project-status status-${project.status}`}
                        >
                          {
                            getLabel(
                              project.status
                            )
                          }
                        </span>

                      </div>

                      <p className="project-manager-text">

                        Service:{" "}

                        <strong>
                          {
                            project
                              .services
                              ?.name ||
                            "Not selected"
                          }
                        </strong>

                      </p>

                    </div>

                    <span className="project-created">

                      {new Date(
                        project.created_at
                      ).toLocaleDateString()}

                    </span>

                  </div>

                  {/* =================================================
                      DETAILS
                  ================================================= */}

                  <div className="project-details">

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
                        {
                          getLabel(
                            project.priority
                          )
                        }
                      </strong>

                    </div>

                  </div>

                  {/* =================================================
                      DESCRIPTION
                  ================================================= */}

                  {project.description && (
                    <div className="project-description">

                      <span>
                        Description
                      </span>

                      <p>
                        {
                          project.description
                        }
                      </p>

                    </div>
                  )}

                  {/* =================================================
                      EDIT CONTROLS
                  ================================================= */}

                  {canEdit && (
                    <div className="project-controls">

                      <div>

                        <label>
                          Status
                        </label>

                        <select
                          value={
                            project.status
                          }
                          onChange={(event) =>
                            updateProject(
                              project.id,
                              "status",
                              event.target.value
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
                          Priority
                        </label>

                        <select
                          value={
                            project.priority
                          }
                          onChange={(event) =>
                            updateProject(
                              project.id,
                              "priority",
                              event.target.value
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
                  )}

                  {/* =================================================
                      DELETE
                  ================================================= */}

                  {canDelete && (
                    <div
                      style={{
                        marginTop:
                          "16px",
                        display:
                          "flex",
                        justifyContent:
                          "flex-end",
                      }}
                    >

                      <button
                        className="manager-project-delete"
                        onClick={() =>
                          deleteProject(
                            project.id
                          )
                        }
                      >
                        Delete Project
                      </button>

                    </div>
                  )}

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default ManagerProjects;
