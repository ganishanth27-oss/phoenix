import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/DashboardLayout";
import "./ManagerUsers.css";

function ManagerUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

      const { data: assignments, error } = await supabase
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

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name) => {
    if (!name) return "U";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query)
    );
  });

  const activeUsers = users.filter(
    (user) => user.status === "active"
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.status === "inactive"
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
      <div className="manager-users-loading">
        <div className="manager-users-loader"></div>
        <p>Loading assigned users...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      profile={manager}
      navigation={navigation}
      title="Assigned Users"
    >
      <div className="manager-users-page">

        {/* HEADER */}

        <section className="manager-users-top">

          <div>
            <span className="manager-users-eyebrow">
              WORKSPACE / USERS
            </span>

            <h1>Assigned Users</h1>

            <p>
              View and manage users assigned to your account.
            </p>
          </div>

          <button
            className="manager-users-refresh"
            onClick={loadUsers}
          >
            <span>↻</span>
            Refresh
          </button>

        </section>


        {/* STATS */}

        <section className="manager-users-stats">

          <div className="manager-user-stat">

            <div className="manager-user-stat-icon purple">
              ♙
            </div>

            <div>
              <span>Total Users</span>
              <strong>{users.length}</strong>
            </div>

          </div>


          <div className="manager-user-stat">

            <div className="manager-user-stat-icon green">
              ✓
            </div>

            <div>
              <span>Active Users</span>
              <strong>{activeUsers}</strong>
            </div>

          </div>


          <div className="manager-user-stat">

            <div className="manager-user-stat-icon gray">
              —
            </div>

            <div>
              <span>Inactive Users</span>
              <strong>{inactiveUsers}</strong>
            </div>

          </div>

        </section>


        {/* USERS CONTAINER */}

        <section className="manager-users-content">

          <div className="manager-users-content-header">

            <div>
              <h2>My Users</h2>

              <p>
                Users assigned by the PHOENIX administrator
              </p>
            </div>

            <div className="manager-users-count">
              {filteredUsers.length} user
              {filteredUsers.length !== 1 ? "s" : ""}
            </div>

          </div>


          {/* SEARCH */}

          {users.length > 0 && (

            <div className="manager-users-toolbar">

              <div className="manager-users-search">

                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
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

            </div>

          )}


          {/* EMPTY */}

          {users.length === 0 ? (

            <div className="manager-users-empty">

              <div className="manager-users-empty-icon">
                ♙
              </div>

              <h2>No Users Assigned</h2>

              <p>
                Users assigned to you by the PHOENIX
                administrator will appear here.
              </p>

              <button
                onClick={() => navigate("/manager")}
              >
                Back to Dashboard
              </button>

            </div>

          ) : filteredUsers.length === 0 ? (

            <div className="manager-users-no-results">

              <div>
                ⌕
              </div>

              <h3>No users found</h3>

              <p>
                Try searching with a different name,
                email, or phone number.
              </p>

              <button
                onClick={() => setSearch("")}
              >
                Clear Search
              </button>

            </div>

          ) : (

            <div className="manager-users-grid">

              {filteredUsers.map((user) => (

                <article
                  className="manager-user-card"
                  key={user.assignmentId}
                >

                  {/* CARD HEADER */}

                  <div className="manager-user-card-top">

                    <div className="manager-user-avatar">
                      {getInitials(user.name)}
                    </div>

                    <div className="manager-user-heading">

                      <h3>
                        {user.name || "Unnamed User"}
                      </h3>

                      <span>
                        PHOENIX User
                      </span>

                    </div>

                    <span
                      className={`manager-user-status status-${user.status}`}
                    >
                      {user.status || "Unknown"}
                    </span>

                  </div>


                  {/* USER DETAILS */}

                  <div className="manager-user-details">

                    <div className="manager-user-detail">

                      <span className="detail-icon">
                        @
                      </span>

                      <div>
                        <small>Email</small>
                        <strong>
                          {user.email || "Not provided"}
                        </strong>
                      </div>

                    </div>


                    <div className="manager-user-detail">

                      <span className="detail-icon">
                        ☎
                      </span>

                      <div>
                        <small>Phone</small>
                        <strong>
                          {user.phone || "Not provided"}
                        </strong>
                      </div>

                    </div>

                  </div>


                  {/* CARD FOOTER */}

                  <div className="manager-user-card-footer">

                    <div>
                      <small>Assigned</small>
                      <span>
                        {formatDate(user.assignedAt)}
                      </span>
                    </div>

                    <div>
                      <small>Joined</small>
                      <span>
                        {formatDate(user.created_at)}
                      </span>
                    </div>

                  </div>

                </article>

              ))}

            </div>

          )}

        </section>

      </div>
    </DashboardLayout>
  );
}

export default ManagerUsers;