import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./Tasks.css";

function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    service_id: "",
    manager_id: "",
    user_id: "",
    priority: "medium",
    status: "pending",
    due_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        tasksResult,
        managersResult,
        usersResult,
        servicesResult,
        projectsResult,
      ] = await Promise.all([
        supabase
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
            managers:manager_id (
              name,
              email
            ),
            users:user_id (
              name,
              email
            )
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id, name, email")
          .eq("role", "manager")
          .eq("status", "active")
          .order("name"),

        supabase
          .from("profiles")
          .select("id, name, email")
          .eq("role", "user")
          .eq("status", "active")
          .order("name"),

        supabase
          .from("services")
          .select("id, name")
          .eq("status", "active")
          .order("name"),

        supabase
          .from("projects")
          .select("id, name")
          .order("name"),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (managersResult.error) throw managersResult.error;
      if (usersResult.error) throw usersResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setTasks(tasksResult.data || []);
      setManagers(managersResult.data || []);
      setUsers(usersResult.data || []);
      setServices(servicesResult.data || []);
      setProjects(projectsResult.data || []);
    } catch (error) {
      console.error("Admin tasks error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      project_id: "",
      service_id: "",
      manager_id: "",
      user_id: "",
      priority: "medium",
      status: "pending",
      due_date: "",
    });
  };

  const createTask = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Task title is required.");
      return;
    }

    if (!form.manager_id) {
      alert("Please assign a manager.");
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
          description: form.description.trim() || null,
          project_id: form.project_id || null,
          service_id: form.service_id || null,
          manager_id: form.manager_id,
          user_id: form.user_id || null,
          priority: form.priority,
          status: form.status,
          due_date: form.due_date || null,
          created_by: user.id,
        });

      if (error) {
        throw error;
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "create_task",
        description: `Created task: ${form.title.trim()}`,
      });

      alert("Task created successfully.");

      resetForm();
      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error("Create task error:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (taskId, field, value) => {
    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const currentUser = authData.user;

      if (!currentUser) {
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      await supabase.from("activity_logs").insert({
        user_id: currentUser.id,
        action: "update_task",
        description: `Updated task ${taskId}: ${field}`,
      });

      await loadData();
    } catch (error) {
      console.error("Update task error:", error);
      alert(error.message);
    }
  };

  const deleteTask = async (taskId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const currentUser = authData.user;

      if (!currentUser) {
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      await supabase.from("activity_logs").insert({
        user_id: currentUser.id,
        action: "delete_task",
        description: `Deleted task ${taskId}`,
      });

      await loadData();
    } catch (error) {
      console.error("Delete task error:", error);
      alert(error.message);
    }
  };

  const getLabel = (value) => {
    if (!value) return "";

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div className="admin-tasks-page">

      {/* HEADER */}
      <header className="admin-tasks-header">
        <div>
          <span>PHOENIX ADMIN</span>
          <h1>Task Management</h1>
          <p>
            Create, assign and monitor company tasks.
          </p>
        </div>

        <div className="admin-tasks-header-actions">
          <button
            className="back-admin-button"
            onClick={() => navigate("/admin")}
          >
            ← Dashboard
          </button>

          <button
            className="add-task-button"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Close" : "+ Create Task"}
          </button>
        </div>
      </header>

      {/* CREATE TASK FORM */}
      {showForm && (
        <section className="task-form-card">
          <div className="task-form-header">
            <div>
              <h2>Create New Task</h2>
              <p>
                Assign a task to a manager and optionally
                connect it to a project and user.
              </p>
            </div>
          </div>

          <form
            className="task-form"
            onSubmit={createTask}
          >

            <div className="form-group full-width">
              <label>Task Title</label>
              <input
                type="text"
                name="title"
                placeholder="Enter task title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Describe the task..."
                value={form.description}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Project</label>
              <select
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
              >
                <option value="">
                  No Project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Service</label>
              <select
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
              >
                <option value="">
                  Select Service
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

            <div className="form-group">
              <label>Assign Manager</label>
              <select
                name="manager_id"
                value={form.manager_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select Manager
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

            <div className="form-group">
              <label>Assign User</label>
              <select
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
              >
                <option value="">
                  No User
                </option>

                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.name} — {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
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

            <div className="form-group">
              <label>Status</label>
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

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>

            <div className="task-form-actions">
              <button
                type="button"
                className="cancel-task-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-task-button"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create Task"}
              </button>
            </div>

          </form>
        </section>
      )}

      {/* TASK LIST */}
      {loading ? (
        <div className="admin-tasks-loading">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="admin-tasks-empty">
          <div className="empty-task-icon">
            ✓
          </div>

          <h2>No Tasks Found</h2>

          <p>
            Create your first task using the
            button above.
          </p>

          <button
            onClick={() => setShowForm(true)}
          >
            + Create Task
          </button>
        </div>
      ) : (
        <section className="admin-task-list">

          {tasks.map((task) => (
            <article
              className="admin-task-card"
              key={task.id}
            >

              <div className="admin-task-top">

                <div>
                  <div className="admin-task-title-row">

                    <h2>{task.title}</h2>

                    <span
                      className={`task-priority priority-${task.priority}`}
                    >
                      {getLabel(task.priority)}
                    </span>

                  </div>

                  <p className="admin-task-project">
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

              {task.description && (
                <div className="admin-task-description">
                  <span>Description</span>
                  <p>{task.description}</p>
                </div>
              )}

              <div className="admin-task-details">

                <div>
                  <span>Service</span>
                  <strong>
                    {task.services?.name ||
                      "Not selected"}
                  </strong>
                </div>

                <div>
                  <span>Manager</span>
                  <strong>
                    {task.managers?.name ||
                      "Not assigned"}
                  </strong>
                </div>

                <div>
                  <span>User</span>
                  <strong>
                    {task.users?.name ||
                      "Not assigned"}
                  </strong>
                </div>

                <div>
                  <span>Due Date</span>
                  <strong>
                    {task.due_date
                      ? new Date(
                          task.due_date
                        ).toLocaleDateString()
                      : "Not specified"}
                  </strong>
                </div>

              </div>

              <div className="admin-task-controls">

                <div>
                  <label>Status</label>

                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTask(
                        task.id,
                        "status",
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

                <div>
                  <label>Priority</label>

                  <select
                    value={task.priority}
                    onChange={(e) =>
                      updateTask(
                        task.id,
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

                <div>
                  <label>Manager</label>

                  <select
                    value={task.manager_id || ""}
                    onChange={(e) =>
                      updateTask(
                        task.id,
                        "manager_id",
                        e.target.value || null
                      )
                    }
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {managers.map((manager) => (
                      <option
                        key={manager.id}
                        value={manager.id}
                      >
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="delete-task-button"
                  onClick={() =>
                    deleteTask(task.id)
                  }
                >
                  Delete
                </button>

              </div>

            </article>
          ))}

        </section>
      )}

    </div>
  );
}

export default Tasks;