import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

/* =========================
   MIDDLEWARE
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8000",
  "https://phoenix-chi-beryl.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());

/* =========================
   SUPABASE
========================= */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env"
  );

  process.exit(1);
}

/*
  Admin Supabase client.

  IMPORTANT:
  The secret key is used ONLY on the backend.
*/

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

/* =========================
   BASIC ROUTES
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "PHOENIX backend is running",
  });
});

/* =========================
   TEST SUPABASE
========================= */

app.get(
  "/api/test-supabase",
  async (req, res) => {
    try {
      const { data, error } =
        await supabaseAdmin
          .from("services")
          .select("id, name, status")
          .limit(5);

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.json({
        success: true,
        services: data,
      });
    } catch (error) {
      console.error(
        "Supabase test error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =========================
   ADMIN AUTHENTICATION
========================= */

const getAdminFromRequest = async (req) => {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return {
      error: "Authorization token is required.",
    };
  }

  const accessToken = authHeader
    .replace("Bearer ", "")
    .trim();

  if (!accessToken) {
    return {
      error: "Authorization token is required.",
    };
  }

  const {
    data: { user },
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (userError || !user) {
    return {
      error:
        "Invalid or expired authentication token.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, name, email, role, status"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: "Admin profile not found.",
    };
  }

  if (
    profile.role !== "admin" ||
    profile.status !== "active"
  ) {
    return {
      error: "Admin access required.",
    };
  }

  return {
    user,
    profile,
  };
};

/* =========================
   CREATE MANAGER
========================= */

app.post(
  "/api/admin/managers",
  async (req, res) => {
    try {
      const adminCheck =
        await getAdminFromRequest(req);

      if (adminCheck.error) {
        return res.status(401).json({
          success: false,
          message: adminCheck.error,
        });
      }

      const {
        name,
        email,
        password,
        phone,
      } = req.body;

      /* Validate required fields */

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters.",
        });
      }

      const cleanName = name.trim();
      const cleanEmail =
        email.trim().toLowerCase();
      const cleanPhone =
        phone?.trim() || null;

      /* Create authentication account */

      const {
        data: authData,
        error: authError,
      } =
        await supabaseAdmin.auth.admin.createUser(
          {
            email: cleanEmail,
            password,
            email_confirm: true,
          }
        );

      if (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      const managerId =
        authData.user.id;

      /* Create PHOENIX profile */

      const {
        data: profile,
        error: profileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .insert({
            id: managerId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role: "manager",
            status: "active",
          })
          .select(
            "id, name, email, phone, role, status, created_at"
          )
          .single();

      /*
        If profile creation fails,
        remove the Auth user.
      */

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(
          managerId
        );

        return res.status(500).json({
          success: false,
          message: profileError.message,
        });
      }

      /* Record admin action */

      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id: adminCheck.user.id,
          action: "create_manager",
          description:
            `Created manager account for ${profile.email}`,
        });

      /*
        Never return the password.
      */

      return res.status(201).json({
        success: true,
        message:
          "Manager created successfully.",
        manager: profile,
      });
    } catch (error) {
      console.error(
        "Create manager error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
);

/* =========================
   CREATE USER - ADMIN
========================= */

app.post(
  "/api/admin/users",
  async (req, res) => {
    try {
      /*
        Verify that the request
        comes from an active admin.
      */

      const adminCheck =
        await getAdminFromRequest(req);

      if (adminCheck.error) {
        return res.status(401).json({
          success: false,
          message: adminCheck.error,
        });
      }

      const {
        name,
        email,
        phone,
        password,
        managerId,
      } = req.body;

      /* =========================
         VALIDATION
      ========================= */

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters.",
        });
      }

      const cleanName = name.trim();

      const cleanEmail =
        email.trim().toLowerCase();

      const cleanPhone =
        phone?.trim() || null;

      /* =========================
         VERIFY MANAGER
      ========================= */

      if (managerId) {
        const {
          data: manager,
          error: managerError,
        } =
          await supabaseAdmin
            .from("profiles")
            .select(
              "id, name, role, status"
            )
            .eq("id", managerId)
            .eq("role", "manager")
            .eq("status", "active")
            .single();

        if (
          managerError ||
          !manager
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Selected manager is not valid or is inactive.",
          });
        }
      }

      /* =========================
         CREATE AUTH USER
      ========================= */

      const {
        data: authData,
        error: authError,
      } =
        await supabaseAdmin.auth.admin.createUser(
          {
            email: cleanEmail,
            password,
            email_confirm: true,
          }
        );

      if (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      const userId =
        authData.user.id;

      /* =========================
         CREATE PROFILE
      ========================= */

      const {
        data: profile,
        error: profileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .insert({
            id: userId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role: "user",
            status: "active",
          })
          .select(
            "id, name, email, phone, role, status, created_at"
          )
          .single();

      /*
        If profile creation fails,
        delete the Auth account.
      */

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

        return res.status(500).json({
          success: false,
          message: profileError.message,
        });
      }

      /* =========================
         ASSIGN MANAGER
      ========================= */

      if (managerId) {
        const {
          error: assignmentError,
        } =
          await supabaseAdmin
            .from("manager_users")
            .insert({
              manager_id: managerId,
              user_id: userId,
            });

        /*
          If manager assignment fails,
          roll everything back.
        */

        if (assignmentError) {
          await supabaseAdmin
            .from("profiles")
            .delete()
            .eq("id", userId);

          await supabaseAdmin.auth.admin.deleteUser(
            userId
          );

          return res.status(500).json({
            success: false,
            message:
              "User was created but manager assignment failed: " +
              assignmentError.message,
          });
        }
      }

      /* =========================
         ACTIVITY LOG
      ========================= */

      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id:
            adminCheck.user.id,
          action: "create_user",
          description:
            `Created user account for ${profile.email}`,
        });

      /* =========================
         RESPONSE
      ========================= */

      return res.status(201).json({
        success: true,
        message:
          "User created successfully.",
        user: profile,
      });
    } catch (error) {
      console.error(
        "Create user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
);

/* =========================
   USER REGISTRATION
========================= */

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        password,
      } = req.body;

      /* Validate required fields */

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters.",
        });
      }

      const cleanName = name.trim();

      const cleanEmail =
        email.trim().toLowerCase();

      const cleanPhone =
        phone?.trim() || null;

      /* Create Supabase Auth account */

      const {
        data: authData,
        error: authError,
      } =
        await supabaseAdmin.auth.admin.createUser(
          {
            email: cleanEmail,
            password,
            email_confirm: true,
          }
        );

      if (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      const userId =
        authData.user.id;

      /* Create PHOENIX profile */

      const {
        data: profile,
        error: profileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .insert({
            id: userId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role: "user",
            status: "active",
          })
          .select(
            "id, name, email, phone, role, status"
          )
          .single();

      /*
        Roll back Auth account
        if profile creation fails.
      */

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

        return res.status(500).json({
          success: false,
          message: profileError.message,
        });
      }

      /* Activity log */

      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id: userId,
          action: "register",
          description:
            `User ${cleanEmail} created a PHOENIX account.`,
        });

      return res.status(201).json({
        success: true,
        message:
          "Account created successfully.",
        user: profile,
      });
    } catch (error) {
      console.error(
        "User registration error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
);

/* =========================
   AUTHENTICATED USER HELPER
========================= */

const getAuthenticatedUser = async (req) => {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return {
      error: "Authorization token is required.",
    };
  }

  const accessToken = authHeader
    .replace("Bearer ", "")
    .trim();

  if (!accessToken) {
    return {
      error: "Authorization token is required.",
    };
  }

  const {
    data: { user },
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (userError || !user) {
    return {
      error:
        "Invalid or expired authentication token.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, name, email, role, status"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: "Profile not found.",
    };
  }

  if (profile.status !== "active") {
    return {
      error: "Account is inactive.",
    };
  }

  return {
    user,
    profile,
  };
};

/* =========================
   ADMIN: REVIEW SUBMISSION
========================= */

app.post(
  "/api/admin/submissions/:id/review",
  async (req, res) => {
    try {
      const adminCheck =
        await getAdminFromRequest(req);

      if (adminCheck.error) {
        return res.status(401).json({
          success: false,
          message: adminCheck.error,
        });
      }

      const { id } = req.params;
      const {
        action,
        reason,
        internal_notes,
        is_published,
      } = req.body;

      const validActions = [
        "set_under_review",
        "request_changes",
        "approve",
        "reject",
        "publish",
        "unpublish",
      ];

      if (
        !action ||
        !validActions.includes(action)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid review action.",
        });
      }

      /* Fetch current submission */
      const {
        data: submission,
        error: fetchError,
      } = await supabaseAdmin
        .from("project_submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({
          success: false,
          message:
            "Submission not found.",
        });
      }

      /* Determine new status */
      const statusMap = {
        set_under_review: "under_review",
        request_changes:
          "changes_requested",
        approve: "approved",
        reject: "rejected",
        publish: submission.status,
        unpublish: submission.status,
      };

      const newStatus =
        statusMap[action];

      const updateData = {
        status: newStatus,
        updated_at:
          new Date().toISOString(),
      };

      /* Handle publish/unpublish */
      if (action === "publish") {
        if (
          submission.status !== "approved"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Only approved projects can be published.",
          });
        }
        updateData.is_published = true;
      }

      if (action === "unpublish") {
        updateData.is_published = false;
      }

      if (
        typeof is_published === "boolean" &&
        action === "approve"
      ) {
        updateData.is_published =
          is_published;
      }

      /* Update submission */
      const { error: updateError } =
        await supabaseAdmin
          .from("project_submissions")
          .update(updateData)
          .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      /* Create review record */
      await supabaseAdmin
        .from("submission_reviews")
        .insert({
          submission_id: id,
          reviewer_id:
            adminCheck.user.id,
          action,
          previous_status:
            submission.status,
          new_status: newStatus,
          reason: reason || null,
          internal_notes:
            internal_notes || null,
        });

      /* Activity log */
      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id:
            adminCheck.user.id,
          action:
            `submission_${action}`,
          description: `Admin ${action.replace("_", " ")} submission "${submission.title}" (ID: ${id})`,
        });

      return res.json({
        success: true,
        message: `Submission ${action.replace("_", " ")} successfully.`,
      });
    } catch (error) {
      console.error(
        "Review submission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Internal server error.",
      });
    }
  }
);

/* =========================
   SIGNED URL FOR FILE
   DOWNLOAD (authenticated)
========================= */

app.post(
  "/api/files/signed-url",
  async (req, res) => {
    try {
      const authCheck =
        await getAuthenticatedUser(req);

      if (authCheck.error) {
        return res.status(401).json({
          success: false,
          message: authCheck.error,
        });
      }

      const { file_path } = req.body;

      if (!file_path) {
        return res.status(400).json({
          success: false,
          message:
            "File path is required.",
        });
      }

      const { profile } = authCheck;

      /*
        Admins can download any file.
        Managers can only download files
        in their own folder.
      */
      if (profile.role === "manager") {
        const pathParts =
          file_path.split("/");

        if (
          pathParts[0] !== profile.id
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Access denied to this file.",
          });
        }
      } else if (
        profile.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied.",
        });
      }

      const {
        data: signedUrlData,
        error: signedUrlError,
      } = await supabaseAdmin.storage
        .from("project-files")
        .createSignedUrl(
          file_path,
          300
        );

      if (signedUrlError) {
        throw signedUrlError;
      }

      return res.json({
        success: true,
        signed_url:
          signedUrlData.signedUrl,
        expires_in: 300,
      });
    } catch (error) {
      console.error(
        "Signed URL error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to generate download URL.",
      });
    }
  }
);

/* =========================
   PUBLIC: SUBMIT ENQUIRY
========================= */

/*
  Guest user UUID for all public enquiries.
  This permanent account was provisioned in Supabase:
  guest@phoenixsolutions.com / role: user / status: active
*/
const GUEST_USER_ID =
  "383fcb79-2475-4b65-8ca8-e014ea872324";

app.post(
  "/api/public/enquiry",
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        company,
        service_interest,
        serviceCategory,
        message,
      } = req.body || {};

      /* ── Validate required fields ── */

      if (
        !name?.trim() ||
        !email?.trim() ||
        !message?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and message are required.",
        });
      }

      /* Basic email validation */
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address.",
        });
      }

      /* Support either service_interest or serviceCategory */
      const resolvedService =
        service_interest?.trim() ||
        serviceCategory?.trim() ||
        null;

      const cleanName    = name.trim();
      const cleanEmail   = email.trim().toLowerCase();
      const cleanPhone   = phone?.trim()   || null;
      const cleanCompany = company?.trim() || null;
      const cleanMsg     = message.trim();

      /* ── 1. Insert into contact_enquiries ── */

      const {
        data: enquiry,
        error: enquiryError,
      } = await supabaseAdmin
        .from("contact_enquiries")
        .insert({
          name:             cleanName,
          email:            cleanEmail,
          phone:            cleanPhone,
          company:          cleanCompany,
          service_interest: resolvedService,
          message:          cleanMsg,
        })
        .select("id, created_at")
        .single();

      if (enquiryError) {
        console.error(
          "contact_enquiries insert error:",
          enquiryError
        );
        throw enquiryError;
      }

      /* ── 2. Look up matching service_id ── */

      let matchedServiceId = null;

      if (resolvedService) {
        const {
          data: matchedService,
        } = await supabaseAdmin
          .from("services")
          .select("id")
          .ilike("name", `%${resolvedService}%`)
          .limit(1)
          .maybeSingle();

        matchedServiceId =
          matchedService?.id || null;
      }

      /* ── 3. Build user_requests record ── */

      const reqTitle =
        cleanCompany
          ? `${resolvedService || "General Enquiry"} - ${cleanCompany}`
          : `${resolvedService || "General Enquiry"} - ${cleanName}`;

      const reqRequirements = [
        "[CUSTOMER DETAILS]",
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Phone: ${cleanPhone || "Not provided"}`,
        `Company/Organization: ${cleanCompany || "Not provided"}`,
        `Service Category: ${resolvedService || "Not specified"}`,
        "",
        "[REQUIREMENTS & MESSAGE]",
        cleanMsg,
      ].join("\n");

      /* ── 4. Insert into user_requests ── */

      const {
        error: reqErr,
      } = await supabaseAdmin
        .from("user_requests")
        .insert({
          user_id:    GUEST_USER_ID,
          service_id: matchedServiceId,
          title:       reqTitle,
          description: cleanMsg,
          requirements: reqRequirements,
          priority:    "medium",
          status:      "submitted",
        });

      if (reqErr) {
        /*
          Log but do NOT fail the whole request —
          the contact_enquiries row was already saved.
          Admin can still see the enquiry via contact_enquiries.
        */
        console.error(
          "user_requests insert error:",
          reqErr
        );
      }

      return res.status(201).json({
        success: true,
        message:
          "Your enquiry has been submitted. We will get back to you soon!",
        enquiry_id: enquiry.id,
      });
    } catch (error) {
      console.error("Enquiry error:", error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit enquiry. Please try again.",
      });
    }
  }
);

/* =========================
   PUBLIC: PORTFOLIO
========================= */

app.get(
  "/api/public/portfolio",
  async (req, res) => {
    try {
      const {
        data: projects,
        error: projectsError,
      } = await supabaseAdmin
        .from("project_submissions")
        .select(`
          id,
          title,
          description,
          client_name,
          service_id,
          technologies,
          start_date,
          completion_date,
          thumbnail_path,
          created_at,
          services:service_id (
            id,
            name
          ),
          manager:manager_id (
            name
          )
        `)
        .eq("status", "approved")
        .eq("is_published", true)
        .order("created_at", {
          ascending: false,
        });

      if (projectsError) {
        throw projectsError;
      }

      /*
        For each project, also fetch
        public preview attachments.
      */
      const projectIds = (
        projects || []
      ).map((p) => p.id);

      let attachments = [];

      if (projectIds.length > 0) {
        const {
          data: attachData,
          error: attachError,
        } = await supabaseAdmin
          .from("project_attachments")
          .select(
            "id, submission_id, file_name, content_type"
          )
          .in(
            "submission_id",
            projectIds
          )
          .eq(
            "is_public_preview",
            true
          );

        if (!attachError) {
          attachments =
            attachData || [];
        }
      }

      /* Map attachments to projects */
      const result = (
        projects || []
      ).map((project) => ({
        ...project,
        preview_images:
          attachments.filter(
            (a) =>
              a.submission_id ===
              project.id
          ),
      }));

      return res.json({
        success: true,
        projects: result,
      });
    } catch (error) {
      console.error(
        "Portfolio error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load portfolio.",
      });
    }
  }
);

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(
    `PHOENIX backend running on port ${PORT}`
  );
});