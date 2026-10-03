import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ActivityLogs.css";

function ActivityLogs() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          id,
          action,
          description,
          created_at,
          profiles:user_id (
            name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Activity logs error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "Unknown";
    }

    return new Date(date).toLocaleString();
  };

  const getActionLabel = (action) => {
    if (!action) {
      return "Activity";
    }

    return action
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div className="activity-page">
      <header className="activity-header">
        <div>
          <span>PHOENIX ADMIN</span>

          <h1>Activity Logs</h1>

          <p>
            Monitor important actions performed in PHOENIX.
          </p>
        </div>

        <button
          className="activity-back-button"
          onClick={() => navigate("/admin")}
        >
          ← Dashboard
        </button>
      </header>

      <section className="activity-card">
        <div className="activity-card-header">
          <div>
            <h2>Recent Activity</h2>

            <p>
              {logs.length} activity
              {logs.length !== 1 ? "ies" : "y"} recorded
            </p>
          </div>

          <button
            className="refresh-activity-button"
            onClick={loadLogs}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="activity-empty">
            Loading activity logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-icon">
              📋
            </div>

            <h3>No Activity Yet</h3>

            <p>
              System activities will appear here.
            </p>
          </div>
        ) : (
          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="activity-user">
                        <div className="activity-avatar">
                          {log.profiles?.name
                            ?.charAt(0)
                            ?.toUpperCase() || "?"}
                        </div>

                        <div>
                          <strong>
                            {log.profiles?.name ||
                              "Unknown User"}
                          </strong>

                          <small>
                            {log.profiles?.email ||
                              "No email"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="role-badge">
                        {log.profiles?.role ||
                          "unknown"}
                      </span>
                    </td>

                    <td>
                      <span className="action-badge">
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    <td>
                      {log.description ||
                        "No description"}
                    </td>

                    <td>
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ActivityLogs;