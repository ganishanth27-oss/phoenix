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
  const [toastMessage, setToastMessage] = useState("");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Delete Confirmation Modal
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recycle Bin / Soft Deleted Tasks
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showRecycleBin) {
      loadDeletedTasks();
    }
  }, [showRecycleBin]);

  const loadData = async () => {
    setLoading(true);

    try {
      // Fetch tasks via backend endpoint with fallback to supabase
      let fetchedTasks = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/tasks", {
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            fetchedTasks = json.data;
          }
        }
      } catch (e) {
        console.warn("Backend /api/admin/tasks fetch error, falling back to direct Supabase:", e);
      }

      const [
        directTasksResult,
        managersResult,
        usersResult,
        servicesResult,
        projectsResult,
      ] = await Promise.all([
        !fetchedTasks
          ? supabase
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
                projects:project_id (name),
                services:service_id (name),
                managers:manager_id (name, email),
                users:user_id (name, email)
              `)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: fetchedTasks }),

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

      if (directTasksResult.error) throw directTasksResult.error;
      if (managersResult.error) throw managersResult.error;
      if (usersResult.error) throw usersResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setTasks(fetchedTasks || directTasksResult.data || []);
      setManagers(managersResult.data || []);
      setUsers(usersResult.data || []);
      setServices(servicesResult.data || []);
      setProjects(projectsResult.data || []);
    } catch (error) {
      console.error("Admin tasks error:", error);
      showToast("Error loading tasks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedTasks = async () => {
    setLoadingDeleted(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/deleted-items?type=task", {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setDeletedTasks(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load deleted tasks:", err);
    } finally {
      setLoadingDeleted(false);
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
      const { data: { user } } = await supabase.auth.getUser();

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

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "create_task",
        description: `Created task: ${form.title.trim()}`,
      });

      showToast(`Task "${form.title.trim()}" created successfully.`);
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
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      const { error } = await supabase
        .from("tasks")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      if (currentUser) {
        await supabase.from("activity_logs").insert({
          user_id: currentUser.id,
          action: "update_task",
          description: `Updated task ${taskId}: ${field}`,
        });
      }

      showToast("Task updated successfully.");
      await loadData();
    } catch (error) {
      console.error("Update task error:", error);
      alert(error.message);
    }
  };

  // Safe soft delete execution for task
  const executeDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/tasks/${deleteConfirmTask.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== deleteConfirmTask.id));
      showToast(`Task "${deleteConfirmTask.title}" moved to Recycle Bin.`);
      setDeleteConfirmTask(null);
    } catch (err) {
      console.error("Delete task error:", err);
      alert("Could not delete task: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore soft-deleted task
  const restoreDeletedTask = async (item) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/deleted-items/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          id: item.id,
          type: "task",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to restore");
      }

      showToast(`Task restored successfully.`);
      await loadDeletedTasks();
      await loadData();
    } catch (err) {
      console.error("Restore error:", err);
      alert("Restore failed: " + err.message);
    }
  };

  const getLabel = (value) => {
    if (!value) return "";
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    if (!matchesStatus || !matchesPriority) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.title?.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      t.projects?.name?.toLowerCase().includes(term) ||
      t.managers?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="admin-tasks-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-floating-toast">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* HEADER */}
      <header className="admin-tasks-header">
        <div>
          <span>PHOENIX ADMIN OPERATIONS</span>
          <h1>Task Management</h1>
          <p>
            Create, assign, schedule, monitor, and manage company tasks.
          </p>
        </div>

        <div className="admin-tasks-header-actions">
          <button
            className={`recycle-bin-toggle-btn ${showRecycleBin ? "active" : ""}`}
            onClick={() => setShowRecycleBin(!showRecycleBin)}
          >
            {showRecycleBin ? "← Back to Active Tasks" : "🗑 Recycle Bin / Deleted"}
          </button>

          <button
            className="back-admin-button"
            onClick={() => navigate("/admin")}
          >
            ← Dashboard
          </button>

          <button
            className="create-task-button"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "Cancel" : "+ New Task"}
          </button>
        </div>
      </header>

      {/* RECYCLE BIN VIEW */}
      {showRecycleBin ? (
        <div className="recycle-bin-container">
          <div className="recycle-bin-header">
            <div>
              <h2>🗑 Deleted Tasks Archive</h2>
              <p>Archived tasks remain protected against permanent data loss. You can restore any task at any time.</p>
            </div>
            <button className="btn-refresh-deleted" onClick={loadDeletedTasks} disabled={loadingDeleted}>
              {loadingDeleted ? "Loading..." : "↻ Refresh Bin"}
            </button>
          </div>

          {loadingDeleted ? (
            <div className="tasks-empty">Loading deleted tasks...</div>
          ) : deletedTasks.length === 0 ? (
            <div className="tasks-empty">
              <div className="empty-task-icon">✓</div>
              <h3>Recycle Bin is Empty</h3>
              <p>No deleted tasks currently found.</p>
            </div>
          ) : (
            <div className="deleted-items-grid">
              {deletedTasks.map((del) => (
                <div key={del.id} className="deleted-card">
                  <div className="deleted-card-top">
                    <div>
                      <h3>{del.data?.title || del.id}</h3>
                      <span className="deleted-meta">
                        Deleted on {new Date(del.deletedAt).toLocaleString()} by Admin
                      </span>
                    </div>
                    <button
                      className="btn-restore-item"
                      onClick={() => restoreDeletedTask(del)}
                    >
                      ↩ Restore to Task List
                    </button>
                  </div>
                  <p className="deleted-desc">{del.data?.description || "No description."}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE TASKS VIEW */
        <>
          {/* STATS BAR */}
          <section className="tasks-summary-bar">
            <div className="summary-pill">
              <span>Total Tasks</span>
              <strong>{tasks.length}</strong>
            </div>
            <div className="summary-pill">
              <span>Pending</span>
              <strong>{tasks.filter((t) => t.status === "pending").length}</strong>
            </div>
            <div className="summary-pill">
              <span>In Progress</span>
              <strong>{tasks.filter((t) => t.status === "in_progress").length}</strong>
            </div>
            <div className="summary-pill">
              <span>Under Review</span>
              <strong>{tasks.filter((t) => t.status === "review").length}</strong>
            </div>
            <div className="summary-pill">
              <span>Completed</span>
              <strong>{tasks.filter((t) => t.status === "completed").length}</strong>
            </div>
          </section>

          {/* FILTER & SEARCH BAR */}
          <div className="tasks-filter-bar">
            <input
              type="text"
              className="tasks-search-input"
              placeholder="Search tasks by title, project, manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="tasks-filter-select"
            >
              <option value="all">All Statuses ({tasks.length})</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="tasks-filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* CREATE FORM */}
          {showForm && (
            <section className="task-form-panel">
              <form onSubmit={createTask} className="task-form">
                <h2>Create New Task</h2>

                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Provide detailed instructions..."
                  />
                </div>

                <div className="form-group">
                  <label>Project</label>
                  <select
                    name="project_id"
                    value={form.project_id}
                    onChange={handleChange}
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
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
                    <option value="">Select Service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assign Manager *</label>
                  <select
                    name="manager_id"
                    value={form.manager_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
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
                    <option value="">No User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
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

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Create Task"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* TASK LIST */}
          {loading ? (
            <div className="tasks-empty">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="tasks-empty">
              <div className="empty-task-icon">✓</div>
              <h3>No tasks found</h3>
              <p>Create a task or change filter criteria above.</p>
            </div>
          ) : (
            <section className="tasks-list">
              {filteredTasks.map((task) => (
                <article key={task.id} className="task-card">
                  <div className="task-card-header">
                    <div>
                      <h2>{task.title}</h2>
                      <p>{task.description || "No description provided."}</p>
                    </div>

                    <div className="task-tags">
                      <span className={`tag priority-${task.priority}`}>
                        {getLabel(task.priority)}
                      </span>
                      <span className={`tag status-${task.status}`}>
                        {getLabel(task.status)}
                      </span>
                    </div>
                  </div>

                  <div className="task-meta-grid">
                    <div>
                      <span>Project</span>
                      <strong>{task.projects?.name || "None"}</strong>
                    </div>

                    <div>
                      <span>Service</span>
                      <strong>{task.services?.name || "None"}</strong>
                    </div>

                    <div>
                      <span>Manager</span>
                      <strong>{task.managers?.name || "Unassigned"}</strong>
                    </div>

                    <div>
                      <span>Client / User</span>
                      <strong>{task.users?.name || "None"}</strong>
                    </div>

                    <div>
                      <span>Due Date</span>
                      <strong>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Not set"}
                      </strong>
                    </div>
                  </div>

                  {/* QUICK CONTROLS & RED DELETE BUTTON */}
                  <div className="task-controls">
                    <div>
                      <label>Status</label>
                      <select
                        value={task.status}
                        onChange={(e) => updateTask(task.id, "status", e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label>Priority</label>
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask(task.id, "priority", e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label>Manager</label>
                      <select
                        value={task.manager_id || ""}
                        onChange={(e) => updateTask(task.id, "manager_id", e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="delete-task-button-red"
                      title="Delete Task"
                      onClick={() => setDeleteConfirmTask(task)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      {/* TASK DELETE CONFIRMATION MODAL */}
      {deleteConfirmTask && (
        <div className="conv-modal-backdrop" onClick={() => !isDeleting && setDeleteConfirmTask(null)}>
          <div className="conv-modal-panel delete-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">⚠️</div>
            <h3>Delete Task</h3>
            <p className="delete-confirm-text">
              Are you sure you want to delete this task?
            </p>

            <div className="delete-target-preview">
              <span className="delete-target-name">{deleteConfirmTask.title}</span>
              <span className="delete-target-id">
                Project: {deleteConfirmTask.projects?.name || "Standalone Task"}
              </span>
            </div>

            <p className="delete-safe-notice">
              🛡️ <strong>Safe Soft Deletion:</strong> This task will be archived in the Recycle Bin. You can restore it to the active board anytime.
            </p>

            <div className="modal-footer delete-actions-row">
              <button
                type="button"
                className="modal-cancel-btn"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmTask(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                disabled={isDeleting}
                onClick={executeDeleteTask}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
