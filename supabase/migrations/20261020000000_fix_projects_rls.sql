-- Migration: Fix Row Level Security (RLS) policies for table "projects"
-- Description:
-- 1. Allows authenticated active managers with the 'create_projects' permission to INSERT projects
--    where they are assigned as the manager (manager_id = auth.uid()) and creator (created_by = auth.uid()).
-- 2. Preserves full project creation/management permissions for admins.
-- 3. Ensures managers cannot create projects assigned to or claiming to be created by other users.
-- 4. Allows authenticated active managers with 'delete_projects' permission to DELETE their own projects.
-- 5. Allows authenticated active users/managers to log project creation in activity_logs.

-- 1. Check & ensure helper functions exist and are SECURE (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'manager'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manager_permissions mp
    JOIN public.permissions p ON p.id = mp.permission_id
    JOIN public.profiles pr ON pr.id = mp.manager_id
    WHERE mp.manager_id = auth.uid()
      AND pr.role = 'manager'
      AND pr.status = 'active'
      AND p.name = permission_name
  );
$$;

-- Ensure RLS remains enabled on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing conflicting / outdated policies on projects
DROP POLICY IF EXISTS "Admins can do everything on projects" ON public.projects;
DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can create projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can delete assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;

-- 3. Projects: Admin Policy (Full Access)
CREATE POLICY "Admins have full access to projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Projects: Manager SELECT Policy
CREATE POLICY "Managers can view assigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND public.has_permission('view_projects')
);

-- 5. Projects: Manager INSERT Policy
-- Managers can only insert projects where manager_id = auth.uid() AND created_by = auth.uid()
CREATE POLICY "Managers can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager()
  AND manager_id = auth.uid()
  AND created_by = auth.uid()
  AND public.has_permission('create_projects')
);

-- 6. Projects: Manager UPDATE Policy
CREATE POLICY "Managers can update assigned projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND public.has_permission('edit_projects')
)
WITH CHECK (
  public.is_manager()
  AND manager_id = auth.uid()
  AND public.has_permission('edit_projects')
);

-- 7. Projects: Manager DELETE Policy
CREATE POLICY "Managers can delete assigned projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND public.has_permission('delete_projects')
);

-- 8. Activity Logs: Allow authenticated users to insert their own logs
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert own activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);
