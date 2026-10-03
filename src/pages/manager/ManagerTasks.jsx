import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerTasks.css";

function ManagerTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

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

      // Load manager permissions
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

      if (!permissions.includes("view_tasks")) {
        setTasks([]);
        setLoading(false);
        return;
      }

      setCanEdit(permissions.includes("edit_tasks"));

      // Load manager's tasks
      const { data, error } = await supabase
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

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error("Manager tasks error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    if (!canEdit) {
      alert("You do not have permission to edit tasks.");
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      await loadTasks();
    } catch (error) {
      console.error("Task update error:", error);
      alert(error.message);
    }
  };

  const getLabel = (value) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const totalTasks = tasks.length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  const activeTasks = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  return (
    <div className="manager-tasks-page">

      {/* Header */}
      <header className="manager-tasks-header">
        <div>
          <span>PHOENIX MANAGER</span>
          <h1>My Tasks</h1>
          <p>Tasks assigned to your account.</p>
        </div>

        <button
          className="back-manager-button"
          onClick={() => navigate("/manager")}
        >
          ← Dashboard
        </button>
      </header>

      {/* Summary */}
      <section className="manager-task-summary">

        <div className="manager-task-summary-card">
          <span>Total Tasks</span>
          <strong>{totalTasks}</strong>
        </div>

        <div className="manager-task-summary-card">
          <span>Pending</span>
          <strong>{pendingTasks}</strong>
        </div>

        <div className="manager-task-summary-card">
          <span>In Progress</span>
          <strong>{activeTasks}</strong>
        </div>

        <div className="manager-task-summary-card">
          <span>Completed</span>
          <strong>{completedTasks}</strong>
        </div>

      </section>

      {/* Tasks */}
      {loading ? (
        <div className="manager-tasks-empty">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="manager-tasks-empty">

          <div className="manager-task-empty-icon">
            ✓
          </div>

          <h2>No Tasks Assigned</h2>

          <p>
            You currently don't have any tasks assigned to you.
          </p>

          <button onClick={() => navigate("/manager")}>
            Back to Dashboard
          </button>

        </div>
      ) : (
        <section className="manager-task-list">

          {tasks.map((task) => (
            <div
              className="manager-task-card"
              key={task.id}
            >

              {/* Task Header */}
              <div className="manager-task-top">

                <div>
                  <div className="manager-task-title-row">

                    <h2>{task.title}</h2>

                    <span
                      className={`task-priority priority-${task.priority}`}
                    >
                      {task.priority}
                    </span>

                  </div>

                  <p className="manager-task-project">
                    Project:{" "}
                    <strong>
                      {task.projects?.name || "No project"}
                    </strong>
                  </p>

                </div>

                <span
                  className={`task-status status-${task.status}`}
                >
                  {getLabel(task.status)}
                </span>

              </div>


              {/* Description */}
              {task.description && (
                <div className="manager-task-description">

                  <span>Description</span>

                  <p>
                    {task.description}
                  </p>

                </div>
              )}


              {/* Details */}
              <div className="manager-task-details">

                <div>
                  <span>Service</span>

                  <strong>
                    {task.services?.name || "Not selected"}
                  </strong>
                </div>

                <div>
                  <span>Assigned User</span>

                  <strong>
                    {task.users?.name || "Not assigned"}
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


              {/* Status Control */}
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

            </div>
          ))}

        </section>
      )}

    </div>
  );
}

export default ManagerTasks;