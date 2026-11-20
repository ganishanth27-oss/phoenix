import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { store } from "./store.js";

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
   PUBLIC: SUBMIT ENQUIRY / DIRECT WORK REQUEST
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
        project_title,
        service_interest,
        serviceCategory,
        message,
        expected_budget,
        expected_date,
        reference_files,
      } = req.body || {};

      /* ── Validate required fields ── */

      if (
        !name?.trim() ||
        !email?.trim() ||
        (!message?.trim() && !project_title?.trim())
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Full Name, email, and your project requirements are required.",
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
        "Custom Project";

      const cleanName    = name.trim();
      const cleanEmail   = email.trim().toLowerCase();
      const cleanPhone   = phone?.trim()   || null;
      const cleanCompany = company?.trim() || null;
      const cleanMsg     = (message?.trim() || project_title?.trim() || "Work request submitted via direct portal");

      // Generate human-friendly Unique Request ID
      const uniqueRequestId = "REQ-" + Math.floor(100000 + Math.random() * 900000);

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
          company:          cleanCompany || (project_title ? `Project: ${project_title}` : null),
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

      const displayTitle = project_title?.trim()
        ? `${project_title.trim()} (${resolvedService})`
        : cleanCompany
        ? `${resolvedService} - ${cleanCompany}`
        : `${resolvedService} - ${cleanName}`;

      const reqRequirements = [
        `[WORK REQUEST ID: ${uniqueRequestId}]`,
        "",
        "[CUSTOMER DETAILS]",
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Phone: ${cleanPhone || "Not provided"}`,
        `Organization / Client: ${cleanCompany || "Individual Client"}`,
        `Service Category: ${resolvedService}`,
        `Expected Budget: ${expected_budget ? `₹${expected_budget}` : "To be discussed"}`,
        `Target Completion Date: ${expected_date || "Flexible"}`,
        reference_files ? `Reference Files: ${reference_files}` : "",
        "",
        "[PROJECT REQUIREMENTS & BRIEF]",
        cleanMsg,
      ].filter(Boolean).join("\n");

      /* ── 4. Insert into user_requests ── */

      const {
        data: userReq,
        error: reqErr,
      } = await supabaseAdmin
        .from("user_requests")
        .insert({
          user_id:      GUEST_USER_ID,
          service_id:   matchedServiceId,
          title:        displayTitle,
          description:  cleanMsg,
          requirements: reqRequirements,
          priority:     "medium",
          status:       "submitted",
        })
        .select("id")
        .single();

      if (reqErr) {
        console.error(
          "user_requests insert error:",
          reqErr
        );
        return res.status(500).json({
          success: false,
          message: "Failed to save enquiry in database: " + reqErr.message,
        });
      }

      // ── 5. In-App Notification to Admins ──
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      (admins || []).forEach((adm) => {
        store.addNotification({
          user_id: adm.id,
          title: `New Direct Work Request: ${uniqueRequestId}`,
          message: `${cleanName} requested ${resolvedService}: "${displayTitle}".`,
          type: "project",
          link: "/admin/requests",
        });
      });

      return res.status(201).json({
        success: true,
        request_id: uniqueRequestId,
        message:
          "Thank you for choosing Phoenix Solutions! Your project request has been submitted successfully. Our team will review your requirements and contact you shortly.",
        enquiry_id: enquiry?.id || null,
        user_request_id: userReq?.id || null,
      });
    } catch (error) {
      console.error("Work request submission error:", error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit work request. Please try again or reach out via Phoenix AI.",
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
        console.warn("Portfolio query warning:", projectsError.message);
      }

      const safeProjects = projects || [];

      /*
        For each project, also fetch
        public preview attachments.
      */
      const projectIds = safeProjects.map((p) => p.id);

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
          attachments = attachData || [];
        }
      }

      /* Map attachments to projects */
      const result = safeProjects.map((project) => ({
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
        data: result,
        projects: result,
      });
    } catch (error) {
      console.error(
        "Portfolio error:",
        error
      );

      return res.json({
        success: true,
        data: [],
        projects: [],
        message: "No portfolio items available at this time.",
      });
    }
  }
);

/* =========================
   PUBLIC: QR CODE SETTINGS
========================= */

app.get("/api/public/qr-settings", async (req, res) => {
  try {
    const settings = store.getQRSettings();
    return res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Public QR settings error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =========================
   ADMIN: QR CODE MANAGEMENT
========================= */

app.get("/api/admin/qr-settings", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const settings = store.getQRSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error("Admin QR settings error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/qr-settings", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const {
      payee_name,
      upi_id,
      payment_description,
      qr_image_url,
      qr_type,
      is_active,
      payment_instructions,
    } = req.body;

    if (!upi_id || !payee_name) {
      return res.status(400).json({
        success: false,
        message: "Payee Name and UPI ID are required.",
      });
    }

    // Basic UPI ID format check (name@bank)
    if (!upi_id.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid UPI ID format. Expected format: name@bank",
      });
    }

    const updated = store.updateQRSettings({
      payee_name: payee_name.trim(),
      upi_id: upi_id.trim().toLowerCase(),
      payment_description: payment_description?.trim() || "Phoenix Solutions Project Payment",
      qr_image_url: qr_image_url || null,
      qr_type: qr_type === "dynamic" ? "dynamic" : "static",
      is_active: typeof is_active === "boolean" ? is_active : true,
      payment_instructions: payment_instructions || "",
    });

    // Activity log
    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "update_qr_settings",
      description: `Admin updated company UPI QR settings (${updated.upi_id})`,
    });

    return res.json({
      success: true,
      message: "Payment QR code configuration updated successfully.",
      settings: updated,
    });
  } catch (error) {
    console.error("Save QR settings error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   ADMIN: WORK REQUESTS / USER REQUESTS MANAGEMENT
===================================================== */

app.get("/api/admin/requests", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { data: requests, error } = await supabaseAdmin
      .from("user_requests")
      .select(`
        id,
        user_id,
        manager_id,
        service_id,
        title,
        description,
        requirements,
        priority,
        status,
        due_date,
        admin_notes,
        manager_notes,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          name,
          email,
          phone
        ),
        services:service_id (
          id,
          name
        ),
        managers:manager_id (
          id,
          name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter out soft-deleted requests from store
    const deletedList = store.getDeletedRecords("user_requests");
    const activeRequests = (requests || []).filter((r) => !deletedList.includes(r.id));

    return res.json({
      success: true,
      data: activeRequests,
      requests: activeRequests,
    });
  } catch (error) {
    console.error("Admin fetch requests error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/admin/requests/:id", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;
    const updates = req.body || {};

    const { data: updated, error } = await supabaseAdmin
      .from("user_requests")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "admin_update_request",
      description: `Admin updated request ${id}: ${Object.keys(updates).join(", ")}`,
    });

    return res.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    console.error("Admin update request error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/admin/requests/:id", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;

    // Fetch details to preserve in deleted items store
    const { data: reqData, error: fetchErr } = await supabaseAdmin
      .from("user_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Fetch request before delete error:", fetchErr);
      return res.status(500).json({ success: false, message: "Failed to find request: " + fetchErr.message });
    }

    if (!reqData) {
      return res.status(404).json({ success: false, message: "Request record not found or already deleted." });
    }

    // Check if enquiry has been converted into project
    if (reqData.admin_notes && reqData.admin_notes.includes("[PROJECT CREATED ID:")) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this request because it has already been converted into an active Project. Please manage or archive it from Project Management instead."
      });
    }

    // Soft delete tracking in persistent store
    store.addDeletedRecord("user_requests", id, {
      title: reqData?.title || "Customer Request",
      type: "Work Request",
      deleted_by: adminCheck.user.id,
      deleted_by_name: adminCheck.profile?.name || "Admin",
      deleted_at: new Date().toISOString(),
      record: reqData,
      requirements: reqData?.requirements,
      description: reqData?.description,
      status: reqData?.status
    });

    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "delete_request",
      description: `Admin deleted work request ${id} ("${reqData?.title || "Request"}")`,
    });

    return res.json({
      success: true,
      message: "Customer enquiry deleted successfully.",
    });
  } catch (error) {
    console.error("Delete request error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete request" });
  }
});

/* =====================================================
   ADMIN: TASKS MANAGEMENT (WITH SOFT DELETE)
===================================================== */

app.get("/api/admin/tasks", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        description,
        project_id,
        service_id,
        manager_id,
        user_id,
        priority,
        status,
        due_date,
        created_at,
        projects:project_id (name),
        services:service_id (name),
        managers:manager_id (name, email),
        users:user_id (name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const deletedTasks = store.getDeletedRecords("tasks");
    const activeTasks = (tasks || []).filter((t) => !deletedTasks.includes(t.id));

    return res.json({
      success: true,
      tasks: activeTasks,
    });
  } catch (error) {
    console.error("Admin fetch tasks error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/admin/tasks/:id", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;

    const { data: taskData } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    store.addDeletedRecord("tasks", id, {
      title: taskData?.title || "Task",
      type: "Task",
      deleted_by: adminCheck.user.id,
      deleted_by_name: adminCheck.profile.name,
      deleted_at: new Date().toISOString(),
      record: taskData,
    });

    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "delete_task",
      description: `Admin deleted task ${id} ("${taskData?.title || "Task"}")`,
    });

    return res.json({
      success: true,
      message: "Item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   ADMIN: PROJECTS DELETE / ARCHIVE (WITH FINANCIAL SAFETY)
===================================================== */

app.delete("/api/admin/projects/:id", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;

    // Financial Safety Check: NEVER delete if verified payments or invoices exist
    const txs = store.getTransactions({ projectId: id });
    const verifiedTxs = txs.filter((t) => t.status === "verified");

    if (verifiedTxs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete project because it contains ${verifiedTxs.length} verified payment receipt(s). Financial audit records cannot be deleted. You may mark the project status as 'Cancelled' instead.`,
      });
    }

    const { data: projData } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    store.addDeletedRecord("projects", id, {
      title: projData?.name || "Project",
      type: "Project",
      deleted_by: adminCheck.user.id,
      deleted_by_name: adminCheck.profile.name,
      deleted_at: new Date().toISOString(),
      record: projData,
    });

    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "delete_project",
      description: `Admin deleted project ${id} ("${projData?.name || "Project"}")`,
    });

    return res.json({
      success: true,
      message: "Item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   ADMIN: DELETED ITEMS & RESTORE RECOVERY
===================================================== */

app.get("/api/admin/deleted-items", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const items = store.getAllDeletedItems();
    return res.json({ success: true, data: items, items });
  } catch (error) {
    console.error("Get deleted items error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/deleted-items/restore", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { category, id } = req.body;
    if (!category || !id) {
      return res.status(400).json({ success: false, message: "Category and ID required." });
    }

    const restored = store.restoreDeletedRecord(category, id);
    if (!restored) {
      return res.status(404).json({ success: false, message: "Record not found in deleted items." });
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "restore_record",
      description: `Admin restored ${category} record ${id} ("${restored.title}")`,
    });

    return res.json({
      success: true,
      message: "Item restored successfully.",
      item: restored,
    });
  } catch (error) {
    console.error("Restore error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   ADMIN: ADVANCE & PROJECT FINANCIAL MANAGEMENT
===================================================== */

app.get("/api/admin/financials/overview", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const allFin = store.getAllFinancials();
    const proofs = store.getProofs();
    const transactions = store.getTransactions();

    let totalProjectValue = 0;
    let totalAdvanceAssigned = 0;

    Object.values(allFin).forEach((f) => {
      totalProjectValue += Number(f.total_cost || 0);
      totalAdvanceAssigned += Number(f.advance_assigned || 0);
    });

    let totalPaymentsReceived = 0;
    transactions.forEach((t) => {
      if (t.status === "verified") {
        totalPaymentsReceived += Number(t.amount || 0);
      }
    });

    let pendingProofsAmount = 0;
    const pendingProofsCount = proofs.filter((p) => p.verification_status === "pending_verification").length;
    proofs.forEach((p) => {
      if (p.verification_status === "pending_verification") {
        pendingProofsAmount += Number(p.amount_claimed || 0);
      }
    });

    const outstandingAmount = Math.max(0, totalProjectValue - totalPaymentsReceived);

    return res.json({
      success: true,
      metrics: {
        totalProjectValue,
        totalAdvanceAssigned,
        totalPaymentsReceived,
        pendingProofsCount,
        pendingProofsAmount,
        outstandingAmount,
        totalProofsCount: proofs.length,
        approvedProofsCount: proofs.filter((p) => p.verification_status === "approved").length,
        rejectedProofsCount: proofs.filter((p) => p.verification_status === "rejected").length,
      },
      recentTransactions: transactions.slice(0, 10),
      recentProofs: proofs.slice(0, 10),
    });
  } catch (error) {
    console.error("Admin financial overview error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/projects/:id/financials", async (req, res) => {
  try {
    const authCheck = await getAuthenticatedUser(req);
    if (authCheck.error) {
      return res.status(401).json({ success: false, message: authCheck.error });
    }

    const { id } = req.params;
    const fin = store.getFinancials(id);
    const proofs = store.getProofs({ projectId: id });
    const transactions = store.getTransactions({ projectId: id });

    let verifiedPaid = 0;
    transactions.forEach((t) => {
      if (t.status === "verified") verifiedPaid += Number(t.amount || 0);
    });

    const remainingBalance = Math.max(0, Number(fin.total_cost || 0) - verifiedPaid);

    return res.json({
      success: true,
      financials: {
        ...fin,
        verified_paid: verifiedPaid,
        remaining_balance: remainingBalance,
      },
      proofs,
      transactions,
    });
  } catch (error) {
    console.error("Project financials error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/projects/:id/financials", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;
    const {
      total_cost,
      advance_assigned,
      advance_due_date,
      payment_instructions,
      advance_status,
    } = req.body;

    const numTotal = Math.max(0, Number(total_cost || 0));
    const numAdvance = Math.max(0, Number(advance_assigned || 0));

    if (numAdvance > numTotal && numTotal > 0) {
      return res.status(400).json({
        success: false,
        message: "Advance amount cannot exceed the total project cost.",
      });
    }

    const saved = store.saveFinancials(id, {
      total_cost: numTotal,
      advance_assigned: numAdvance,
      advance_due_date: advance_due_date || null,
      payment_instructions: payment_instructions || "",
      advance_status: advance_status || (numAdvance > 0 ? "assigned" : "not_assigned"),
    });

    // Notify project customer if user linked
    const { data: projUsers } = await supabaseAdmin
      .from("project_users")
      .select("user_id")
      .eq("project_id", id);

    (projUsers || []).forEach((pu) => {
      store.addNotification({
        user_id: pu.user_id,
        title: "Project Payment Schedule Updated",
        message: `Advance payment of ₹${numAdvance.toLocaleString("en-IN")} assigned. Total project cost: ₹${numTotal.toLocaleString("en-IN")}.`,
        type: "payment",
        link: "/dashboard",
      });
    });

    await supabaseAdmin.from("activity_logs").insert({
      user_id: adminCheck.user.id,
      action: "assign_advance_payment",
      description: `Admin assigned advance of ₹${numAdvance} on project ${id} (Total: ₹${numTotal})`,
    });

    return res.json({
      success: true,
      message: "Project financials and advance payment schedule updated.",
      financials: saved,
    });
  } catch (error) {
    console.error("Save project financials error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   MANAGER: FINAL AMOUNT ASSIGNMENT (PROPOSALS)
===================================================== */

app.post("/api/manager/projects/:id/final-amount", async (req, res) => {
  try {
    const authCheck = await getAuthenticatedUser(req);
    if (authCheck.error) {
      return res.status(401).json({ success: false, message: authCheck.error });
    }

    if (authCheck.profile.role !== "manager" && authCheck.profile.role !== "admin") {
      return res.status(403).json({ success: false, message: "Manager access required." });
    }

    const { id } = req.params;
    const { proposal_type, proposed_amount, proposal_notes } = req.body;

    const numAmt = Number(proposed_amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid positive proposed amount.",
      });
    }

    // Verify manager is assigned to this project (unless admin)
    if (authCheck.profile.role === "manager") {
      const { data: proj } = await supabaseAdmin
        .from("projects")
        .select("id, manager_id, name")
        .eq("id", id)
        .single();

      if (!proj || proj.manager_id !== authCheck.user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only submit final amounts for your assigned projects.",
        });
      }
    }

    const updated = store.saveFinancials(id, {
      manager_proposal_type: proposal_type === "additional_amount" ? "additional_amount" : "total_cost",
      manager_proposed_amount: numAmt,
      manager_proposal_notes: proposal_notes || "",
      manager_proposal_status: "pending_approval",
      manager_proposed_by: authCheck.user.id,
      manager_proposed_at: new Date().toISOString(),
    });

    // Notify admins
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    (admins || []).forEach((adm) => {
      store.addNotification({
        user_id: adm.id,
        title: "Manager Final Amount Proposal",
        message: `Manager ${authCheck.profile.name} proposed ₹${numAmt.toLocaleString("en-IN")} final amount for project.`,
        type: "payment",
        link: "/admin/payments",
      });
    });

    return res.json({
      success: true,
      message: "Final amount proposal submitted for Admin approval.",
      financials: updated,
    });
  } catch (error) {
    console.error("Manager final amount error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/projects/:id/review-final-amount", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;
    const { action, notes } = req.body; // 'approve' or 'reject'

    const currentFin = store.getFinancials(id);
    if (currentFin.manager_proposal_status !== "pending_approval") {
      return res.status(400).json({
        success: false,
        message: "No pending manager proposal found for this project.",
      });
    }

    let updatedCost = currentFin.total_cost;
    if (action === "approve") {
      if (currentFin.manager_proposal_type === "additional_amount") {
        updatedCost = Number(currentFin.total_cost || 0) + Number(currentFin.manager_proposed_amount || 0);
      } else {
        updatedCost = Number(currentFin.manager_proposed_amount || 0);
      }
    }

    const saved = store.saveFinancials(id, {
      total_cost: updatedCost,
      manager_proposal_status: action === "approve" ? "approved" : "rejected",
      admin_proposal_notes: notes || "",
    });

    // Notify manager
    if (currentFin.manager_proposed_by) {
      store.addNotification({
        user_id: currentFin.manager_proposed_by,
        title: `Final Amount Proposal ${action === "approve" ? "Approved" : "Rejected"}`,
        message: `Admin ${action}ed your final amount proposal. Project total cost is now ₹${updatedCost.toLocaleString("en-IN")}.`,
        type: "payment",
        link: "/manager/projects",
      });
    }

    return res.json({
      success: true,
      message: `Final amount proposal ${action === "approve" ? "approved" : "rejected"} successfully.`,
      financials: saved,
    });
  } catch (error) {
    console.error("Admin review proposal error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   CUSTOMER: PAYMENT PROOF (SCREENSHOT) SUBMISSION
===================================================== */

app.post("/api/customer/payment-proofs", async (req, res) => {
  try {
    const authCheck = await getAuthenticatedUser(req);
    if (authCheck.error) {
      return res.status(401).json({ success: false, message: authCheck.error });
    }

    const {
      project_id,
      amount_claimed,
      payment_method,
      transaction_ref_id,
      payment_date,
      screenshot_url,
      customer_notes,
    } = req.body;

    if (!project_id || !amount_claimed || !transaction_ref_id || !screenshot_url) {
      return res.status(400).json({
        success: false,
        message: "Project ID, amount, UTR / transaction reference ID, and screenshot URL are required.",
      });
    }

    const numAmount = Number(amount_claimed);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid claimed payment amount.",
      });
    }

    // Check for duplicate transaction references already submitted or verified
    const existingProofs = store.getProofs();
    const duplicate = existingProofs.find(
      (p) =>
        p.transaction_ref_id?.trim().toLowerCase() ===
          transaction_ref_id.trim().toLowerCase() &&
        p.verification_status !== "rejected"
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Transaction Reference ID '${transaction_ref_id}' has already been submitted (Status: ${duplicate.verification_status}). Duplicate submissions are not allowed.`,
      });
    }

    // Fetch project title for reference
    const { data: proj } = await supabaseAdmin
      .from("projects")
      .select("id, name")
      .eq("id", project_id)
      .single();

    const proof = store.addProof({
      customer_id: authCheck.user.id,
      customer_name: authCheck.profile.name,
      customer_email: authCheck.profile.email,
      project_id,
      project_name: proj?.name || "Phoenix Project",
      amount_claimed: numAmount,
      payment_method: payment_method || "UPI",
      transaction_ref_id: transaction_ref_id.trim(),
      payment_date: payment_date || new Date().toISOString().split("T")[0],
      screenshot_url,
      customer_notes: customer_notes || "",
    });

    // Notify all admins of pending proof
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    (admins || []).forEach((adm) => {
      store.addNotification({
        user_id: adm.id,
        title: "New Payment Proof Submitted",
        message: `Customer ${authCheck.profile.name} submitted proof for ₹${numAmount.toLocaleString("en-IN")} (Ref: ${transaction_ref_id}).`,
        type: "payment",
        link: "/admin/proofs",
      });
    });

    return res.status(201).json({
      success: true,
      message: "Payment proof submitted successfully. Our team will verify your payment against bank records shortly.",
      proof,
    });
  } catch (error) {
    console.error("Payment proof submission error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   ADMIN: PAYMENT PROOF VERIFICATION & APPROVAL
===================================================== */

app.get("/api/admin/payment-proofs", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { status, projectId } = req.query;
    const proofs = store.getProofs({ status, projectId });
    return res.json({ success: true, proofs });
  } catch (error) {
    console.error("Admin list proofs error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/payment-proofs/:id/verify", async (req, res) => {
  try {
    const adminCheck = await getAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(401).json({ success: false, message: adminCheck.error });
    }

    const { id } = req.params;
    const { action, admin_remarks, rejection_reason } = req.body; // 'approve', 'reject', 'request_resubmission'

    if (!["approve", "reject", "request_resubmission"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'approve', 'reject', or 'request_resubmission'.",
      });
    }

    const proofs = store.getProofs();
    const proof = proofs.find((p) => p.id === id);

    if (!proof) {
      return res.status(404).json({ success: false, message: "Payment proof not found." });
    }

    if (proof.verification_status === "approved") {
      return res.status(400).json({
        success: false,
        message: "This payment proof has already been approved and cannot be altered.",
      });
    }

    if (action === "reject" && !rejection_reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required when rejecting a payment proof.",
      });
    }

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      request_resubmission: "resubmission_requested",
    };

    const newStatus = statusMap[action];

    const updatedProof = store.updateProof(id, {
      verification_status: newStatus,
      admin_remarks: admin_remarks || "",
      rejection_reason: rejection_reason || null,
      reviewed_by: adminCheck.user.id,
      reviewed_at: new Date().toISOString(),
    });

    let verifiedTransaction = null;

    if (action === "approve") {
      // 1. Create official verified ledger transaction
      verifiedTransaction = store.addTransaction({
        proof_id: proof.id,
        customer_id: proof.customer_id,
        customer_name: proof.customer_name,
        project_id: proof.project_id,
        project_name: proof.project_name,
        amount: Number(proof.amount_claimed),
        payment_method: proof.payment_method,
        transaction_ref_id: proof.transaction_ref_id,
        payment_date: proof.payment_date,
        verified_by: adminCheck.user.id,
      });

      // 2. Update advance status if applicable
      const fin = store.getFinancials(proof.project_id);
      const allTxs = store.getTransactions({ projectId: proof.project_id });
      let totalPaid = 0;
      allTxs.forEach((t) => (totalPaid += Number(t.amount || 0)));

      let newAdvStatus = fin.advance_status;
      if (totalPaid >= Number(fin.total_cost || 0) && Number(fin.total_cost || 0) > 0) {
        newAdvStatus = "paid";
      } else if (totalPaid >= Number(fin.advance_assigned || 0) && Number(fin.advance_assigned || 0) > 0) {
        newAdvStatus = "paid";
      } else if (totalPaid > 0) {
        newAdvStatus = "partially_paid";
      }

      store.saveFinancials(proof.project_id, {
        advance_status: newAdvStatus,
      });

      // 3. Notify Customer with official receipt number
      store.addNotification({
        user_id: proof.customer_id,
        title: "Payment Approved & Receipt Issued",
        message: `Your payment of ₹${proof.amount_claimed.toLocaleString("en-IN")} has been verified! Receipt #${verifiedTransaction.receipt_number} is ready.`,
        type: "payment",
        link: "/dashboard",
      });

      // 4. Activity log
      await supabaseAdmin.from("activity_logs").insert({
        user_id: adminCheck.user.id,
        action: "verify_payment_approved",
        description: `Admin approved payment of ₹${proof.amount_claimed} (UTR: ${proof.transaction_ref_id}) for project ${proof.project_id}. Receipt #${verifiedTransaction.receipt_number}`,
      });
    } else {
      // Rejection or resubmission request notification
      store.addNotification({
        user_id: proof.customer_id,
        title: `Payment Proof ${action === "reject" ? "Rejected" : "Needs Correction"}`,
        message: `Your payment proof for ₹${proof.amount_claimed.toLocaleString("en-IN")} was not verified: ${rejection_reason || admin_remarks}. Please check and resubmit if necessary.`,
        type: "alert",
        link: "/dashboard",
      });
    }

    return res.json({
      success: true,
      message: `Payment proof ${newStatus} successfully.`,
      proof: updatedProof,
      transaction: verifiedTransaction,
    });
  } catch (error) {
    console.error("Admin verify proof error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   CUSTOMER NOTIFICATIONS
===================================================== */

app.get("/api/notifications", async (req, res) => {
  try {
    const authCheck = await getAuthenticatedUser(req);
    if (authCheck.error) {
      return res.status(401).json({ success: false, message: authCheck.error });
    }

    const notifs = store.getNotifications(authCheck.user.id);
    return res.json({ success: true, notifications: notifs });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/notifications/mark-read", async (req, res) => {
  try {
    const authCheck = await getAuthenticatedUser(req);
    if (authCheck.error) {
      return res.status(401).json({ success: false, message: authCheck.error });
    }

    store.markNotificationsRead(authCheck.user.id);
    return res.json({ success: true, message: "Notifications marked as read." });
  } catch (error) {
    console.error("Mark read error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =====================================================
   PAYMENT GATEWAY (RAZORPAY READY STUB & WEBHOOK)
===================================================== */

app.post("/api/payment-gateway/create-order", async (req, res) => {
  try {
    const authCheck = await getAuthenticatedUser(req);
    if (authCheck.error) {
      return res.status(401).json({ success: false, message: authCheck.error });
    }

    const { amount, project_id, currency = "INR" } = req.body;

    if (!amount || amount <= 0 || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Valid amount and project ID are required.",
      });
    }

    // Check if RAZORPAY_KEY_ID is set
    const rzpKey = process.env.RAZORPAY_KEY_ID;
    if (!rzpKey) {
      return res.json({
        success: false,
        configured: false,
        message: "Razorpay credentials not yet configured. Please use the UPI QR Code payment method.",
      });
    }

    // When configured with real credentials, an order would be created via Razorpay SDK:
    // const order = await razorpay.orders.create({ amount: Math.round(amount * 100), currency, receipt: ... });
    return res.json({
      success: true,
      configured: true,
      order_id: "order_mock_" + Math.random().toString(36).substring(2, 10),
      amount: Math.round(amount * 100),
      currency,
      key_id: rzpKey,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* =========================
   SERVER STARTUP & HEALTH CHECK
========================= */

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
  let dbStatus = "Checking...";
  try {
    const { error } = await supabaseAdmin.from("services").select("id").limit(1);
    dbStatus = error ? `Error (${error.message})` : "Connected";
  } catch (e) {
    dbStatus = `Unavailable (${e.message})`;
  }

  console.log("==========================================");
  console.log("PHOENIX BACKEND STARTED");
  console.log(`PORT: ${PORT}`);
  console.log(`DATABASE: ${dbStatus}`);
  console.log("API: Ready");
  console.log("==========================================");
});