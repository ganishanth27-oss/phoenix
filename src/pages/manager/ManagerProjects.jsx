import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./ManagerProjects.css";

function ManagerProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    name: "",
    description: "",
    service_id: "",
    start_date: "",
    due_date: "",
    priority: "medium",
    status: "not_started",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/");
        return;
      }

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
        permissionData
          ?.map((item) => item.permissions?.name)
          .filter(Boolean) || [];

      if (!permissions.includes("view_projects")) {
        alert("You do not have permission to view projects.");
        navigate("/manager");
        return;
      }

      setCanCreate(permissions.includes("create_projects"));
      setCanEdit(permissions.includes("edit_projects"));
      setCanDelete(permissions.includes("delete_projects"));

      const { data: serviceData, error: serviceError } =
        await supabase
          .from("services")
          .select("id, name, description, status")
          .eq("status", "active")
          .order("name");

      if (serviceError) {
        throw serviceError;
      }

      setServices(serviceData || []);

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
          updated_at,
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

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      service_id: "",
      start_date: "",
      due_date: "",
      priority: "medium",
      status: "not_started",
    });
  };

  const openCreateForm = () => {
    if (!canCreate) {
      alert("You do not have permission to create projects.");
      return;
    }

    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    if (creating) return;

    setShowCreateForm(false);
    resetForm();
  };

  const createProject = async (event) => {
    event.preventDefault();

    if (!canCreate) {
      alert("You do not have permission to create projects.");
      return;
    }

    if (!form.name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    if (
      form.start_date &&
      form.due_date &&
      form.due_date < form.start_date
    ) {
      alert("Due date cannot be before the start date.");
      return;
    }

    setCreating(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, role, status")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (
        profile.role !== "manager" ||
        profile.status !== "active"
      ) {
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      const {
        data: newProject,
        error: projectError,
      } = await supabase
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
        .single();

      if (projectError) {
        throw projectError;
      }

      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "create_project",
          description: `Created project: ${newProject.name}`,
        });

      if (activityError) {
        console.warn(
          "Activity log could not be created:",
          activityError.message
        );
      }

      setProjects((previous) => [
        newProject,
        ...previous,
      ]);

      resetForm();
      setShowCreateForm(false);

      alert("Project created successfully.");
    } catch (error) {
      console.error("Project creation error:", error);
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const updateProject = async (
    projectId,
    field,
    value
  ) => {
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

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "delete_project",
        description: `Deleted project ID: ${projectId}`,
      });

      setProjects((previous) =>
        previous.filter(
          (project) => project.id !== projectId
        )
      );

      alert("Project deleted successfully.");
    } catch (error) {
      console.error("Project delete error:", error);
      alert(error.message);
    }
  };

  const getLabel = (value) => {
    if (!value) return "";

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      project.name?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.services?.name?.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const navigation = [
    {
      label: "WORKSPACE",
      items: [
        {
          label: "Dashboard",
          path: "/manager",
          icon: "⌂",
        },
        {
          label: "Requests",
          path: "/manager/requests",
          icon: "▣",
        },
        {
          label: "Users",
          path: "/manager/users",
          icon: "♙",
        },
        {
          label: "Projects",
          path: "/manager/projects",
          icon: "◈",
        },
        {
          label: "Tasks",
          path: "/manager/tasks",
          icon: "✓",
        },
        {
          label: "Files",
          path: "/manager/files",
          icon: "▤",
        },
        {
          label: "Review Work",
          path: "/manager/review",
          icon: "◉",
        },
        {
          label: "Reports",
          path: "/manager/reports",
          icon: "▥",
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="manager-projects-loading">
        <div className="manager-projects-loader"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={null}
      navigation={navigation}
      title="Manager Projects"
    >
      <div className="manager-projects-page">

        {/* HEADER */}

        <section className="manager-projects-top">

          <div>
            <span className="manager-projects-eyebrow">
              WORKSPACE / PROJECTS
            </span>

            <h1>My Projects</h1>

            <p>
              Manage projects assigned to your manager account.
            </p>
          </div>

          <div className="manager-project-header-actions">

            <button
              className="manager-project-refresh"
              onClick={loadProjects}
            >
              <span>↻</span>
              Refresh
            </button>

            {canCreate && (
              <button
                className="create-project-button"
                onClick={openCreateForm}
              >
                <span>+</span>
                Create Project
              </button>
            )}

          </div>

        </section>


        {/* STATS */}

        <section className="manager-project-stats">

          <div className="project-stat-card">
            <div className="project-stat-icon purple">
              ◈
            </div>

            <div>
              <span>Total Projects</span>
              <strong>{totalProjects}</strong>
            </div>
          </div>


          <div className="project-stat-card">
            <div className="project-stat-icon orange">
              ◷
            </div>

            <div>
              <span>In Progress</span>
              <strong>{activeProjects}</strong>
            </div>
          </div>


          <div className="project-stat-card">
            <div className="project-stat-icon blue">
              ◉
            </div>

            <div>
              <span>In Review</span>
              <strong>{reviewProjects}</strong>
            </div>
          </div>


          <div className="project-stat-card">
            <div className="project-stat-icon green">
              ✓
            </div>

            <div>
              <span>Completed</span>
              <strong>{completedProjects}</strong>
            </div>
          </div>

        </section>


        {/* CREATE FORM */}

        {showCreateForm && canCreate && (

          <section className="manager-create-project-card">

            <div className="manager-create-project-header">

              <div>
                <span>NEW PROJECT</span>

                <h2>Create Project</h2>

                <p>
                  Add a project to your manager workspace.
                </p>
              </div>

              <button
                type="button"
                className="close-create-project"
                onClick={closeCreateForm}
                disabled={creating}
              >
                ×
              </button>

            </div>


            <form
              className="manager-create-project-form"
              onSubmit={createProject}
            >

              <div className="project-form-group">

                <label>Project Name *</label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Enter project name"
                  required
                  disabled={creating}
                />

              </div>


              <div className="project-form-group">

                <label>Service</label>

                <select
                  name="service_id"
                  value={form.service_id}
                  onChange={handleFormChange}
                  disabled={creating}
                >
                  <option value="">
                    Select a service
                  </option>

                  {services.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                    </option>
                  ))}
                </select>

              </div>


              <div className="project-form-group">

                <label>Start Date</label>

                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleFormChange}
                  disabled={creating}
                />

              </div>


              <div className="project-form-group">

                <label>Due Date</label>

                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleFormChange}
                  min={form.start_date || undefined}
                  disabled={creating}
                />

              </div>


              <div className="project-form-group">

                <label>Priority</label>

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleFormChange}
                  disabled={creating}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

              </div>


              <div className="project-form-group">

                <label>Status</label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  disabled={creating}
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


              <div className="project-form-group project-form-full">

                <label>Description</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Describe the project requirements..."
                  rows="5"
                  disabled={creating}
                />

              </div>


              <div className="project-form-actions">

                <button
                  type="button"
                  className="project-cancel-button"
                  onClick={closeCreateForm}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="project-submit-button"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>

              </div>

            </form>

          </section>
        )}


        {/* PROJECT CONTENT */}

        <section className="manager-project-content">

          <div className="manager-project-content-header">

            <div>
              <h2>Projects</h2>
              <p>
                Track your assigned projects and their progress.
              </p>
            </div>

            <span className="project-count">
              {filteredProjects.length} project
              {filteredProjects.length !== 1 ? "s" : ""}
            </span>

          </div>


          {/* FILTERS */}

          {projects.length > 0 && (

            <div className="manager-project-toolbar">

              <div className="project-search">

                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>


              <select
                className="project-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">
                  All Status
                </option>

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


          {/* EMPTY */}

          {projects.length === 0 ? (

            <div className="manager-projects-empty">

              <div className="empty-project-icon">
                ◈
              </div>

              <h2>No Projects Assigned</h2>

              <p>
                You currently don't have any projects
                assigned to you.
              </p>

              {canCreate && (
                <button
                  onClick={openCreateForm}
                  className="create-project-empty-button"
                >
                  + Create Project
                </button>
              )}

            </div>

          ) : filteredProjects.length === 0 ? (

            <div className="manager-projects-no-results">

              <div>⌕</div>

              <h3>No projects found</h3>

              <p>
                Try changing your search or status filter.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </button>

            </div>

          ) : (

            <div className="manager-project-list">

              {filteredProjects.map((project) => (

                <article
                  className="manager-project-card"
                  key={project.id}
                >

                  {/* PROJECT HEADER */}

                  <div className="manager-project-top">

                    <div className="manager-project-heading">

                      <div className="project-service">
                        {project.services?.name ||
                          "General Project"}
                      </div>

                      <h2>{project.name}</h2>

                      <p>
                        Created {formatDate(project.created_at)}
                      </p>

                    </div>

                    <div className="manager-project-badges">

                      <span
                        className={`manager-project-priority priority-${project.priority}`}
                      >
                        {getLabel(project.priority)}
                      </span>

                      <span
                        className={`manager-project-status status-${project.status}`}
                      >
                        {getLabel(project.status)}
                      </span>

                    </div>

                  </div>


                  {/* DESCRIPTION */}

                  {project.description && (

                    <div className="manager-project-description">

                      <span>Description</span>

                      <p>{project.description}</p>

                    </div>

                  )}


                  {/* DETAILS */}

                  <div className="manager-project-details">

                    <div>
                      <span>Start Date</span>
                      <strong>
                        {formatDate(project.start_date)}
                      </strong>
                    </div>

                    <div>
                      <span>Due Date</span>
                      <strong>
                        {formatDate(project.due_date)}
                      </strong>
                    </div>

                    <div>
                      <span>Priority</span>
                      <strong>
                        {getLabel(project.priority)}
                      </strong>
                    </div>

                  </div>


                  {/* CONTROLS */}

                  {canEdit && (

                    <div className="manager-project-controls">

                      <div>
                        <label>Update Status</label>

                        <select
                          value={project.status}
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

                    </div>

                  )}


                  {/* DELETE */}

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