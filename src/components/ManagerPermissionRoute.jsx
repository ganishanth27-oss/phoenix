import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ManagerPermissionRoute({ permission, children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    checkPermission();
  }, [permission]);

  const checkPermission = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAllowed(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Admin is allowed everywhere
      if (
        profile.role === "admin" &&
        profile.status === "active"
      ) {
        setAllowed(true);
        return;
      }

      // Must be an active manager
      if (
        profile.role !== "manager" ||
        profile.status !== "active"
      ) {
        setAllowed(false);
        return;
      }

      // Check manager permission
      const { data, error } = await supabase
        .from("manager_permissions")
        .select(`
          permission_id,
          permissions (
            name
          )
        `)
        .eq("manager_id", user.id);

      if (error) {
        throw error;
      }

      const hasPermission = (data || []).some(
        (item) => item.permissions?.name === permission
      );

      setAllowed(hasPermission);
    } catch (error) {
      console.error("Permission check failed:", error);
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Checking access...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/manager" replace />;
  }

  return children;
}

export default ManagerPermissionRoute;