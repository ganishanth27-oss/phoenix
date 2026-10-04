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
  "https://phoenix-chi-beryl.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* =========================
   SUPABASE
========================= */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

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

app.get("/api/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
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
    console.error("Supabase test error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================
   ADMIN AUTHENTICATION
========================= */

const getAdminFromRequest = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      error: "Invalid or expired authentication token.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, role, status")
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

app.post("/api/admin/managers", async (req, res) => {
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || null;

    /* Create authentication account */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    const managerId = authData.user.id;

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
      message: "Manager created successfully.",
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
});

/* =========================
   USER REGISTRATION
========================= */

app.post("/api/auth/register", async (req, res) => {
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || null;

    /* Create Supabase Auth account */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    const userId = authData.user.id;

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
      message: "Account created successfully.",
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
});

/* =========================
   SERVER
========================= */

const PORT = 8000;

app.listen(PORT, () => {
  console.log(
    `PHOENIX backend running on port ${PORT}`
  );
});