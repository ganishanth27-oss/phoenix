import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function Projects() {
  const navigate = useNavigate();

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

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    setLoading(true);

    try {
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

      // =====================================================
      // CHECK ADMIN PROFILE
      // =====================================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (
        profile.role !== "admin" ||
        profile.status !== "active"
      ) {
        alert("You do not have admin access.");
        navigate("/");
        return;
      }

      // =====================================================
      // LOAD PROJECTS
      // =====================================================

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
          ),

          manager:manager_id (
            id,
            name,
            email
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (projectError) {
        throw projectError;
      }

      // =====================================================
      // LOAD SERVICES
      // =====================================================

      const {
        data: serviceData,
        error: serviceError,
      } = await supabase
        .from("services")
        .select("id, name, description, status")
        .eq("status", "active")
        .order("name", {
          ascending: true,
        });

      if (serviceError) {
        throw serviceError;
      }

      // =====================================================
      // LOAD MANAGERS
      // =====================================================

      const {
        data: managerData,
        error: managerError,
      } = await supabase
        .from("profiles")
        .select("id, name, email, status")
        .eq("role", "manager")
        .eq("status", "active")
        .order("name", {
          ascending: true,
        });

      if (managerError) {
        throw managerError;
      }

      setProjects(projectData || []);
      setServices(serviceData || []);
      setManagers(managerData || []);
    } catch (error) {
      console.error(
        "Admin projects loading error:",
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

  // =========================================================
  // FORM CHANGE
  // =========================================================

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

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
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
  };

  // =========================================================
  // OPEN FORM
  // =========================================================

  const openCreateForm = () => {
    setShowForm(true);
  };

  // =========================================================
  // CLOSE FORM
  // =========================================================

  const closeCreateForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  };

  // =========================================================
  // CREATE PROJECT
  // =========================================================

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    if (!form.manager_id) {
      alert("Please select a manager.");
      return;
    }

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
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/");
        return;
      }

      // ===================================================
      // CREATE PROJECT
      // ===================================================

      const {
        data: newProject,
        error: projectError,
      } = await supabase
        .from("projects")
        .insert({
          name: form.name.trim(),

          description:
            form.description.trim() || null,

          service_id:
            form.service_id || null,

          manager_id:
            form.manager_id,

          start_date:
            form.start_date || null,

          due_date:
            form.due_date || null,

          status:
            form.status,

          priority:
            form.priority,

          created_by:
            user.id,
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
          created_by,
          created_at,

          services:service_id (
            id,
            name
          ),

          manager:manager_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (projectError) {
        throw projectError;
      }

      // ===================================================
      // ACTIVITY LOG
      // ===================================================

      const selectedManager =
        managers.find(
          (manager) =>
            manager.id === form.manager_id
        );

      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "create_project",
          description:
            `Admin created project "${newProject.name}" and assigned it to ${selectedManager?.name || "manager"}.`,
        });

      // ===================================================
      // UPDATE UI
      // ===================================================

      setProjects((previous) => [
        newProject,
        ...previous,
      ]);

      resetForm();
      setShowForm(false);

      alert(
        "Project created and assigned successfully."
      );
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

  // =========================================================
  // UPDATE PROJECT
  // =========================================================

  const updateProject = async (
    projectId,
    field,
    value
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const {
        error,
      } = await supabase
        .from("projects")
        .update({
          [field]: value,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) {
        throw error;
      }

      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "update_project",
          description:
            `Admin updated project ${projectId}: ${field}`,
        });

      await loadData();
    } catch (error) {
      console.error(
        "Update project error:",
        error
      );

      alert(error.message);
    }
  };

  // =========================================================
  // DELETE PROJECT
  // =========================================================

  const deleteProject = async (
    projectId,
    projectName
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${projectName}"?`
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

      const {
        error,
      } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        throw error;
      }

      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "delete_project",
          description:
            `Admin deleted project "${projectName}".`,
        });

      alert(
        "Project deleted successfully."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Delete project error:",
        error
      );

      alert(error.message);
    }
  };

  // =========================================================
  // LABEL
  // =========================================================

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

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "30px",
        }}
      >

        <div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#6b7280",
              letterSpacing:
                "1.5px",
            }}
          >
            PHOENIX ADMIN
          </span>

          <h1
            style={{
              margin:
                "6px 0",
              fontSize: "32px",
              color: "#111827",
            }}
          >
            Projects
          </h1>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
            }}
          >
            Create and manage all
            company projects.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >

          <button
            onClick={() =>
              openCreateForm()
            }
            style={{
              border: "none",
              borderRadius: "10px",
              padding:
                "12px 18px",
              background:
                "#111827",
              color: "#ffffff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            + Create Project
          </button>

          <button
            onClick={() =>
              navigate("/admin")
            }
            style={{
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              padding:
                "12px 18px",
              background:
                "#ffffff",
              color: "#111827",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* =====================================================
          CREATE PROJECT FORM
      ===================================================== */}

      {showForm && (

        <section
          style={{
            background:
              "#ffffff",
            borderRadius: "18px",
            padding: "28px",
            marginBottom: "30px",
            border:
              "1px solid #e5e7eb",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              marginBottom:
                "25px",
            }}
          >

            <div>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#6b7280",
                  letterSpacing:
                    "1.5px",
                }}
              >
                NEW PROJECT
              </span>

              <h2
                style={{
                  margin:
                    "6px 0",
                  fontSize: "24px",
                  color:
                    "#111827",
                }}
              >
                Create Project
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "#6b7280",
                }}
              >
                Create and assign a
                new project to a
                manager.
              </p>

            </div>

            <button
              type="button"
              onClick={
                closeCreateForm
              }
              disabled={saving}
              style={{
                border: "none",
                background:
                  "transparent",
                fontSize: "28px",
                cursor: "pointer",
                color:
                  "#6b7280",
              }}
            >
              ×
            </button>

          </div>

          <form
            onSubmit={
              handleCreateProject
            }
          >

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "20px",
              }}
            >

              {/* PROJECT NAME */}

              <div>

                <label
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "8px",
                    fontWeight:
                      "600",
                    color:
                      "#374151",
                  }}
                >
                  Project Name *
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
                  disabled={
                    saving
                  }
                  style={inputStyle}
                />

              </div>

              {/* SERVICE */}

              <div>

                <label
                  style={labelStyle}
                >
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
                  disabled={
                    saving
                  }
                  style={inputStyle}
                >

                  <option value="">
                    Select a service
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

              {/* MANAGER */}

              <div>

                <label
                  style={labelStyle}
                >
                  Assign Manager *
                </label>

                <select
                  name="manager_id"
                  value={
                    form.manager_id
                  }
                  onChange={
                    handleChange
                  }
                  required
                  disabled={
                    saving
                  }
                  style={inputStyle}
                >

                  <option value="">
                    Select a manager
                  </option>

                  {managers.map(
                    (manager) => (
                      <option
                        key={
                          manager.id
                        }
                        value={
                          manager.id
                        }
                      >
                        {manager.name}
                        {" — "}
                        {
                          manager.email
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* START DATE */}

              <div>

                <label
                  style={labelStyle}
                >
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
                  disabled={
                    saving
                  }
                  style={inputStyle}
                />

              </div>

              {/* DUE DATE */}

              <div>

                <label
                  style={labelStyle}
                >
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
                  min={
                    form.start_date ||
                    undefined
                  }
                  disabled={
                    saving
                  }
                  style={inputStyle}
                />

              </div>

              {/* PRIORITY */}

              <div>

                <label
                  style={labelStyle}
                >
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
                  disabled={
                    saving
                  }
                  style={inputStyle}
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

              <div>

                <label
                  style={labelStyle}
                >
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
                  disabled={
                    saving
                  }
                  style={inputStyle}
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

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >

                <label
                  style={labelStyle}
                >
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
                  placeholder="Describe the project requirements..."
                  rows="5"
                  disabled={
                    saving
                  }
                  style={{
                    ...inputStyle,
                    resize:
                      "vertical",
                  }}
                />

              </div>

            </div>

            {/* FORM BUTTONS */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "12px",
                marginTop:
                  "25px",
              }}
            >

              <button
                type="button"
                onClick={
                  closeCreateForm
                }
                disabled={
                  saving
                }
                style={{
                  border:
                    "1px solid #d1d5db",
                  borderRadius:
                    "10px",
                  padding:
                    "12px 20px",
                  background:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontWeight:
                    "600",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
                style={{
                  border: "none",
                  borderRadius:
                    "10px",
                  padding:
                    "12px 22px",
                  background:
                    "#111827",
                  color:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                {saving
                  ? "Creating..."
                  : "Create Project"}
              </button>

            </div>

          </form>

        </section>

      )}

      {/* =====================================================
          PROJECT LIST
      ===================================================== */}

      {loading ? (

        <div
          style={{
            background:
              "#ffffff",
            borderRadius:
              "16px",
            padding: "40px",
            textAlign:
              "center",
          }}
        >
          Loading projects...
        </div>

      ) : projects.length === 0 ? (

        <div
          style={{
            background:
              "#ffffff",
            borderRadius:
              "16px",
            padding: "50px",
            textAlign:
              "center",
            border:
              "1px solid #e5e7eb",
          }}
        >

          <div
            style={{
              fontSize:
                "42px",
              marginBottom:
                "12px",
            }}
          >
            📁
          </div>

          <h2>
            No Projects Found
          </h2>

          <p
            style={{
              color:
                "#6b7280",
            }}
          >
            Create your first
            project using the
            button above.
          </p>

        </div>

      ) : (

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >

          {projects.map(
            (project) => (

              <div
                key={project.id}
                style={{
                  background:
                    "#ffffff",
                  borderRadius:
                    "16px",
                  padding:
                    "22px",
                  border:
                    "1px solid #e5e7eb",
                  boxShadow:
                    "0 5px 18px rgba(0,0,0,0.04)",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                  }}
                >

                  <div>

                    <h2
                      style={{
                        margin:
                          "0 0 8px",
                        fontSize:
                          "20px",
                      }}
                    >
                      {project.name}
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color:
                          "#6b7280",
                      }}
                    >
                      {project.services
                        ?.name ||
                        "No service"}
                    </p>

                  </div>

                  <span
                    style={{
                      height:
                        "fit-content",
                      padding:
                        "6px 10px",
                      borderRadius:
                        "999px",
                      background:
                        "#f3f4f6",
                      fontSize:
                        "12px",
                      fontWeight:
                        "700",
                    }}
                  >
                    {getLabel(
                      project.status
                    )}
                  </span>

                </div>

                {project.description && (

                  <p
                    style={{
                      color:
                        "#4b5563",
                      lineHeight:
                        "1.6",
                      marginTop:
                        "18px",
                    }}
                  >
                    {
                      project.description
                    }
                  </p>

                )}

                <div
                  style={{
                    marginTop:
                      "18px",
                    paddingTop:
                      "18px",
                    borderTop:
                      "1px solid #e5e7eb",
                  }}
                >

                  <p
                    style={{
                      margin:
                        "6px 0",
                    }}
                  >
                    <strong>
                      Manager:
                    </strong>{" "}
                    {project.manager
                      ?.name ||
                      "Unassigned"}
                  </p>

                  <p
                    style={{
                      margin:
                        "6px 0",
                    }}
                  >
                    <strong>
                      Priority:
                    </strong>{" "}
                    {getLabel(
                      project.priority
                    )}
                  </p>

                  <p
                    style={{
                      margin:
                        "6px 0",
                    }}
                  >
                    <strong>
                      Start:
                    </strong>{" "}
                    {project.start_date
                      ? new Date(
                          project.start_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </p>

                  <p
                    style={{
                      margin:
                        "6px 0",
                    }}
                  >
                    <strong>
                      Due:
                    </strong>{" "}
                    {project.due_date
                      ? new Date(
                          project.due_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </p>

                </div>

                {/* STATUS UPDATE */}

                <div
                  style={{
                    marginTop:
                      "18px",
                  }}
                >

                  <label
                    style={{
                      display:
                        "block",
                      fontSize:
                        "13px",
                      fontWeight:
                        "600",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Update Status
                  </label>

                  <select
                    value={
                      project.status
                    }
                    onChange={(event) =>
                      updateProject(
                        project.id,
                        "status",
                        event.target
                          .value
                      )
                    }
                    style={{
                      ...inputStyle,
                      width:
                        "100%",
                    }}
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

                {/* DELETE */}

                <button
                  onClick={() =>
                    deleteProject(
                      project.id,
                      project.name
                    )
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "14px",
                    padding:
                      "10px",
                    border:
                      "1px solid #fecaca",
                    borderRadius:
                      "9px",
                    background:
                      "#fff5f5",
                    color:
                      "#dc2626",
                    fontWeight:
                      "700",
                    cursor:
                      "pointer",
                  }}
                >
                  Delete Project
                </button>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}

// =========================================================
// COMMON STYLES
// =========================================================

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "600",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "12px 13px",
  fontSize: "14px",
  outline: "none",
  background: "#ffffff",
};

export default Projects;