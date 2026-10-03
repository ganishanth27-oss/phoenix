import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerReports.css";

function ManagerReports() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [report, setReport] = useState({
    projects: [],
    tasks: [],
    requests: [],
    users: [],
  });

  const loadReports = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      /* ============================
         PROJECTS
      ============================ */

      const { data: projects, error: projectsError } =
        await supabase
          .from("projects")
          .select(`
            id,
            name,
            status,
            priority,
            start_date,
            due_date,
            services:service_id (
              name
            )
          `)
          .eq("manager_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (projectsError) {
        throw projectsError;
      }

      /* ============================
         TASKS
      ============================ */

      const { data: tasks, error: tasksError } =
        await supabase
          .from("tasks")
          .select(`
            id,
            title,
            status,
            priority,
            due_date,
            project_id,
            projects:project_id (
              name
            ),
            users:user_id (
              name
            )
          `)
          .eq("manager_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (tasksError) {
        throw tasksError;
      }

      /* ============================
         REQUESTS
      ============================ */

      const { data: requests, error: requestsError } =
        await supabase
          .from("user_requests")
          .select(`
            id,
            title,
            status,
            priority,
            due_date,
            created_at,
            profiles:user_id (
              name
            ),
            services:service_id (
              name
            )
          `)
          .eq("manager_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (requestsError) {
        throw requestsError;
      }

      /* ============================
         USERS
      ============================ */

      const { data: managerUsers, error: usersError } =
        await supabase
          .from("manager_users")
          .select(`
            id,
            assigned_at,
            profiles:user_id (
              id,
              name,
              email,
              status
            )
          `)
          .eq("manager_id", user.id);

      if (usersError) {
        throw usersError;
      }

      setReport({
        projects: projects || [],
        tasks: tasks || [],
        requests: requests || [],
        users: managerUsers || [],
      });
    } catch (error) {
      console.error("Reports error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  /* ============================
     CALCULATIONS
  ============================ */

  const totalProjects = report.projects.length;

  const completedProjects = report.projects.filter(
    (project) => project.status === "completed"
  ).length;

  const activeProjects = report.projects.filter(
    (project) =>
      project.status === "in_progress" ||
      project.status === "review"
  ).length;

  const totalTasks = report.tasks.length;

  const completedTasks = report.tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const reviewTasks = report.tasks.filter(
    (task) => task.status === "review"
  ).length;

  const totalRequests = report.requests.length;

  const completedRequests = report.requests.filter(
    (request) => request.status === "completed"
  ).length;

  const activeUsers = report.users.filter(
    (item) => item.profiles?.status === "active"
  ).length;

  const getPercentage = (completed, total) => {
    if (total === 0) return 0;

    return Math.round((completed / total) * 100);
  };

  const projectCompletion = getPercentage(
    completedProjects,
    totalProjects
  );

  const taskCompletion = getPercentage(
    completedTasks,
    totalTasks
  );

  const requestCompletion = getPercentage(
    completedRequests,
    totalRequests
  );

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="manager-reports-loading">
        Loading PHOENIX reports...
      </div>
    );
  }

  return (
    <div className="manager-reports-page">

      {/* ============================
          HEADER
      ============================ */}

      <header className="manager-reports-header">

        <div>
          <span className="manager-reports-label">
            PHOENIX MANAGER
          </span>

          <h1>Reports</h1>

          <p>
            View your project, task, request and team
            performance overview.
          </p>
        </div>

        <div className="manager-reports-actions">

          <button
            className="reports-back-button"
            onClick={() => navigate("/manager")}
          >
            ← Dashboard
          </button>

          <button
            className="reports-refresh-button"
            onClick={loadReports}
          >
            ↻ Refresh
          </button>

        </div>

      </header>


      {/* ============================
          MAIN STATS
      ============================ */}

      <section className="reports-stats">

        <div className="reports-stat-card">

          <div className="reports-stat-icon">
            📁
          </div>

          <div>
            <span>Total Projects</span>
            <strong>{totalProjects}</strong>
          </div>

        </div>


        <div className="reports-stat-card">

          <div className="reports-stat-icon">
            ✓
          </div>

          <div>
            <span>Completed Tasks</span>
            <strong>{completedTasks}</strong>
          </div>

        </div>


        <div className="reports-stat-card">

          <div className="reports-stat-icon">
            📋
          </div>

          <div>
            <span>Customer Requests</span>
            <strong>{totalRequests}</strong>
          </div>

        </div>


        <div className="reports-stat-card">

          <div className="reports-stat-icon">
            👥
          </div>

          <div>
            <span>Assigned Users</span>
            <strong>{activeUsers}</strong>
          </div>

        </div>

      </section>


      {/* ============================
          PROGRESS
      ============================ */}

      <section className="reports-progress-grid">

        {/* Projects */}

        <div className="reports-panel">

          <div className="reports-panel-header">

            <div>
              <h2>Project Progress</h2>
              <p>Overall project completion</p>
            </div>

            <strong>
              {projectCompletion}%
            </strong>

          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${projectCompletion}%`,
              }}
            />
          </div>

          <div className="reports-progress-details">

            <span>
              Completed: {completedProjects}
            </span>

            <span>
              Active: {activeProjects}
            </span>

            <span>
              Total: {totalProjects}
            </span>

          </div>

        </div>


        {/* Tasks */}

        <div className="reports-panel">

          <div className="reports-panel-header">

            <div>
              <h2>Task Progress</h2>
              <p>Overall task completion</p>
            </div>

            <strong>
              {taskCompletion}%
            </strong>

          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${taskCompletion}%`,
              }}
            />
          </div>

          <div className="reports-progress-details">

            <span>
              Completed: {completedTasks}
            </span>

            <span>
              Review: {reviewTasks}
            </span>

            <span>
              Total: {totalTasks}
            </span>

          </div>

        </div>


        {/* Requests */}

        <div className="reports-panel">

          <div className="reports-panel-header">

            <div>
              <h2>Request Progress</h2>
              <p>Customer request completion</p>
            </div>

            <strong>
              {requestCompletion}%
            </strong>

          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${requestCompletion}%`,
              }}
            />
          </div>

          <div className="reports-progress-details">

            <span>
              Completed: {completedRequests}
            </span>

            <span>
              Active: {totalRequests - completedRequests}
            </span>

            <span>
              Total: {totalRequests}
            </span>

          </div>

        </div>

      </section>


      {/* ============================
          PROJECT REPORT
      ============================ */}

      <section className="reports-table-panel">

        <div className="reports-table-header">

          <div>
            <h2>Project Overview</h2>

            <p>
              Projects currently assigned to you.
            </p>
          </div>

          <button
            onClick={() => navigate("/manager/projects")}
          >
            View Projects
          </button>

        </div>


        {report.projects.length === 0 ? (

          <div className="reports-empty">
            No projects assigned.
          </div>

        ) : (

          <div className="reports-table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>Project</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                </tr>

              </thead>

              <tbody>

                {report.projects.map((project) => (

                  <tr key={project.id}>

                    <td>
                      <strong>
                        {project.name}
                      </strong>
                    </td>

                    <td>
                      {project.services?.name ||
                        "Not specified"}
                    </td>

                    <td>
                      <span
                        className={`report-status status-${project.status}`}
                      >
                        {project.status
                          ?.replaceAll("_", " ")
                          .replace(
                            /\b\w/g,
                            (letter) =>
                              letter.toUpperCase()
                          )}
                      </span>
                    </td>

                    <td>
                      {project.priority}
                    </td>

                    <td>
                      {formatDate(project.due_date)}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ============================
          TASK REPORT
      ============================ */}

      <section className="reports-table-panel">

        <div className="reports-table-header">

          <div>
            <h2>Task Overview</h2>

            <p>
              Recent tasks assigned to your team.
            </p>
          </div>

          <button
            onClick={() => navigate("/manager/tasks")}
          >
            View Tasks
          </button>

        </div>


        {report.tasks.length === 0 ? (

          <div className="reports-empty">
            No tasks assigned.
          </div>

        ) : (

          <div className="reports-table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned User</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>

              </thead>

              <tbody>

                {report.tasks.slice(0, 10).map((task) => (

                  <tr key={task.id}>

                    <td>
                      <strong>
                        {task.title}
                      </strong>
                    </td>

                    <td>
                      {task.projects?.name ||
                        "No project"}
                    </td>

                    <td>
                      {task.users?.name ||
                        "Not assigned"}
                    </td>

                    <td>
                      <span
                        className={`report-status status-${task.status}`}
                      >
                        {task.status
                          ?.replaceAll("_", " ")
                          .replace(
                            /\b\w/g,
                            (letter) =>
                              letter.toUpperCase()
                          )}
                      </span>
                    </td>

                    <td>
                      {task.priority}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ============================
          REQUEST REPORT
      ============================ */}

      <section className="reports-table-panel">

        <div className="reports-table-header">

          <div>
            <h2>Customer Requests</h2>

            <p>
              Recent requests assigned to you.
            </p>
          </div>

          <button
            onClick={() => navigate("/manager/requests")}
          >
            View Requests
          </button>

        </div>


        {report.requests.length === 0 ? (

          <div className="reports-empty">
            No customer requests assigned.
          </div>

        ) : (

          <div className="reports-table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>Request</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>

              </thead>

              <tbody>

                {report.requests.slice(0, 10).map(
                  (request) => (

                    <tr key={request.id}>

                      <td>
                        <strong>
                          {request.title}
                        </strong>
                      </td>

                      <td>
                        {request.profiles?.name ||
                          "Unknown"}
                      </td>

                      <td>
                        {request.services?.name ||
                          "Not selected"}
                      </td>

                      <td>
                        <span
                          className={`report-status status-${request.status}`}
                        >
                          {request.status
                            ?.replaceAll("_", " ")
                            .replace(
                              /\b\w/g,
                              (letter) =>
                                letter.toUpperCase()
                            )}
                        </span>
                      </td>

                      <td>
                        {request.priority}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default ManagerReports;