import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children, allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, status")
        .eq("id", user.id)
        .single();

      if (error || !data || data.status !== "active") {
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) {
    return <div>Loading PHOENIX...</div>;
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    if (profile.role === "manager") {
      return <Navigate to="/manager" replace />;
    }

    if (profile.role === "user") {
      return <Navigate to="/user" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;