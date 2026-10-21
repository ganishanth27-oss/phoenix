-- =====================================================================
-- Phoenix Project Submissions Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =====================================================================

-- =====================================================================
-- 1. HELPER FUNCTIONS (create or replace to ensure they exist)
-- =====================================================================

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


-- =====================================================================
-- 2. PROJECT SUBMISSIONS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.project_submissions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Project details
  title          text NOT NULL,
  description    text NOT NULL,
  client_name    text,
  service_id     uuid REFERENCES public.services(id) ON DELETE SET NULL,
  start_date     date,
  completion_date date,
  technologies   text,
  admin_notes_from_manager text,

  -- Thumbnail / cover image path in storage
  thumbnail_path text,

  -- Review workflow
  status         text NOT NULL DEFAULT 'pending_review'
                 CHECK (status IN (
                   'pending_review',
                   'under_review',
                   'changes_requested',
                   'approved',
                   'rejected'
                 )),

  -- Public portfolio visibility (only admin can set)
  is_published   boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_submissions_manager
  ON public.project_submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_status
  ON public.project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_submissions_published
  ON public.project_submissions(is_published) WHERE is_published = true;


-- =====================================================================
-- 3. PROJECT ATTACHMENTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.project_attachments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   uuid NOT NULL REFERENCES public.project_submissions(id) ON DELETE CASCADE,
  manager_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- File metadata
  file_name       text NOT NULL,
  file_path       text NOT NULL,
  file_size       bigint NOT NULL DEFAULT 0,
  content_type    text,

  -- Is this a public-safe preview image?
  is_public_preview boolean NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_attachments_submission
  ON public.project_attachments(submission_id);


-- =====================================================================
-- 4. SUBMISSION REVIEWS TABLE (audit trail)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.submission_reviews (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   uuid NOT NULL REFERENCES public.project_submissions(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Review details
  action          text NOT NULL CHECK (action IN (
                    'set_under_review',
                    'request_changes',
                    'approve',
                    'reject',
                    'publish',
                    'unpublish'
                  )),
  previous_status text,
  new_status      text,
  reason          text,
  internal_notes  text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission
  ON public.submission_reviews(submission_id);


-- =====================================================================
-- 5. ENABLE RLS ON NEW TABLES
-- =====================================================================

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_reviews  ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 6. RLS POLICIES: project_submissions
-- =====================================================================

DROP POLICY IF EXISTS "Public can view published submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Managers can view own submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Managers can create own submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Managers can update own pending submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Admins have full access to submissions" ON public.project_submissions;

-- 6a. Public visitors can read only published + approved submissions
CREATE POLICY "Public can view published submissions"
ON public.project_submissions
FOR SELECT
TO anon, authenticated
USING (
  is_published = true
  AND status = 'approved'
);

-- 6b. Managers can view their own submissions (any status)
CREATE POLICY "Managers can view own submissions"
ON public.project_submissions
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
);

-- 6c. Managers can create submissions for themselves only
CREATE POLICY "Managers can create own submissions"
ON public.project_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager()
  AND manager_id = auth.uid()
);

-- 6d. Managers can update their own submissions only when status is pending or changes_requested
CREATE POLICY "Managers can update own pending submissions"
ON public.project_submissions
FOR UPDATE
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND status IN ('pending_review', 'changes_requested')
)
WITH CHECK (
  public.is_manager()
  AND manager_id = auth.uid()
);

-- 6e. Admins have full access
CREATE POLICY "Admins have full access to submissions"
ON public.project_submissions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- =====================================================================
-- 7. RLS POLICIES: project_attachments
-- =====================================================================

DROP POLICY IF EXISTS "Public can view public preview attachments" ON public.project_attachments;
DROP POLICY IF EXISTS "Managers can view own attachments" ON public.project_attachments;
DROP POLICY IF EXISTS "Managers can create own attachments" ON public.project_attachments;
DROP POLICY IF EXISTS "Managers can delete own attachments" ON public.project_attachments;
DROP POLICY IF EXISTS "Admins have full access to attachments" ON public.project_attachments;

-- 7a. Public can only see attachments marked as public preview for published submissions
CREATE POLICY "Public can view public preview attachments"
ON public.project_attachments
FOR SELECT
TO anon, authenticated
USING (
  is_public_preview = true
  AND EXISTS (
    SELECT 1 FROM public.project_submissions ps
    WHERE ps.id = submission_id
      AND ps.is_published = true
      AND ps.status = 'approved'
  )
);

-- 7b. Managers can view their own attachments
CREATE POLICY "Managers can view own attachments"
ON public.project_attachments
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
);

-- 7c. Managers can create attachments for their own submissions
CREATE POLICY "Managers can create own attachments"
ON public.project_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager()
  AND manager_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.project_submissions ps
    WHERE ps.id = submission_id
      AND ps.manager_id = auth.uid()
  )
);

-- 7d. Managers can delete their own attachments (only for pending/changes_requested)
CREATE POLICY "Managers can delete own attachments"
ON public.project_attachments
FOR DELETE
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.project_submissions ps
    WHERE ps.id = submission_id
      AND ps.manager_id = auth.uid()
      AND ps.status IN ('pending_review', 'changes_requested')
  )
);

-- 7e. Admins have full access
CREATE POLICY "Admins have full access to attachments"
ON public.project_attachments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- =====================================================================
-- 8. RLS POLICIES: submission_reviews
-- =====================================================================

DROP POLICY IF EXISTS "Managers can view reviews of own submissions" ON public.submission_reviews;
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.submission_reviews;

-- 8a. Managers can view reviews of their own submissions
CREATE POLICY "Managers can view reviews of own submissions"
ON public.submission_reviews
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  AND EXISTS (
    SELECT 1 FROM public.project_submissions ps
    WHERE ps.id = submission_id
      AND ps.manager_id = auth.uid()
  )
);

-- 8b. Admins have full access
CREATE POLICY "Admins have full access to reviews"
ON public.submission_reviews
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- =====================================================================
-- 9. FIX EXISTING projects TABLE RLS
-- =====================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on projects" ON public.projects;
DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can create projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can delete assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;

CREATE POLICY "Admins have full access to projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Managers can view assigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND public.has_permission('view_projects')
);

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

CREATE POLICY "Managers can delete assigned projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_manager()
  AND manager_id = auth.uid()
  AND public.has_permission('delete_projects')
);


-- =====================================================================
-- 10. SERVICES TABLE: Allow public read
-- =====================================================================

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (status = 'active');


-- =====================================================================
-- 11. ACTIVITY LOGS policies
-- =====================================================================

DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert own activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view own activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- =====================================================================
-- 12. CONTACT ENQUIRIES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text,
  company     text,
  service_interest text,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit enquiry" ON public.contact_enquiries;
CREATE POLICY "Anyone can submit enquiry"
ON public.contact_enquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view enquiries" ON public.contact_enquiries;
CREATE POLICY "Admins can view enquiries"
ON public.contact_enquiries
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete enquiries" ON public.contact_enquiries;
CREATE POLICY "Admins can delete enquiries"
ON public.contact_enquiries
FOR DELETE
TO authenticated
USING (public.is_admin());


-- =====================================================================
-- DONE!
-- Next step: Create 'project-files' storage bucket in Supabase Dashboard:
--   Storage > New Bucket > Name: project-files > Private (not public)
-- Then add these storage policies in Dashboard > Storage > Policies:
--   - Managers can upload to their own folder (INSERT)
--   - Managers can read their own files (SELECT)
--   - Managers can delete their own files (DELETE)
--   - Admins can do everything (ALL)
-- =====================================================================
