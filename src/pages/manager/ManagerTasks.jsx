import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerTasks.css";

function ManagerTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canAssign, setCanAssign] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    service_id: "",
    user_id: "",
    priority: "medium",
    status: "pending",
    due_date: "",
  });

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadTasks = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      /* =================================================
         LOAD PERMISSIONS
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
          ?.map((item) => item.permissions?.name)
          .filter(Boolean) || [];

      if (!permissions.includes("view_tasks")) {
        alert(
          "You do not have permission to view tasks."
        );

        navigate("/manager");
        return;
      }

      setCanCreate(
        permissions.includes("create_tasks")
      );

      setCanEdit(
        permissions.includes("edit_tasks")
      );

      setCanDelete(
        permissions.includes("delete_tasks")
      );

      setCanAssign(
        permissions.includes("assign_tasks")
      );

      /* =================================================
         LOAD TASKS
      ================================================= */

      const {
        data: taskData,
        error: taskError,
      } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          project_id,
          service_id,
          manager_id,
          user_id,
          priority,
          status,
          due_date,
          created_at,

          projects:project_id (
            name
          ),

          services:service_id (
            name
          ),

          users:user_id (
            name,
            email
          )
        `)
        .eq("manager_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (taskError) {
        throw taskError;
      }

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
          name
        `)
        .eq("manager_id", user.id)
        .order("name");

      if (projectError) {
        throw projectError;
      }

      /* =================================================
         LOAD SERVICES
      ================================================= */

      const {
        data: serviceData,
        error: serviceError,
      } = await supabase
        .from("services")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (serviceError) {
        throw serviceError;
      }

      /* =================================================
         LOAD USERS
      ================================================= */

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "user")
        .eq("status", "active")
        .order("name");

      if (userError) {
        throw userError;
      }

      setTasks(taskData || []);
      setProjects(projectData || []);
      setServices(serviceData || []);
      setUsers(userData || []);
    } catch (error) {
      console.error(
        "Manager tasks error:",
        error
      );

      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
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
     CREATE TASK
  ===================================================== */

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!canCreate) {
      alert(
        "You do not have permission to create tasks."
      );
      return;
    }

    if (!form.title.trim()) {
      alert("Task title is required.");
      return;
    }

    if (!form.project_id) {
      alert("Please select a project.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .insert({
          title: form.title.trim(),

          description:
            form.description.trim() || null,

          project_id:
            form.project_id,

          service_id:
            form.service_id || null,

          manager_id: user.id,

          user_id:
            canAssign && form.user_id
              ? form.user_id
              : null,

          priority:
            form.priority,

          status:
            form.status,

          due_date:
            form.due_date || null,

          created_by:
            user.id,
        });

      if (error) {
        throw error;
      }

      alert(
        "Task created successfully."
      );

      setForm({
        title: "",
        description: "",
        project_id: "",
        service_id: "",
        user_id: "",
        priority: "medium",
        status: "pending",
        due_date: "",
      });

      setShowForm(false);

      await loadTasks();
    } catch (error) {
      console.error(
        "Create task error:",
        error
      );

      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     UPDATE TASK STATUS
  ===================================================== */

  const updateTaskStatus = async (
    taskId,
    status
  ) => {
    if (!canEdit) {
      alert(
        "You do not have permission to edit tasks."
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

      const { error } = await supabase
        .from("tasks")
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      await loadTasks();
    } catch (error) {
      console.error(
        "Task update error:",
        error
      );

      alert(error.message);
    }
  };

  /* =====================================================
     UPDATE TASK ASSIGNMENT
  ===================================================== */

  const updateTaskUser = async (
    taskId,
    userId
  ) => {
    if (!canAssign) {
      alert(
        "You do not have permission to assign tasks."
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

      const { error } = await supabase
        .from("tasks")
        .update({
          user_id: userId || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      await loadTasks();
    } catch (error) {
      console.error(
        "Task assignment error:",
        error
      );

      alert(error.message);
    }
  };

  /* =====================================================
     DELETE TASK
  ===================================================== */

  const deleteTask = async (taskId) => {
    if (!canDelete) {
      alert(
        "You do not have permission to delete tasks."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
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

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      alert(
        "Task deleted successfully."
      );

      await loadTasks();
    } catch (error) {
      console.error(
        "Task delete error:",
        error
      );

      alert(error.message);
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
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /* =====================================================
     COUNTS
  ===================================================== */

  const totalTasks = tasks.length;

  const pendingTasks = tasks.filter(
    (task) =>
      task.status === "pending"
  ).length;

  const activeTasks = tasks.filter(
    (task) =>
      task.status === "in_progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) =>
      task.status === "completed"
  ).length;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="manager-tasks-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="manager-tasks-header">

        <div>

          <span>
            PHOENIX MANAGER
          </span>

          <h1>
            My Tasks
          </h1>

          <p>
            Manage tasks assigned to
            your projects.
          </p>

        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >

          {canCreate && (
            <button
              className="create-task-button"
              onClick={() =>
                setShowForm(!showForm)
              }
            >
              {showForm
                ? "Close"
                : "+ Create Task"}
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

      <section className="manager-task-summary">

        <div className="manager-task-summary-card">

          <span>
            Total Tasks
          </span>

          <strong>
            {totalTasks}
          </strong>

        </div>

        <div className="manager-task-summary-card">

          <span>
            Pending
          </span>

          <strong>
            {pendingTasks}
          </strong>

        </div>

        <div className="manager-task-summary-card">

          <span>
            In Progress
          </span>

          <strong>
            {activeTasks}
          </strong>

        </div>

        <div className="manager-task-summary-card">

          <span>
            Completed
          </span>

          <strong>
            {completedTasks}
          </strong>

        </div>

      </section>

      {/* =================================================
          CREATE TASK FORM
      ================================================= */}

      {showForm && canCreate && (

        <div className="manager-task-form-card">

          <div>
            <h2>
              Create New Task
            </h2>

            <p>
              Create a task for one of
              your projects.
            </p>
          </div>

          <form
            onSubmit={handleCreateTask}
          >

            <div className="manager-task-form-grid">

              {/* TITLE */}

              <div className="manager-task-field full-width">

                <label>
                  Task Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter task title"
                  required
                />

              </div>

              {/* PROJECT */}

              <div className="manager-task-field">

                <label>
                  Project
                </label>

                <select
                  name="project_id"
                  value={form.project_id}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select project
                  </option>

                  {projects.map(
                    (project) => (

                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* SERVICE */}

              <div className="manager-task-field">

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

              {/* ASSIGNED USER */}

              {canAssign && (

                <div className="manager-task-field">

                  <label>
                    Assign User
                  </label>

                  <select
                    name="user_id"
                    value={form.user_id}
                    onChange={handleChange}
                  >

                    <option value="">
                      Not assigned
                    </option>

                    {users.map(
                      (item) => (

                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name} — {item.email}
                        </option>

                      )
                    )}

                  </select>

                </div>

              )}

              {/* PRIORITY */}

              <div className="manager-task-field">

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

              {/* STATUS */}

              <div className="manager-task-field">

                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >

                  <option value="pending">
                    Pending
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

                </select>

              </div>

              {/* DUE DATE */}

              <div className="manager-task-field">

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

              {/* DESCRIPTION */}

              <div className="manager-task-field full-width">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the task..."
                  rows="4"
                />

              </div>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "20px",
              }}
            >

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create Task"}
              </button>

            </div>

          </form>

        </div>

      )}

      {/* =================================================
          TASK LIST
      ================================================= */}

      {loading ? (

        <div className="manager-tasks-empty">
          Loading tasks...
        </div>

      ) : tasks.length === 0 ? (

        <div className="manager-tasks-empty">

          <div className="manager-task-empty-icon">
            ✓
          </div>

          <h2>
            No Tasks Yet
          </h2>

          <p>
            You currently don't have
            any tasks for your projects.
          </p>

          {canCreate && (
            <button
              onClick={() =>
                setShowForm(true)
              }
            >
              + Create Task
            </button>
          )}

        </div>

      ) : (

        <section className="manager-task-list">

          {tasks.map((task) => (

            <div
              className="manager-task-card"
              key={task.id}
            >

              {/* TASK HEADER */}

              <div className="manager-task-top">

                <div>

                  <div className="manager-task-title-row">

                    <h2>
                      {task.title}
                    </h2>

                    <span
                      className={`task-priority priority-${task.priority}`}
                    >
                      {task.priority}
                    </span>

                  </div>

                  <p className="manager-task-project">

                    Project:{" "}

                    <strong>
                      {task.projects?.name ||
                        "No project"}
                    </strong>

                  </p>

                </div>

                <span
                  className={`task-status status-${task.status}`}
                >
                  {getLabel(task.status)}
                </span>

              </div>

              {/* DESCRIPTION */}

              {task.description && (

                <div className="manager-task-description">

                  <span>
                    Description
                  </span>

                  <p>
                    {task.description}
                  </p>

                </div>

              )}

              {/* DETAILS */}

              <div className="manager-task-details">

                <div>

                  <span>
                    Service
                  </span>

                  <strong>
                    {task.services?.name ||
                      "Not selected"}
                  </strong>

                </div>

                <div>

                  <span>
                    Assigned User
                  </span>

                  <strong>
                    {task.users?.name ||
                      "Not assigned"}
                  </strong>

                </div>

                <div>

                  <span>
                    Due Date
                  </span>

                  <strong>
                    {task.due_date
                      ? new Date(
                          task.due_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </strong>

                </div>

              </div>

              {/* EDIT CONTROLS */}

              {canEdit && (

                <div className="manager-task-controls">

                  <label>
                    Update Task Status
                  </label>

                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTaskStatus(
                        task.id,
                        e.target.value
                      )
                    }
                  >

                    <option value="pending">
                      Pending
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

                  </select>

                </div>

              )}

              {/* ASSIGN USER */}

              {canAssign && (

                <div
                  className="manager-task-controls"
                  style={{
                    marginTop: "12px",
                  }}
                >

                  <label>
                    Assign User
                  </label>

                  <select
                    value={task.user_id || ""}
                    onChange={(e) =>
                      updateTaskUser(
                        task.id,
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Not assigned
                    </option>

                    {users.map(
                      (item) => (

                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>

                      )
                    )}

                  </select>

                </div>

              )}

              {/* DELETE */}

              {canDelete && (

                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >

                  <button
                    className="manager-task-delete"
                    onClick={() =>
                      deleteTask(task.id)
                    }
                  >
                    Delete Task
                  </button>

                </div>

              )}

            </div>

          ))}

        </section>

      )}

    </div>
  );
}

export default ManagerTasks;