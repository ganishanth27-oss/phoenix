import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import phoenixLogo from "../assets/phoenix-logo.png";
import PhoenixAIModal from "../components/PhoenixAIModal";
import Phoenix3DHero from "../components/Phoenix3DHero";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  // Dynamic services & portfolio states
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [portfolioProjects, setPortfolioProjects] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [selectedPortfolioModal, setSelectedPortfolioModal] = useState(null);

  // Auth session check (for Admin / Manager quick status if already logged in)
  const [sessionUser, setSessionUser] = useState(null);

  // Mobile navigation drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Phoenix AI Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Public Direct Work Request Form State (NO LOGIN REQUIRED)
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    phone: "",
    email: "",
    serviceCategory: "",
    project_title: "",
    message: "",
    expected_budget: "",
    expected_date: "",
    reference_files: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquiryStatus, setEnquiryStatus] = useState({ text: "", type: "", requestId: "" });
  const [uploadingRefFile, setUploadingRefFile] = useState(false);

  // Core verified services definitions
  const coreHighlights = [
    {
      id: "web-dev",
      title: "Web & Cloud Development",
      icon: "🌐",
      category: "Full-Stack Engineering",
      desc: "Modern responsive web applications, portals, and cloud backends built for high performance, zero downtime, and robust enterprise scalability.",
      tag: "Enterprise Stack"
    },
    {
      id: "app-dev",
      title: "Mobile App Development",
      icon: "📱",
      category: "Native & Cross-Platform",
      desc: "Cross-platform iOS and Android mobile software designed with modern UX, offline caching, and real-time cloud data syncing.",
      tag: "iOS & Android"
    },
    {
      id: "ui-ux",
      title: "UI/UX & Design Systems",
      icon: "🎨",
      category: "Product Experience",
      desc: "Intuitive product architecture, user research, wireframes, high-fidelity prototypes, and design systems with futuristic precision.",
      tag: "Design System"
    },
    {
      id: "3d-blueprints",
      title: "3D Design & Blueprints",
      icon: "📐",
      category: "Spatial Architecture & CAD",
      desc: "Precision 3D modeling, construction blueprints, architectural drafting, MEP schematics, and interactive spatial visualizations.",
      tag: "3D CAD & MEP"
    },
    {
      id: "ad-creation",
      title: "Advertisement Creation",
      icon: "📢",
      category: "Creative Media & Ads",
      desc: "High-impact visual campaigns, social media ad units, multi-platform banner suites, and strategic brand positioning collateral.",
      tag: "Growth Media"
    },
    {
      id: "video-edit",
      title: "Video Editing & Motion",
      icon: "🎬",
      category: "Post-Production",
      desc: "Professional post-production, motion graphics, promotional cuts, 3D visual FX, and compelling storytelling for digital channels.",
      tag: "Motion Graphics"
    },
    {
      id: "viral-marketing",
      title: "Viral Marketing & Memes",
      icon: "⚡",
      category: "Community & Viral",
      desc: "Culturally resonant viral creative content, trend-driven digital media engineered for rapid engagement, and social community building.",
      tag: "High Velocity"
    },
  ];

  // Curated fallback projects with thumbnails
  const fallbackProjects = [
    {
      id: "p-1",
      title: "Enterprise Financial Dashboard & Analytics",
      service_category: "Web & Cloud Development",
      description: "High-throughput financial analytics portal with real-time charting, multi-tenant security, and automated reporting infrastructure.",
      client_name: "Apex Global Capital",
      completion_date: "October 2026",
      technologies_used: ["React 19", "Node.js", "Supabase", "PostgreSQL", "TailwindCSS"],
      thumbnail_url: null,
      icon: "📊"
    },
    {
      id: "p-2",
      title: "Commercial Complex 3D Architectural Blueprint",
      service_category: "3D Design & Blueprints",
      description: "Architectural spatial rendering, structural schematics, and MEP blueprints for an 80,000 sq ft smart retail & commercial facility.",
      client_name: "Nexus Properties Group",
      completion_date: "September 2026",
      technologies_used: ["Revit", "AutoCAD", "Blender 3D", "Spatial CAD"],
      thumbnail_url: null,
      icon: "🏢"
    },
    {
      id: "p-3",
      title: "Next-Gen Telehealth Mobile Platform",
      service_category: "Mobile App Development",
      description: "Encrypted patient-practitioner video consultation mobile app with intuitive calendar scheduling and HIPAA-compliant health records.",
      client_name: "CareVanguard Health",
      completion_date: "August 2026",
      technologies_used: ["React Native", "WebRTC", "Node.js", "PostgreSQL"],
      thumbnail_url: null,
      icon: "🩺"
    },
    {
      id: "p-4",
      title: "High-Velocity Digital Brand & Ad Suite",
      service_category: "Advertisement Creation",
      description: "Comprehensive multi-channel digital ad campaign generating over 4.2M verified impressions and 28% increase in qualified sales pipeline.",
      client_name: "Starlight Dynamics",
      completion_date: "July 2026",
      technologies_used: ["Adobe After Effects", "Figma", "Cinema 4D"],
      thumbnail_url: null,
      icon: "🚀"
    }
  ];

  useEffect(() => {
    // Check if session exists (to display Admin/Manager link if logged in)
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role, name, email")
            .eq("id", user.id)
            .single();
          if (profile) setSessionUser(profile);
        }
      } catch (err) {
        // Public page gracefully continues
      }
    };

    // Load services from database
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const { data, error } = await supabase
          .from("services")
          .select("id, name, description, status")
          .eq("status", "active")
          .order("name");
        if (!error && data && data.length > 0) {
          setServices(data);
        }
      } catch (e) {
        console.error("Services load error:", e);
      } finally {
        setLoadingServices(false);
      }
    };

    // Load portfolio projects safely
    const loadPortfolio = async () => {
      try {
        setLoadingPortfolio(true);
        let loaded = false;

        try {
          const res = await fetch("/api/public/portfolio");
          if (res.ok) {
            const text = await res.text();
            if (text) {
              const json = JSON.parse(text);
              const list = json.data || json.projects || [];
              if (Array.isArray(list) && list.length > 0) {
                setPortfolioProjects(list);
                loaded = true;
                return;
              }
            }
          }
        } catch (fetchErr) {
          console.warn("Portfolio API notice:", fetchErr.message);
        }

        if (!loaded) {
          // Direct Supabase query fallback
          const { data, error } = await supabase
            .from("project_submissions")
            .select("id, title, description, service_category, client_name, completion_date, technologies_used, thumbnail_url")
            .eq("status", "approved")
            .eq("is_published", true)
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            setPortfolioProjects(data);
          }
        }
      } catch (err) {
        console.warn("Portfolio loading completed:", err.message);
      } finally {
        setLoadingPortfolio(false);
      }
    };

    checkSession();
    loadServices();
    loadPortfolio();
  }, []);

  // Handle reference file upload for work request
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB.");
      return;
    }

    setUploadingRefFile(true);
    try {
      const fileExt = file.name.split(".").pop();
      const safeName = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `requests/${safeName}`;

      const { data, error } = await supabase.storage
        .from("reference-files")
        .upload(filePath, file, { upsert: true });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("reference-files")
        .getPublicUrl(filePath);

      setEnquiryForm((prev) => ({ ...prev, reference_files: publicUrl }));
      alert("Reference file uploaded successfully!");
    } catch (err) {
      console.warn("Storage upload fallback:", err);
      // Fallback: note file name if storage bucket restricts anonymous
      setEnquiryForm((prev) => ({ ...prev, reference_files: file.name }));
    } finally {
      setUploadingRefFile(false);
    }
  };

  // Handle Public Project Enquiry Submission / Direct Work Request (No auth required)
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryForm.name.trim() || !enquiryForm.email.trim()) {
      setEnquiryStatus({
        text: "Please provide your full name and a valid email address.",
        type: "error",
      });
      return;
    }

    if (!enquiryForm.message.trim() && !enquiryForm.project_title.trim()) {
      setEnquiryStatus({
        text: "Please describe your project requirements.",
        type: "error",
      });
      return;
    }

    // Basic client-side email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(enquiryForm.email.trim())) {
      setEnquiryStatus({
        text: "Please enter a valid email address.",
        type: "error",
      });
      return;
    }

    setSubmittingEnquiry(true);
    setEnquiryStatus({ text: "", type: "", requestId: "" });

    try {
      const payload = {
        name: enquiryForm.name.trim(),
        email: enquiryForm.email.trim(),
        phone: enquiryForm.phone?.trim() || null,
        project_title: enquiryForm.project_title?.trim() || null,
        company: enquiryForm.project_title?.trim() || null,
        service_interest: enquiryForm.serviceCategory || "General Inquiry",
        serviceCategory: enquiryForm.serviceCategory || "General Inquiry",
        message: enquiryForm.message.trim(),
        expected_budget: enquiryForm.expected_budget?.trim() || null,
        expected_date: enquiryForm.expected_date || null,
        reference_files: enquiryForm.reference_files || null,
      };

      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json = null;
      const responseText = await res.text();
      if (responseText) {
        try {
          json = JSON.parse(responseText);
        } catch (jsonErr) {
          console.warn("Non-JSON response received:", responseText);
        }
      }

      if (!res.ok || !json?.success) {
        const errorMsg = json?.message || json?.error || "Failed to submit project enquiry. Please check your details and try again.";
        throw new Error(errorMsg);
      }

      const generatedId = json.request_id || "REQ-" + Math.floor(100000 + Math.random() * 900000);

      setEnquiryStatus({
        text:
          "Your project enquiry has been submitted successfully! Our team will review your requirements and contact you shortly.",
        type: "success",
        requestId: generatedId,
      });

      setEnquiryForm({
        name: "",
        phone: "",
        email: "",
        serviceCategory: "",
        project_title: "",
        message: "",
        expected_budget: "",
        expected_date: "",
        reference_files: "",
      });
    } catch (err) {
      console.error("Enquiry submission error:", err);
      setEnquiryStatus({
        text: err.message || "Failed to submit work request. Please try again.",
        type: "error",
      });
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="phoenix-homepage">
      {/* =====================================================
          BACKGROUND FLOATING PHOENIX WATERMARK
          Subtle 3D low-opacity Phoenix watermark behind homepage
      ===================================================== */}
      <div className="phoenix-bg-watermark-wrapper" aria-hidden="true">
        <div className="phoenix-ambient-orb orb-cyan" />
        <div className="phoenix-ambient-orb orb-blue" />
        <div className="phoenix-ambient-orb orb-gold" />
        <div className="phoenix-bg-grid" />
        <img
          src={phoenixLogo}
          alt=""
          className="phoenix-watermark-logo"
        />
      </div>

      {/* =====================================================
          TOP RESPONSIVE NAVIGATION BAR
      ===================================================== */}
      <header className="home-navbar">
        <div className="home-nav-container">
          {/* Brand Logo & Typography */}
          <Link to="/" className="home-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="home-logo-box">
              <img src={phoenixLogo} alt="Phoenix Solutions Logo" className="home-logo-img" />
            </div>
            <div className="home-brand-text">
              <span className="brand-title">
                PHOENIX <span className="brand-gold">SOLUTIONS</span>
              </span>
              <span className="brand-tagline">Creating Beyond Limits</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="home-nav-links" aria-label="Main Navigation">
            <a href="#hero" onClick={(e) => { e.preventDefault(); document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); }}>Home</a>
            <a href="#services" onClick={(e) => { e.preventDefault(); document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }); }}>Services</a>
            <a href="#projects" onClick={(e) => { e.preventDefault(); document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}>Projects</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }}>About Us</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}>Contact Us</a>
          </nav>

          {/* Right Action Items: Phoenix AI Button & Auth Portals */}
          <div className="home-nav-actions">
            <button
              className="nav-ai-btn"
              onClick={() => setAiModalOpen(true)}
              aria-label="Open Phoenix AI Assistant"
            >
              <span className="nav-ai-icon">✦</span>
              <span>Phoenix AI</span>
              <span className="nav-ai-pulse" />
            </button>

            {/* Separate Portals (No Customer login/account on public homepage) */}
            <div className="nav-auth-links">
              <Link to="/login" className="nav-auth-link" title="Manager Portal Access">
                Manager Login
              </Link>
              <Link to="/login" className="nav-auth-link admin-link" title="Administrator Portal Access">
                Admin Login
              </Link>
            </div>

            {/* Hamburger Button for Mobile */}
            <button
              className={`home-mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {/* Mobile Slide-in Navigation Drawer */}
        <div
          className={`home-mobile-drawer ${mobileMenuOpen ? "drawer-open" : ""}`}
          onClick={closeMobileMenu}
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-brand">
                <img src={phoenixLogo} alt="Phoenix Logo" className="drawer-logo-img" />
                <div>
                  <strong>PHOENIX SOLUTIONS</strong>
                  <span>Creating Beyond Limits</span>
                </div>
              </div>
              <button
                className="drawer-close-btn"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="drawer-ai-banner" onClick={() => { closeMobileMenu(); setAiModalOpen(true); }}>
              <div className="drawer-ai-badge">
                <span>✦</span>
                <strong>Meet Phoenix AI</strong>
              </div>
              <p>Launch our smart digital assistant for instant answers & project guidance.</p>
              <button className="drawer-ai-cta">Start Chat Now →</button>
            </div>

            <nav className="drawer-links">
              <a href="#hero" onClick={(e) => { e.preventDefault(); closeMobileMenu(); document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="drawer-link-icon">⚡</span> Home
              </a>
              <a href="#services" onClick={(e) => { e.preventDefault(); closeMobileMenu(); document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="drawer-link-icon">🌐</span> Services
              </a>
              <a href="#projects" onClick={(e) => { e.preventDefault(); closeMobileMenu(); document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="drawer-link-icon">📁</span> Projects
              </a>
              <a href="#about" onClick={(e) => { e.preventDefault(); closeMobileMenu(); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="drawer-link-icon">🛡️</span> About Phoenix
              </a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); closeMobileMenu(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="drawer-link-icon">✉️</span> Contact Us
              </a>
            </nav>

            <div className="drawer-auth-section">
              <span className="drawer-section-title">Authorized Portals</span>
              <div className="drawer-auth-buttons">
                <Link to="/login" className="drawer-auth-btn manager" onClick={closeMobileMenu}>
                  Manager Login
                </Link>
                <Link to="/login" className="drawer-auth-btn admin" onClick={closeMobileMenu}>
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* =====================================================
            5. HOMEPAGE HERO SECTION
        ===================================================== */}
        <section id="hero" className="home-hero">
          <div className="home-container hero-container">
            {/* Left Content Column */}
            <div className="hero-content">
              {/* Official AI Headline Badge */}
              <div
                className="hero-ai-badge"
                onClick={() => setAiModalOpen(true)}
                title="Click to interact with Phoenix AI"
              >
                <span className="hero-badge-sparkle">✦</span>
                <span className="hero-badge-text">Meet Phoenix AI – Your Smart Digital Assistant</span>
                <span className="hero-badge-arrow">→</span>
              </div>

              {/* Main Heading */}
              <h1 className="hero-main-title">
                Have an Idea? <span className="title-gradient-gold">Let's Make It Happen.</span>
              </h1>

              {/* Subheading */}
              <h2 className="hero-subheading">
                Phoenix Solutions • Creating Beyond Limits
              </h2>

              {/* Description */}
              <p className="hero-description">
                From creative designs to advanced digital solutions, Phoenix Solutions helps turn your ideas into reality. Tell us what you need, and our team will take it forward.
              </p>

              {/* Two Prominent Action Buttons */}
              <div className="hero-cta-group">
                <a href="#start-project" className="hero-btn-primary">
                  <span>Request a Service</span>
                  <span className="btn-arrow">↓</span>
                </a>

                <button
                  className="hero-btn-secondary"
                  onClick={() => setAiModalOpen(true)}
                >
                  <span className="btn-sparkle">✦</span>
                  <span>Chat With Phoenix AI</span>
                </button>
              </div>

              {/* Trust Metric Pillars */}
              <div className="hero-metrics-grid">
                <div className="hero-metric-card">
                  <span className="metric-val">100%</span>
                  <span className="metric-lbl">Public Access • No Login Required</span>
                </div>
                <div className="hero-metric-card">
                  <span className="metric-val">24h</span>
                  <span className="metric-lbl">Senior Manager Project Review</span>
                </div>
                <div className="hero-metric-card">
                  <span className="metric-val">3D & AI</span>
                  <span className="metric-lbl">Next-Gen Digital Experience</span>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Phoenix Emblem */}
            <div className="hero-visual-col">
              <Phoenix3DHero onOpenAI={() => setAiModalOpen(true)} />
            </div>
          </div>
        </section>

        {/* =====================================================
            9. SERVICES SECTION
        ===================================================== */}
        <section id="services" className="home-section services-section">
          <div className="home-container">
            <div className="section-header">
              <div className="section-pill">
                <span>✦</span>
                <span>CORE CAPABILITIES</span>
              </div>
              <h2 className="section-title">
                Comprehensive IT & <span className="title-gradient-blue">Creative Services</span>
              </h2>
              <p className="section-subtitle">
                Engineered with precision. Delivered by specialized senior teams. Explore our end-to-end capabilities designed to take your enterprise beyond conventional limits.
              </p>
            </div>

            {/* Responsive Services Grid (4/3 col Desktop, 2 col Tablet, 1 col Mobile) */}
            <div className="services-grid">
              {(services.length > 0 ? services : coreHighlights).map((item, idx) => {
                const meta = coreHighlights[idx % coreHighlights.length];
                return (
                  <div key={item.id || idx} className="service-card">
                    <div className="service-card-glow" />
                    <div className="service-card-top">
                      <div className="service-icon-box">
                        <span>{meta.icon}</span>
                      </div>
                      <span className="service-badge">{meta.tag || meta.category}</span>
                    </div>

                    <h3 className="service-title">{item.name || item.title}</h3>
                    <p className="service-desc">
                      {item.description || item.desc}
                    </p>

                    <div className="service-footer">
                      <a href="#contact" className="service-learn-btn">
                        <span>Learn More & Enquire</span>
                        <span className="service-btn-arrow">→</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            4. HOW IT WORKS SECTION (Simple 3-Step Process)
        ===================================================== */}
        <section id="how-it-works" className="home-section how-it-works-section">
          <div className="home-container">
            <div className="section-header">
              <div className="section-pill">
                <span>✦</span>
                <span>EFFORTLESS WORKFLOW</span>
              </div>
              <h2 className="section-title">
                How It Works <span className="title-gradient-gold">In 3 Simple Steps</span>
              </h2>
              <p className="section-subtitle">
                We have eliminated all unnecessary complexity. Starting a digital or creative project with Phoenix Solutions takes under two minutes.
              </p>
            </div>

            <div className="how-it-works-grid">
              <div className="step-card">
                <div className="step-number-badge">STEP 1</div>
                <div className="step-icon">💡</div>
                <h3 className="step-title">Tell Us Your Idea</h3>
                <p className="step-desc">
                  Submit your project requirements directly through our online request form below. No account creation or password required.
                </p>
              </div>

              <div className="step-card highlight-step">
                <div className="step-number-badge gold-badge">STEP 2</div>
                <div className="step-icon">🤝</div>
                <h3 className="step-title">Our Team Connects With You</h3>
                <p className="step-desc">
                  A dedicated Senior Project Manager reviews your requirements, discusses your goals, and prepares tailored milestones and cost estimates.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number-badge">STEP 3</div>
                <div className="step-icon">🚀</div>
                <h3 className="step-title">Start Your Project</h3>
                <p className="step-desc">
                  Once approved, your project begins immediately. Track progress, review deliverables, and make secure UPI payments anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            5. START YOUR PROJECT (Direct Customer Request Form)
        ===================================================== */}
        <section id="start-project" className="home-section start-project-section">
          <div className="home-container">
            <div className="start-project-wrapper">
              <div className="start-project-header">
                <div className="section-pill">
                  <span>✦</span>
                  <span>DIRECT WORK REQUEST</span>
                </div>
                <h2 className="section-title">
                  Start Your <span className="title-gradient-blue">Project</span>
                </h2>
                <p className="section-subtitle">
                  Tell us what you need. Our team will review your brief and contact you directly.
                </p>
              </div>

              {enquiryStatus.text && (
                <div className={`work-request-alert ${enquiryStatus.type}`} role="alert">
                  <div className="alert-top">
                    <span className="alert-icon">{enquiryStatus.type === "success" ? "✓" : "⚠"}</span>
                    <strong>{enquiryStatus.text}</strong>
                  </div>
                  {enquiryStatus.requestId && (
                    <div className="alert-req-badge">
                      <span>Your Unique Request ID:</span>
                      <code>{enquiryStatus.requestId}</code>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleEnquirySubmit} className="direct-project-form">
                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="req-name">
                      Full Name <span className="form-req-star">*</span>
                    </label>
                    <input
                      id="req-name"
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={enquiryForm.name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="req-phone">
                      Mobile Number <span className="form-req-star">*</span>
                    </label>
                    <input
                      id="req-phone"
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="req-email">
                      Email Address <span className="form-req-star">*</span>
                    </label>
                    <input
                      id="req-email"
                      type="email"
                      required
                      placeholder="e.g. rahul@example.com"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="req-service">
                      Select Service <span className="form-req-star">*</span>
                    </label>
                    <select
                      id="req-service"
                      required
                      value={enquiryForm.serviceCategory}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, serviceCategory: e.target.value })}
                    >
                      <option value="">Select a service category...</option>
                      {(services.length > 0 ? services : coreHighlights).map((s, idx) => (
                        <option key={s.id || idx} value={s.name || s.title}>
                          {s.name || s.title}
                        </option>
                      ))}
                      <option value="Custom Enterprise Solution">Other / Custom Digital Solution</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="req-title">
                      Project Title <span className="form-req-star">*</span>
                    </label>
                    <input
                      id="req-title"
                      type="text"
                      required
                      placeholder="e.g. E-Commerce Web Portal & Mobile App"
                      value={enquiryForm.project_title}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, project_title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="req-message">
                    Describe Your Requirements <span className="form-req-star">*</span>
                  </label>
                  <textarea
                    id="req-message"
                    required
                    rows={4}
                    placeholder="Tell us what you want to build, key features, reference designs, or goals..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  />
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="req-budget">Expected Budget (Optional)</label>
                    <input
                      id="req-budget"
                      type="text"
                      placeholder="e.g. ₹30,000 - ₹50,000"
                      value={enquiryForm.expected_budget}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, expected_budget: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="req-date">Expected Completion Date (Optional)</label>
                    <input
                      id="req-date"
                      type="date"
                      value={enquiryForm.expected_date}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, expected_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="req-file">Upload Reference Files (Optional)</label>
                    <div className="file-input-wrapper">
                      <input
                        id="req-file"
                        type="file"
                        onChange={handleFileUpload}
                      />
                      {uploadingRefFile && <span className="file-uploading-txt">Uploading...</span>}
                      {enquiryForm.reference_files && (
                        <span className="file-attached-txt">✓ File attached</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-work-request-btn"
                  disabled={submittingEnquiry || uploadingRefFile}
                >
                  {submittingEnquiry ? (
                    <span>Submitting Your Work Request...</span>
                  ) : (
                    <>
                      <span>Submit My Work Request</span>
                      <span className="btn-arrow">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* =====================================================
            6. OUR PROJECTS / PORTFOLIO SECTION
        ===================================================== */}
        <section id="projects" className="home-section projects-section">
          <div className="home-container">
            <div className="section-header">
              <div className="section-pill">
                <span>✦</span>
                <span>VERIFIED DELIVERABLES</span>
              </div>
              <h2 className="section-title">
                Featured <span className="title-gradient-gold">Client Projects</span>
              </h2>
              <p className="section-subtitle">
                Explore real deliverables crafted by Phoenix specialists. Every project represents our commitment to modern architecture, technical resilience, and premium execution.
              </p>
            </div>

            {loadingPortfolio ? (
              <div className="projects-loading">
                <div className="loading-spinner" />
                <p>Loading curated portfolio showcase...</p>
              </div>
            ) : (
              <div className="projects-grid">
                {(portfolioProjects.length > 0 ? portfolioProjects : fallbackProjects).map((p) => (
                  <div
                    key={p.id}
                    className="project-card"
                    onClick={() => setSelectedPortfolioModal(p)}
                  >
                    <div className="project-thumbnail-box">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.title} className="project-thumb-img" />
                      ) : (
                        <div className="project-thumb-placeholder">
                          <span className="project-thumb-icon">{p.icon || "💎"}</span>
                          <span className="project-thumb-label">{p.service_category || "Phoenix Showcase"}</span>
                        </div>
                      )}
                      <span className="project-category-tag">{p.service_category || "Enterprise"}</span>
                    </div>

                    <div className="project-content">
                      <h3 className="project-title">{p.title}</h3>
                      <p className="project-desc">
                        {p.description?.length > 120 ? `${p.description.substring(0, 120)}...` : p.description}
                      </p>

                      {p.technologies_used && p.technologies_used.length > 0 && (
                        <div className="project-tech-tags">
                          {p.technologies_used.slice(0, 4).map((tech, i) => (
                            <span key={i} className="tech-tag">{tech}</span>
                          ))}
                        </div>
                      )}

                      <div className="project-card-footer">
                        <span className="project-client">Client: {p.client_name || "Enterprise"}</span>
                        <button className="project-view-btn">
                          <span>View Project</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Project Detail Modal */}
        {selectedPortfolioModal && (
          <div className="project-modal-backdrop" onClick={() => setSelectedPortfolioModal(null)}>
            <div className="project-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="project-modal-header">
                <div>
                  <span className="modal-category-badge">{selectedPortfolioModal.service_category}</span>
                  <h3 className="modal-title">{selectedPortfolioModal.title}</h3>
                </div>
                <button
                  className="modal-close"
                  onClick={() => setSelectedPortfolioModal(null)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="project-modal-body">
                {selectedPortfolioModal.thumbnail_url && (
                  <div className="modal-img-wrap">
                    <img src={selectedPortfolioModal.thumbnail_url} alt={selectedPortfolioModal.title} />
                  </div>
                )}

                <div className="modal-meta-bar">
                  <div className="modal-meta-item">
                    <span className="meta-lbl">Client</span>
                    <strong className="meta-val">{selectedPortfolioModal.client_name || "Confidential Enterprise Client"}</strong>
                  </div>
                  {selectedPortfolioModal.completion_date && (
                    <div className="modal-meta-item">
                      <span className="meta-lbl">Delivered</span>
                      <strong className="meta-val">{selectedPortfolioModal.completion_date}</strong>
                    </div>
                  )}
                  <div className="modal-meta-item">
                    <span className="meta-lbl">Quality Audit</span>
                    <strong className="meta-val status-green">✓ Verified & Approved</strong>
                  </div>
                </div>

                <div className="modal-text-block">
                  <h4>Project Overview</h4>
                  <p>{selectedPortfolioModal.description}</p>
                </div>

                {selectedPortfolioModal.technologies_used && (
                  <div className="modal-text-block">
                    <h4>Technologies & Architecture</h4>
                    <div className="project-tech-tags">
                      {selectedPortfolioModal.technologies_used.map((t, idx) => (
                        <span key={idx} className="tech-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="project-modal-footer">
                <a
                  href="#contact"
                  className="modal-cta-btn"
                  onClick={() => setSelectedPortfolioModal(null)}
                >
                  Inquire About Similar Project →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            7. WHY CHOOSE PHOENIX SOLUTIONS
        ===================================================== */}
        <section className="home-section why-choose-section">
          <div className="home-container">
            <div className="section-header">
              <div className="section-pill">
                <span>✦</span>
                <span>ENTERPRISE STANDARDS</span>
              </div>
              <h2 className="section-title">
                Why Choose <span className="title-gradient-blue">Phoenix Solutions</span>
              </h2>
              <p className="section-subtitle">
                Built for speed, security, and exceptional craftsmanship with zero friction.
              </p>
            </div>

            <div className="why-choose-grid">
              <div className="why-card">
                <div className="why-icon">🛡️</div>
                <h3>NDA Protected & Confidential</h3>
                <p>Every brief, dataset, and deliverable is shielded by strict enterprise-grade confidentiality guarantees.</p>
              </div>

              <div className="why-card">
                <div className="why-icon">⚡</div>
                <h3>Direct Dedicated Manager</h3>
                <p>No endless ticketing queues. An assigned Senior Manager oversees your project milestones from start to launch.</p>
              </div>

              <div className="why-card">
                <div className="why-icon">💎</div>
                <h3>Transparent Pricing & UPI QR</h3>
                <p>Clear advance schedules, verified receipts, and instant UPI payments with complete ledger transparency.</p>
              </div>

              <div className="why-card">
                <div className="why-icon">🤖</div>
                <h3>Phoenix AI Intelligence</h3>
                <p>Get instant guidance, explore service architectures, and brainstorm ideas 24/7 with our integrated AI assistant.</p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            8. ABOUT US SECTION (Enterprise Advantage & Transparency)
        ===================================================== */}
        <section id="about" className="home-section about-section">
          <div className="home-container">
            <div className="about-grid">
              <div className="about-content">
                <div className="section-pill">
                  <span>✦</span>
                  <span>ABOUT PHOENIX</span>
                </div>
                <h2 className="section-title">
                  Pioneering Solutions <span className="title-gradient-gold">Without Boundaries</span>
                </h2>
                <p className="about-lead">
                  Phoenix Solutions was created on a single conviction: extraordinary digital engineering should be transparent, accessible, and limitless.
                </p>
                <p className="about-body">
                  We unite full-stack software architects, spatial 3D modelers, and viral creative engineers under one cohesive organization. Whether you are launching a global SaaS portal or constructing architectural blueprint schematics, Phoenix brings clarity and speed to execution.
                </p>

                <div className="about-pillars">
                  <div className="pillar-item">
                    <div className="pillar-icon">🛡️</div>
                    <div className="pillar-info">
                      <strong>NDA Guaranteed & Confidential</strong>
                      <span>All schematics, source code, and assets are shielded by enterprise-grade confidentiality.</span>
                    </div>
                  </div>

                  <div className="pillar-item">
                    <div className="pillar-icon">⚡</div>
                    <div className="pillar-info">
                      <strong>Rapid Scoping & Direct Manager Contact</strong>
                      <span>No robotic delays. Dedicated managers oversee milestones and verify deliverables.</span>
                    </div>
                  </div>

                  <div className="pillar-item">
                    <div className="pillar-icon">🌐</div>
                    <div className="pillar-info">
                      <strong>Direct Public Access</strong>
                      <span>Explore freely, chat with Phoenix AI, and request proposals with zero registration barriers.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Visual: Holographic Glass Feature Showcase */}
              <div className="about-visual-card">
                <div className="about-card-inner">
                  <div className="about-logo-badge">
                    <img src={phoenixLogo} alt="Phoenix Crest" className="about-crest-img" />
                  </div>
                  <h3 className="about-card-title">PHOENIX DIGITAL LABS</h3>
                  <span className="about-card-tag">Enterprise Ecosystem</span>

                  <div className="about-stat-row">
                    <div className="about-stat-box">
                      <span className="stat-big">7+</span>
                      <span className="stat-sub">Core Disciplines</span>
                    </div>
                    <div className="about-stat-box">
                      <span className="stat-big">100%</span>
                      <span className="stat-sub">Delivery Record</span>
                    </div>
                  </div>

                  <div className="about-quote-box">
                    <p>"Creating Beyond Limits is not just our motto — it is the engineering standard behind every line of code and every render we produce."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            9. PHOENIX AI ASSISTANT SHOWCASE BANNER
        ===================================================== */}
        <section className="home-section ai-feature-section">
          <div className="home-container">
            <div className="ai-banner-card">
              <div className="ai-banner-content">
                <div className="section-pill">
                  <span>✦</span>
                  <span>INTELLIGENT ADVISOR</span>
                </div>
                <h2>Meet Phoenix AI – Your 24/7 Digital Assistant</h2>
                <p>
                  Explore our technical stack, get instant pricing insights, brainstorm feature scopes, or draft project requirements in seconds with our specialized AI assistant.
                </p>
                <div className="ai-banner-actions">
                  <button className="banner-ai-btn" onClick={() => setAiModalOpen(true)}>
                    <span>✦</span> Launch Phoenix AI Assistant
                  </button>
                  <a href="#start-project" className="banner-req-btn">
                    Start Your Project Request →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            10. CONTACT US SECTION (Public Without Login)
        ===================================================== */}
        <section id="contact" className="home-section contact-section">
          <div className="home-container">
            <div className="contact-wrapper-grid">
              {/* Left Contact Information */}
              <div className="contact-info-col">
                <div className="section-pill">
                  <span>✦</span>
                  <span>GET IN TOUCH</span>
                </div>
                <h2 className="section-title">
                  Let's Build Something <span className="title-gradient-blue">Extraordinary</span>
                </h2>
                <p className="contact-lead">
                  Have a project, 3D blueprint, or digital campaign in mind? You do not need to register or log in. Submit your inquiry below and our senior management team will contact you promptly.
                </p>

                <div className="contact-cards-list">
                  <div className="contact-detail-card">
                    <div className="detail-icon">📍</div>
                    <div className="detail-meta">
                      <strong>Global Headquarters</strong>
                      <span>Phoenix Solutions Digital & 3D Engineering Labs</span>
                    </div>
                  </div>

                  <div className="contact-detail-card">
                    <div className="detail-icon">⚡</div>
                    <div className="detail-meta">
                      <strong>Immediate Scoping</strong>
                      <span>Initial project assessment within 24 business hours</span>
                    </div>
                  </div>

                  <div className="contact-detail-card">
                    <div className="detail-icon">💬</div>
                    <div className="detail-meta">
                      <strong>Interactive AI Assistant</strong>
                      <span>Use Phoenix AI for real-time guidance before submitting</span>
                    </div>
                  </div>
                </div>

                <div className="contact-ai-trigger-box">
                  <button
                    className="contact-ai-trigger-btn"
                    onClick={() => setAiModalOpen(true)}
                  >
                    <span>✦</span> Ask Phoenix AI for Recommendations
                  </button>
                </div>
              </div>

              {/* Right Form Column */}
              <div className="contact-form-col">
                <div className="contact-form-card">
                  <div className="form-card-header">
                    <h3>Submit a Project Enquiry</h3>
                    <p>Free consultation • No account or login required</p>
                  </div>

                  {enquiryStatus.text && (
                    <div className={`enquiry-alert alert-${enquiryStatus.type}`} role="alert">
                      {enquiryStatus.type === "success" ? "✓ " : "⚠ "}
                      {enquiryStatus.text}
                    </div>
                  )}

                  <form onSubmit={handleEnquirySubmit} className="enquiry-form">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label htmlFor="enq-name">
                          Your Full Name <span className="form-req-star">*</span>
                        </label>
                        <input
                          id="enq-name"
                          type="text"
                          required
                          placeholder="e.g. Elena Rostova"
                          value={enquiryForm.name}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="enq-email">
                          Email Address <span className="form-req-star">*</span>
                        </label>
                        <input
                          id="enq-email"
                          type="email"
                          required
                          placeholder="e.g. elena@company.com"
                          value={enquiryForm.email}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label htmlFor="enq-phone">Phone Number (Optional)</label>
                        <input
                          id="enq-phone"
                          type="tel"
                          placeholder="e.g. +1 (555) 019-2834"
                          value={enquiryForm.phone}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="enq-subj">Subject / Organization</label>
                        <input
                          id="enq-subj"
                          type="text"
                          placeholder="e.g. Next-Gen Web Portal"
                          value={enquiryForm.subject}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, subject: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="enq-service">Service Area of Interest</label>
                      <select
                        id="enq-service"
                        value={enquiryForm.serviceCategory}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, serviceCategory: e.target.value })}
                      >
                        <option value="">Select a service category...</option>
                        <option value="Web & Cloud Development">Web & Cloud Development</option>
                        <option value="Mobile App Development">Mobile App Development</option>
                        <option value="UI/UX & Design Systems">UI/UX & Design Systems</option>
                        <option value="3D Design & Blueprints">3D Design & Blueprints</option>
                        <option value="Advertisement Creation">Advertisement Creation</option>
                        <option value="Video Editing & Motion">Video Editing & Motion</option>
                        <option value="Viral Marketing & Memes">Viral Marketing & Memes</option>
                        <option value="Custom Enterprise Solution">Custom Enterprise Solution</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="enq-msg">
                        Project Requirements & Timeline <span className="form-req-star">*</span>
                      </label>
                      <textarea
                        id="enq-msg"
                        required
                        rows={4}
                        placeholder="Describe your vision, deliverables, budget range, or estimated launch date..."
                        value={enquiryForm.message}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={submittingEnquiry}
                    >
                      {submittingEnquiry ? (
                        <span>Sending Enquiry...</span>
                      ) : (
                        <>
                          <span>Submit Project Enquiry</span>
                          <span className="submit-arrow">→</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          13. RESPONSIVE FOOTER
      ===================================================== */}
      <footer className="home-footer">
        <div className="home-container footer-container">
          <div className="footer-brand-col">
            <div className="footer-brand">
              <div className="footer-logo-box">
                <img src={phoenixLogo} alt="Phoenix Solutions Logo" className="footer-logo-img" />
              </div>
              <div className="footer-brand-text">
                <span className="footer-name">PHOENIX <span className="brand-gold">SOLUTIONS</span></span>
                <span className="footer-tagline">Creating Beyond Limits</span>
              </div>
            </div>
            <p className="footer-desc">
              Pioneering enterprise IT, custom full-stack software, spatial 3D architectural blueprints, and viral creative media under a unified standard of excellence.
            </p>
            <div className="footer-badge">
              <span className="badge-sparkle">✦</span>
              <span>Enterprise 3D & AI Ecosystem</span>
            </div>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-heading">Services</h4>
            <ul className="footer-list">
              <li><a href="#services">Web & Cloud Development</a></li>
              <li><a href="#services">Mobile App Engineering</a></li>
              <li><a href="#services">UI/UX Design Systems</a></li>
              <li><a href="#services">3D Design & Blueprints</a></li>
              <li><a href="#services">Video & Motion Graphics</a></li>
              <li><a href="#services">Advertisement Creation</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-list">
              <li><a href="#hero">Home</a></li>
              <li><a href="#services">Our Capabilities</a></li>
              <li><a href="#projects">Project Portfolio</a></li>
              <li><a href="#about">About Phoenix</a></li>
              <li><a href="#contact">Contact & Quotes</a></li>
              <li><button onClick={() => setAiModalOpen(true)} className="footer-text-btn">Phoenix AI Assistant</button></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-heading">Authorized Portals</h4>
            <ul className="footer-list">
              <li><Link to="/login">Manager Login</Link></li>
              <li><Link to="/login">Admin Login</Link></li>
              <li><Link to="/login" className="portal-sub">Secure Supabase Auth</Link></li>
              <li><span className="portal-note">Public visitors do not need an account.</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="home-container footer-bottom-inner">
            <p>© {new Date().getFullYear()} Phoenix Solutions. All rights reserved. Creating Beyond Limits.</p>
            <div className="footer-legal-tags">
              <span>Enterprise Grade</span>
              <span>•</span>
              <span>Encrypted Storage</span>
              <span>•</span>
              <span>Protected Cloud</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================
          8. PHOENIX AI CHATBOT MODAL
      ===================================================== */}
      <PhoenixAIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </div>
  );
}

export default Home;
