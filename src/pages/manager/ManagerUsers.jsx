import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerUsers.css";

function ManagerUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      /* ================================
         MANAGER PROFILE
      ================================= */

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, email, phone, role, status")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      setManager(profile);

      /* ================================
         ASSIGNED USERS
      ================================= */

      const { data: assignments, error } =
        await supabase
          .from("manager_users")
          .select(`
            id,
            assigned_at,
            user_id,
            profiles:user_id (
              id,
              name,
              email,
              phone,
              role,
              status,
              created_at
            )
          `)
          .eq("manager_id", user.id)
          .order("assigned_at", {
            ascending: false,
          });

      if (error) {
        throw error;
      }

      const userList =
        assignments
          ?.map((item) => ({
            assignmentId: item.id,
            assignedAt: item.assigned_at,
            ...item.profiles,
          }))
          .filter(Boolean) || [];

      setUsers(userList);
    } catch (error) {
      console.error("Manager users error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* ================================
     DATE FORMAT
  ================================= */

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString();
  };

  /* ================================
     LOADING
  ================================= */

  if (loading) {
    return (
      <div className="manager-users-loading">
        Loading assigned users...
      </div>
    );
  }

  return (
    <div className="manager-users-page">

      {/* HEADER */}

      <header className="manager-users-header">

        <div>
          <span className="manager-users-label">
            PHOENIX MANAGER
          </span>

          <h1>
            Assigned Users
          </h1>

          <p>
            View users assigned to your manager
            account.
          </p>
        </div>

        <div className="manager-users-actions">

          <button
            className="manager-users-back"
            onClick={() => navigate("/manager")}
          >
            ← Dashboard
          </button>

          <button
            className="manager-users-refresh"
            onClick={loadUsers}
          >
            ↻ Refresh
          </button>

        </div>

      </header>


      {/* SUMMARY */}

      <section className="manager-users-summary">

        <div className="manager-users-summary-card">

          <span>
            Assigned Users
          </span>

          <strong>
            {users.length}
          </strong>

        </div>

        <div className="manager-users-summary-card">

          <span>
            Active Users
          </span>

          <strong>
            {
              users.filter(
                (user) => user.status === "active"
              ).length
            }
          </strong>

        </div>

        <div className="manager-users-summary-card">

          <span>
            Inactive Users
          </span>

          <strong>
            {
              users.filter(
                (user) => user.status === "inactive"
              ).length
            }
          </strong>

        </div>

      </section>


      {/* USERS */}

      <section className="manager-users-container">

        {users.length === 0 ? (

          <div className="manager-users-empty">

            <div className="manager-users-empty-icon">
              👥
            </div>

            <h2>
              No Users Assigned
            </h2>

            <p>
              Users assigned to you by the
              PHOENIX administrator will appear
              here.
            </p>

            <button
              onClick={() => navigate("/manager")}
            >
              Back to Dashboard
            </button>

          </div>

        ) : (

          <div className="manager-users-grid">

            {users.map((user) => (

              <div
                className="manager-user-card"
                key={user.assignmentId}
              >

                {/* USER HEADER */}

                <div className="manager-user-card-header">

                  <div className="manager-user-avatar">

                    {user.name
                      ?.charAt(0)
                      ?.toUpperCase() || "U"}

                  </div>

                  <div>

                    <h2>
                      {user.name || "Unnamed User"}
                    </h2>

                    <span>
                      User
                    </span>

                  </div>

                </div>


                {/* USER INFORMATION */}

                <div className="manager-user-info">

                  <div>

                    <span>
                      Email
                    </span>

                    <strong>
                      {user.email || "Not provided"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Phone
                    </span>

                    <strong>
                      {user.phone || "Not provided"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Status
                    </span>

                    <strong
                      className={`manager-user-status status-${user.status}`}
                    >
                      {user.status || "Unknown"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Assigned
                    </span>

                    <strong>
                      {formatDate(user.assignedAt)}
                    </strong>

                  </div>

                </div>


                {/* FOOTER */}

                <div className="manager-user-card-footer">

                  <span>
                    Joined{" "}
                    {formatDate(user.created_at)}
                  </span>

                  <span className="manager-user-role">
                    {user.role || "user"}
                  </span>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}

export default ManagerUsers;