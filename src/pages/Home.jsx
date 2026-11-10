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

  // Public Contact / Enquiry Form State (NO LOGIN REQUIRED)
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    serviceCategory: "",
    message: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquiryStatus, setEnquiryStatus] = useState({ text: "", type: "" });

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

    // Load portfolio projects
    const loadPortfolio = async () => {
      try {
        setLoadingPortfolio(true);
        const res = await fetch("/api/public/portfolio");
        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              if (json.data && json.data.length > 0) {
                setPortfolioProjects(json.data);
                return;
              }
            } catch (parseErr) {
              console.warn("Portfolio JSON parse notice:", parseErr);
            }
          }
        }
        // Direct Supabase query fallback
        const { data } = await supabase
          .from("project_submissions")
          .select("id, title, description, service_category, client_name, completion_date, technologies_used, thumbnail_url")
          .eq("status", "Approved")
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          setPortfolioProjects(data);
        }
      } catch (err) {
        console.error("Portfolio load error:", err);
      } finally {
        setLoadingPortfolio(false);
      }
    };

    checkSession();
    loadServices();
    loadPortfolio();
  }, []);

  // Handle Public Project Enquiry Submission (No auth required)
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryForm.name.trim() || !enquiryForm.email.trim() || !enquiryForm.message.trim()) {
      setEnquiryStatus({
        text: "Please provide your name, valid email, and project details.",
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
    setEnquiryStatus({ text: "", type: "" });

    try {
      // Correctly map form fields: sending both service_interest & serviceCategory
      const payload = {
        name: enquiryForm.name.trim(),
        email: enquiryForm.email.trim(),
        phone: enquiryForm.phone?.trim() || null,
        company: enquiryForm.subject?.trim() || null,
        service_interest: enquiryForm.serviceCategory || "General Inquiry",
        serviceCategory: enquiryForm.serviceCategory || "General Inquiry",
        message: enquiryForm.message.trim(),
      };

      let res;
      try {
        res = await fetch("/api/public/enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // Direct Supabase fallback if backend server is not running or proxy unreachable
        console.warn("Backend proxy unavailable, falling back to direct Supabase insertion:", networkErr);
        const { data: directInsert, error: directErr } = await supabase
          .from("contact_enquiries")
          .insert({
            name: payload.name,
            email: payload.email.toLowerCase(),
            phone: payload.phone,
            company: payload.company,
            service_interest: payload.service_interest,
            message: payload.message,
          })
          .select("id")
          .single();

        if (directErr) {
          throw new Error("Unable to send enquiry. Please check your network and try again.");
        }

        setEnquiryStatus({
          text: "Thank you for contacting Phoenix Solutions! A Senior Project Manager will review your requirements and respond within 24 hours.",
          type: "success",
        });
        setEnquiryForm({
          name: "",
          email: "",
          phone: "",
          subject: "",
          serviceCategory: "",
          message: "",
        });
        return;
      }

      // Safe response reading: reads response body as text first to prevent JSON parse errors
      const responseText = await res.text();
      let json = null;
      if (responseText) {
        try {
          json = JSON.parse(responseText);
        } catch (jsonErr) {
          console.warn("Non-JSON response received:", responseText);
        }
      }

      if (!res.ok) {
        const errorMsg = json?.message || json?.error || "Failed to submit enquiry. Please try again.";
        throw new Error(errorMsg);
      }

      setEnquiryStatus({
        text: json?.message || "Thank you for contacting Phoenix Solutions! A Senior Project Manager will review your requirements and respond within 24 hours.",
        type: "success",
      });
      setEnquiryForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        serviceCategory: "",
        message: "",
      });
    } catch (err) {
      console.error("Enquiry submission error:", err);
      setEnquiryStatus({
        text: err.message || "Failed to submit enquiry. Please try again.",
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
            <a href="#hero">Home</a>
            <a href="#services">Services</a>
            <a href="#projects">Projects</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
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

            {/* Separate Admin & Manager Access */}
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
              <a href="#hero" onClick={closeMobileMenu}>
                <span className="drawer-link-icon">⚡</span> Home
              </a>
              <a href="#services" onClick={closeMobileMenu}>
                <span className="drawer-link-icon">🌐</span> Services
              </a>
              <a href="#projects" onClick={closeMobileMenu}>
                <span className="drawer-link-icon">📁</span> Projects
              </a>
              <a href="#about" onClick={closeMobileMenu}>
                <span className="drawer-link-icon">🛡️</span> About Phoenix
              </a>
              <a href="#contact" onClick={closeMobileMenu}>
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
                PHOENIX <span className="title-gradient-gold">SOLUTIONS</span>
              </h1>

              {/* Subheading */}
              <h2 className="hero-subheading">
                Creating Beyond Limits
              </h2>

              {/* Description */}
              <p className="hero-description">
                Get instant answers, explore our services and connect with Phoenix Solutions through an intelligent AI-powered experience. From high-throughput cloud architectures to precision 3D blueprints and viral digital campaigns.
              </p>

              {/* Two Mandatory Buttons */}
              <div className="hero-cta-group">
                <button
                  className="hero-btn-primary"
                  onClick={() => setAiModalOpen(true)}
                >
                  <span className="btn-sparkle">✦</span>
                  <span>Start Chat Now</span>
                </button>

                <a href="#services" className="hero-btn-secondary">
                  <span>Explore Our Services</span>
                  <span className="btn-arrow">↓</span>
                </a>
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
            9. PROJECTS / PORTFOLIO SECTION
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
            ABOUT SECTION (Enterprise Advantage & Transparency)
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
            10. CONTACT SECTION (Public Without Login)
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
