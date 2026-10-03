import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerReviewWork.css";

function ManagerReviewWork() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadReviewTasks = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setManager(profile);

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          priority,
          status,
          due_date,
          created_at,
          updated_at,

          projects:project_id (
            id,
            name,
            status
          ),

          services:service_id (
            id,
            name
          ),

          users:user_id (
            id,
            name,
            email
          )
        `)
        .eq("manager_id", user.id)
        .eq("status", "review")
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error("Review work error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewTasks();
  }, []);

  const updateTaskStatus = async (task, status) => {
    if (!manager) return;

    setUpdatingId(task.id);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id)
        .eq("manager_id", manager.id);

      if (error) {
        throw error;
      }

      await supabase.from("activity_logs").insert({
        user_id: manager.id,
        action: "manager_reviewed_task",
        description: `Manager changed task "${task.title}" to ${status}`,
      });

      await loadReviewTasks();
    } catch (error) {
      console.error("Update review task error:", error);
      alert(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString();
  };

  const getPriorityClass = (priority) => {
    return `review-priority priority-${priority}`;
  };

  if (loading) {
    return (
      <div className="review-work-loading">
        Loading work for review...
      </div>
    );
  }

  return (
    <div className="review-work-page">

      {/* HEADER */}
      <header className="review-work-header">

        <div>
          <span className="review-work-label">
            PHOENIX MANAGER
          </span>

          <h1>Review Work</h1>

          <p>
            Review tasks submitted by the team and update their progress.
          </p>
        </div>

        <div className="review-work-actions">

          <button
            className="review-back-button"
            onClick={() => navigate("/manager")}
          >
            ← Dashboard
          </button>

          <button
            className="review-refresh-button"
            onClick={loadReviewTasks}
          >
            ↻ Refresh
          </button>

        </div>

      </header>


      {/* SUMMARY */}
      <section className="review-summary">

        <div className="review-summary-card">
          <span>Waiting for Review</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="review-summary-card">
          <span>High Priority</span>

          <strong>
            {
              tasks.filter(
                (task) =>
                  task.priority === "high" ||
                  task.priority === "urgent"
              ).length
            }
          </strong>
        </div>

        <div className="review-summary-card">
          <span>Projects</span>

          <strong>
            {
              new Set(
                tasks
                  .map((task) => task.projects?.id)
                  .filter(Boolean)
              ).size
            }
          </strong>
        </div>

      </section>


      {/* CONTENT */}
      <section className="review-work-content">

        {tasks.length === 0 ? (

          <div className="review-empty">

            <div className="review-empty-icon">
              ✓
            </div>

            <h2>
              No Work Waiting for Review
            </h2>

            <p>
              Tasks submitted for review by your team members
              will appear here.
            </p>

            <button
              onClick={() => navigate("/manager/tasks")}
            >
              View My Tasks
            </button>

          </div>

        ) : (

          <div className="review-task-list">

            {tasks.map((task) => (

              <article
                className="review-task-card"
                key={task.id}
              >

                {/* TASK HEADER */}
                <div className="review-task-header">

                  <div>

                    <div className="review-title-row">

                      <h2>
                        {task.title}
                      </h2>

                      <span
                        className={getPriorityClass(
                          task.priority
                        )}
                      >
                        {task.priority}
                      </span>

                      <span className="review-status">
                        Waiting for Review
                      </span>

                    </div>

                    <p className="review-updated">
                      Last updated{" "}
                      {formatDate(task.updated_at)}
                    </p>

                  </div>

                </div>


                {/* TASK INFORMATION */}
                <div className="review-task-info">

                  <div>
                    <span>Project</span>

                    <strong>
                      {task.projects?.name || "No project"}
                    </strong>
                  </div>

                  <div>
                    <span>Service</span>

                    <strong>
                      {task.services?.name || "No service"}
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
                      {formatDate(task.due_date)}
                    </strong>
                  </div>

                </div>


                {/* DESCRIPTION */}
                <div className="review-task-description">

                  <span>
                    Task Description
                  </span>

                  <p>
                    {task.description ||
                      "No description provided."}
                  </p>

                </div>


                {/* DECISION */}
                <div className="review-task-decision">

                  <div>

                    <h3>
                      Review Decision
                    </h3>

                    <p>
                      Check the submitted work before
                      moving the task forward.
                    </p>

                  </div>

                  <div className="review-decision-buttons">

                    <button
                      className="review-progress-button"
                      disabled={updatingId === task.id}
                      onClick={() =>
                        updateTaskStatus(
                          task,
                          "in_progress"
                        )
                      }
                    >
                      ↻ Send Back
                    </button>

                    <button
                      className="review-complete-button"
                      disabled={updatingId === task.id}
                      onClick={() =>
                        updateTaskStatus(
                          task,
                          "completed"
                        )
                      }
                    >
                      ✓ Approve & Complete
                    </button>

                  </div>

                </div>


                {updatingId === task.id && (
                  <div className="review-saving">
                    Updating task...
                  </div>
                )}

              </article>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}

export default ManagerReviewWork;