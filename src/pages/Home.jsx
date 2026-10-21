import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import phoenixLogo from "../assets/phoenix-logo.png";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);

  // Public portfolio state
  const [portfolioProjects, setPortfolioProjects] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [selectedPortfolioModal, setSelectedPortfolioModal] = useState(null);

  // Public Enquiry state
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    serviceCategory: "",
    message: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquiryStatus, setEnquiryStatus] = useState({ text: "", type: "" });

  // Core service portfolio mapping to highlight verified services from requirements
  const coreHighlights = [
    {
      title: "Web Development",
      icon: "🌐",
      category: "Engineering",
      desc: "Modern responsive web applications, portals, and cloud backends built for high performance and reliability.",
    },
    {
      title: "App Development",
      icon: "📱",
      category: "Engineering",
      desc: "Cross-platform iOS and Android mobile software designed with modern UX and real-time syncing.",
    },
    {
      title: "Advertisement Creation",
      icon: "📢",
      category: "Creative & Media",
      desc: "High-impact visual campaigns, social media ad units, and brand positioning collateral.",
    },
    {
      title: "Video Editing",
      icon: "🎬",
      category: "Creative & Media",
      desc: "Professional post-production, motion graphics, promotional cuts, and storytelling for digital channels.",
    },
    {
      title: "Meme Creation",
      icon: "⚡",
      category: "Viral Marketing",
      desc: "Culturally resonant viral creative content engineered for rapid engagement and community building.",
    },
    {
      title: "UI/UX Design",
      icon: "🎨",
      category: "Design System",
      desc: "Intuitive product architecture, wireframes, high-fidelity prototypes, and design systems.",
    },
    {
      title: "3D Design & Blueprints",
      icon: "📐",
      category: "Architecture & CAD",
      desc: "Precision 3D modeling, construction blueprints, architectural drafting, and spatial visualization.",
    },
  ];

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role, name")
            .eq("id", user.id)
            .single();
          if (profile) {
            setSessionUser(profile);
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    };

    // Load actual active services from Supabase
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
        console.error("Failed to load services from DB:", e);
      } finally {
        setLoadingServices(false);
      }
    };

    // Load published public portfolio projects
    const loadPortfolio = async () => {
      try {
        setLoadingPortfolio(true);
        const res = await fetch("/api/public/portfolio");
        if (res.ok) {
          const json = await res.json();
          setPortfolioProjects(json.data || []);
        } else {
          // Fallback directly to supabase if server is restarting
          const { data } = await supabase
            .from("project_submissions")
            .select("id, title, description, service_category, client_name, completion_date, technologies_used, thumbnail_url")
            .eq("status", "Approved")
            .eq("is_published", true)
            .order("created_at", { ascending: false });
          setPortfolioProjects(data || []);
        }
      } catch (err) {
        console.error("Failed to load portfolio:", err);
      } finally {
        setLoadingPortfolio(false);
      }
    };

    checkAuth();
    loadServices();
    loadPortfolio();
  }, []);

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.email || !enquiryForm.message) {
      setEnquiryStatus({ text: "Please enter your name, email, and message.", type: "error" });
      return;
    }

    setSubmittingEnquiry(true);
    setEnquiryStatus({ text: "", type: "" });

    try {
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiryForm),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit enquiry.");
      }

      setEnquiryStatus({
        text: "Thank you for reaching out! A Phoenix senior manager will review your enquiry promptly.",
        type: "success",
      });
      setEnquiryForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        serviceCategory: "",
        message: "",
      });
    } catch (err) {
      setEnquiryStatus({ text: err.message, type: "error" });
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const getDashboardPath = () => {
    if (!sessionUser) return "/login";
    if (sessionUser.role === "admin") return "/admin";
    if (sessionUser.role === "manager") return "/manager";
    return "/user";
  };

  return (
    <div className="phoenix-homepage">
      {/* =====================================================
          TOP NAVIGATION BAR
      ===================================================== */}
      <header className="home-navbar">
        <div className="home-nav-container">
          <Link to="/" className="home-brand">
            <div className="home-logo-box">
              <img src={phoenixLogo} alt="Phoenix Logo" className="home-logo-img" />
            </div>
            <div className="home-brand-text">
              <strong>PHOENIX</strong>
              <span>SOLUTIONS</span>
            </div>
          </Link>

          <nav className="home-nav-links">
            <a href="#services">Services</a>
            <a href="#portfolio">Portfolio</a>
            <a href="#process">Our Process</a>
            <a href="#capabilities">Why Phoenix</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="home-nav-actions">
            {sessionUser ? (
              <button
                onClick={() => navigate(getDashboardPath())}
                className="nav-btn-primary"
              >
                Go to Workspace ({sessionUser.role})
              </button>
            ) : (
              <>
                <Link to="/login" className="nav-btn-ghost">
                  Sign In
                </Link>
                <Link to="/register" className="nav-btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO SECTION
      ===================================================== */}
      <section className="home-hero">
        <div className="home-hero-container">
          <div className="hero-announcement">
            <span className="announcement-badge">Phoenix Portal</span>
            <span>Enterprise IT & Creative Management Platform</span>
          </div>

          <h1 className="hero-title">
            Enterprise IT, Creative &
            <br />
            <span className="hero-gradient-text">Design Solutions Unified.</span>
          </h1>

          <p className="hero-subtitle">
            Phoenix connects clients, managers, and specialized teams into a seamless digital delivery portal. From full-stack software and viral creative campaigns to architectural drafting and blueprints.
          </p>

          <div className="hero-cta-group">
            <a href="#services" className="hero-btn-primary">
              Explore Services <span>↓</span>
            </a>
            <Link to={sessionUser ? getDashboardPath() : "/register"} className="hero-btn-secondary">
              {sessionUser ? "Go to My Dashboard" : "Get Started Now"} <span>→</span>
            </Link>
          </div>

          {/* Key Value Pillars */}
          <div className="hero-stats-bar">
            <div className="hero-stat-item">
              <strong>Unified Delivery</strong>
              <span>Single workspace for all requests & progress</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat-item">
              <strong>End-to-End Governance</strong>
              <span>Role-managed tracking with instant milestones</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat-item">
              <strong>Verified Security</strong>
              <span>Protected Supabase cloud architecture</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SERVICES SECTION (Real database data + Core Capabilities)
      ===================================================== */}
      <section id="services" className="home-section services-section">
        <div className="home-container">
          <div className="section-header">
            <span className="section-eyebrow">OUR SPECIALIZATIONS</span>
            <h2>Comprehensive IT & Creative Services</h2>
            <p>
              Delivered by dedicated specialists and managed directly through your Phoenix client dashboard.
            </p>
          </div>

          {/* Database Services or Core Highlights */}
          <div className="services-grid">
            {(services.length > 0 ? services : coreHighlights).map((item, idx) => (
              <div key={item.id || idx} className="service-card">
                <div className="service-card-top">
                  <div className="service-icon-wrap">
                    <span>{coreHighlights[idx % coreHighlights.length]?.icon || "⚡"}</span>
                  </div>
                  <span className="service-category">
                    {coreHighlights[idx % coreHighlights.length]?.category || "Active Service"}
                  </span>
                </div>
                <h3>{item.name || item.title}</h3>
                <p>
                  {item.description || item.desc || "Professional service delivered through the Phoenix client workspace."}
                </p>
                <div className="service-card-footer">
                  <Link
                    to={sessionUser ? "/user" : "/register"}
                    className="service-action-link"
                  >
                    Request this service <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          PUBLIC PROJECT PORTFOLIO SECTION
      ===================================================== */}
      <section id="portfolio" className="home-section portfolio-section">
        <div className="home-container">
          <div className="section-header">
            <span className="section-eyebrow">FEATURED DELIVERABLES</span>
            <h2>Client Project Portfolio</h2>
            <p>
              Explore sample work delivered by Phoenix specialists and verified by our quality assurance team.
              Confidential internal materials remain private and protected.
            </p>
          </div>

          {loadingPortfolio ? (
            <div className="portfolio-loading">
              <div className="portfolio-spinner" />
              <p>Loading curated portfolio...</p>
            </div>
          ) : portfolioProjects.length === 0 ? (
            <div className="portfolio-fallback-grid">
              {/* Default showcasing items if no DB projects are published yet */}
              <div className="portfolio-card">
                <div className="portfolio-card-badge">Web Development</div>
                <h3>Enterprise Financial Dashboard</h3>
                <p>High-throughput SaaS accounting analytics portal with real-time charting and multi-tenant security.</p>
                <div className="portfolio-tech-list">
                  <span>React</span>
                  <span>Node.js</span>
                  <span>PostgreSQL</span>
                </div>
              </div>

              <div className="portfolio-card">
                <div className="portfolio-card-badge">3D Design & Blueprints</div>
                <h3>Commercial Complex 3D Blueprint</h3>
                <p>Architectural spatial rendering and MEP schematics for an 80,000 sq ft smart retail facility.</p>
                <div className="portfolio-tech-list">
                  <span>Revit</span>
                  <span>AutoCAD</span>
                  <span>Blender</span>
                </div>
              </div>

              <div className="portfolio-card">
                <div className="portfolio-card-badge">UI/UX & Mobile</div>
                <h3>Next-Gen Telehealth Mobile App</h3>
                <p>Patient-practitioner video consultation mobile app with intuitive calendar scheduling and encrypted records.</p>
                <div className="portfolio-tech-list">
                  <span>Figma</span>
                  <span>React Native</span>
                  <span>WebRTC</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="portfolio-grid">
              {portfolioProjects.map((p) => (
                <div
                  key={p.id}
                  className="portfolio-card interactive"
                  onClick={() => setSelectedPortfolioModal(p)}
                >
                  {p.thumbnail_url && (
                    <div className="portfolio-thumb-wrap">
                      <img src={p.thumbnail_url} alt={p.title} className="portfolio-thumb-img" />
                    </div>
                  )}
                  <div className="portfolio-card-badge">{p.service_category || "Deliverable"}</div>
                  <h3>{p.title}</h3>
                  <p className="portfolio-desc">
                    {p.description?.length > 130 ? `${p.description.substring(0, 130)}...` : p.description}
                  </p>
                  {p.technologies_used && p.technologies_used.length > 0 && (
                    <div className="portfolio-tech-list">
                      {p.technologies_used.slice(0, 4).map((tech, i) => (
                        <span key={i}>{tech}</span>
                      ))}
                    </div>
                  )}
                  <div className="portfolio-card-foot">
                    <span className="client-tag">Client: {p.client_name || "Enterprise"}</span>
                    <button className="btn-view-details">View Details →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Portfolio Item Detail Modal */}
      {selectedPortfolioModal && (
        <div className="portfolio-modal-overlay" onClick={() => setSelectedPortfolioModal(null)}>
          <div className="portfolio-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-category">{selectedPortfolioModal.service_category}</span>
                <h2>{selectedPortfolioModal.title}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedPortfolioModal(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {selectedPortfolioModal.thumbnail_url && (
                <div className="modal-hero-img-wrap">
                  <img src={selectedPortfolioModal.thumbnail_url} alt={selectedPortfolioModal.title} />
                </div>
              )}
              <div className="modal-meta-row">
                <div>
                  <strong>Client</strong>
                  <span>{selectedPortfolioModal.client_name || "Confidential Enterprise Client"}</span>
                </div>
                {selectedPortfolioModal.completion_date && (
                  <div>
                    <strong>Completed</strong>
                    <span>{selectedPortfolioModal.completion_date}</span>
                  </div>
                )}
              </div>

              <h4>Overview</h4>
              <p className="modal-full-desc">{selectedPortfolioModal.description}</p>

              {selectedPortfolioModal.technologies_used && (
                <div className="modal-tech-section">
                  <h4>Technologies & Tools</h4>
                  <div className="portfolio-tech-list">
                    {selectedPortfolioModal.technologies_used.map((t, i) => (
                      <span key={i}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <a href="#contact" className="modal-enquire-btn" onClick={() => setSelectedPortfolioModal(null)}>
                Inquire About Similar Project →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PROCESS SECTION (How Phoenix Works)
      ===================================================== */}
      <section id="process" className="home-section process-section">
        <div className="home-container">
          <div className="section-header">
            <span className="section-eyebrow">HOW WE WORK</span>
            <h2>Transparent Delivery in 4 Steps</h2>
            <p>
              From initial request to final handover, every milestone is visible in your client portal.
            </p>
          </div>

          <div className="process-grid">
            <div className="process-card">
              <div className="process-step-pill">Step 01</div>
              <h3>Submit Your Request</h3>
              <p>
                Describe your project, choose the relevant service, set priorities, and attach requirements directly through the portal.
              </p>
            </div>

            <div className="process-card">
              <div className="process-step-pill">Step 02</div>
              <h3>Manager Review & Scoping</h3>
              <p>
                Your dedicated manager reviews the scope, allocates specialists, builds project milestones, and sets delivery dates.
              </p>
            </div>

            <div className="process-card">
              <div className="process-step-pill">Step 03</div>
              <h3>Production & Milestones</h3>
              <p>
                Track live progress, review intermediate drafts and files, and collaborate transparently via centralized logs.
              </p>
            </div>

            <div className="process-card">
              <div className="process-step-pill">Step 04</div>
              <h3>Verification & Handover</h3>
              <p>
                Final deliverables undergo quality checks before final approval, file download, and project completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          WHY CHOOSE PHOENIX
      ===================================================== */}
      <section id="capabilities" className="home-section why-section">
        <div className="home-container">
          <div className="why-grid">
            <div className="why-content">
              <span className="section-eyebrow">THE PHOENIX ADVANTAGE</span>
              <h2>A True Enterprise Portal Built for Transparency</h2>
              <p>
                Unlike fragmented communication through emails and chat threads, Phoenix centralizes all assets, deliverables, timelines, and communications under one secure roof.
              </p>

              <div className="why-features-list">
                <div className="why-feature-row">
                  <div className="feature-check">✓</div>
                  <div>
                    <strong>Full Visibility for Customers</strong>
                    <p>Track request status from Submitted, In Progress, to Complete in real-time.</p>
                  </div>
                </div>

                <div className="why-feature-row">
                  <div className="feature-check">✓</div>
                  <div>
                    <strong>Empowered Managers</strong>
                    <p>Equipped with project scoping, resource allocation, and progress metrics.</p>
                  </div>
                </div>

                <div className="why-feature-row">
                  <div className="feature-check">✓</div>
                  <div>
                    <strong>Enterprise Security & Storage</strong>
                    <p>Cloud-backed file storage with role-based Row Level Security (RLS).</p>
                  </div>
                </div>
              </div>

              <div className="why-cta">
                <Link to={sessionUser ? getDashboardPath() : "/register"} className="home-btn-primary">
                  {sessionUser ? "Launch Your Workspace" : "Open Your Free Account"}
                </Link>
              </div>
            </div>

            <div className="why-visual">
              <div className="why-card-mockup">
                <div className="mockup-header">
                  <div className="mockup-dot red" />
                  <div className="mockup-dot yellow" />
                  <div className="mockup-dot green" />
                  <span className="mockup-title">Phoenix Workspace Overview</span>
                </div>
                <div className="mockup-body">
                  <div className="mockup-stat-row">
                    <div className="mini-stat">
                      <span>Service Requests</span>
                      <strong>Active</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Quality Review</span>
                      <strong>100% Verified</strong>
                    </div>
                  </div>
                  <div className="mockup-item">
                    <span className="mockup-item-icon">🌐</span>
                    <div className="mockup-item-info">
                      <div className="mockup-bar long" />
                      <div className="mockup-bar short" />
                    </div>
                    <span className="mockup-tag">In Progress</span>
                  </div>
                  <div className="mockup-item">
                    <span className="mockup-item-icon">📐</span>
                    <div className="mockup-item-info">
                      <div className="mockup-bar long" />
                      <div className="mockup-bar short" />
                    </div>
                    <span className="mockup-tag complete">Completed</span>
                  </div>
                  <div className="mockup-item">
                    <span className="mockup-item-icon">🎨</span>
                    <div className="mockup-item-info">
                      <div className="mockup-bar long" />
                      <div className="mockup-bar short" />
                    </div>
                    <span className="mockup-tag review">In Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTACT / INQUIRY SECTION (Public Without Login)
      ===================================================== */}
      <section id="contact" className="home-section contact-section">
        <div className="home-container">
          <div className="contact-box-grid">
            <div className="contact-info-col">
              <span className="section-eyebrow light">GET IN TOUCH</span>
              <h2>Start a Project With Phoenix</h2>
              <p>
                Have a project or deliverable in mind? You don't need an account to reach out. Fill in your details below and a senior manager will review your inquiry immediately.
              </p>

              <div className="contact-features-list">
                <div className="contact-pill-item">
                  <span className="pill-icon">📍</span>
                  <div>
                    <strong>Phoenix Global Headquarters</strong>
                    <span>Enterprise IT & Creative Production Labs</span>
                  </div>
                </div>

                <div className="contact-pill-item">
                  <span className="pill-icon">⚡</span>
                  <div>
                    <strong>Rapid Scoping & Consultation</strong>
                    <span>Initial project assessment within 24 hours</span>
                  </div>
                </div>

                <div className="contact-pill-item">
                  <span className="pill-icon">🛡️</span>
                  <div>
                    <strong>Confidential NDA Assurance</strong>
                    <span>All customer designs and schematics remain strictly protected</span>
                  </div>
                </div>
              </div>

              <div className="existing-account-hint">
                <span>Already have a client account?</span>
                <Link to="/login" className="link-signin">
                  Sign In to Client Portal →
                </Link>
              </div>
            </div>

            <div className="contact-form-col">
              <form onSubmit={handleEnquirySubmit} className="public-enquiry-card">
                <h3>Submit a Project Inquiry</h3>
                <p>No login or registration required.</p>

                {enquiryStatus.text && (
                  <div className={`enquiry-alert ${enquiryStatus.type}`}>
                    {enquiryStatus.text}
                  </div>
                )}

                <div className="form-row-two">
                  <div className="form-field">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={enquiryForm.name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Your Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sarah@company.com"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-two">
                  <div className="form-field">
                    <label>Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Company / Organization</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={enquiryForm.company}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, company: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Service Area of Interest</label>
                  <select
                    value={enquiryForm.serviceCategory}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, serviceCategory: e.target.value })}
                  >
                    <option value="">Select a service category...</option>
                    <option value="Web Development">Web Development</option>
                    <option value="App Development">App Development</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="3D Design & Blueprints">3D Design & Blueprints</option>
                    <option value="Advertisement Creation">Advertisement Creation</option>
                    <option value="Video Editing">Video Editing</option>
                    <option value="Meme Creation">Viral Marketing & Memes</option>
                    <option value="Other">Other Custom Service</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Project Details / Message *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us about your requirements, project goals, estimated timelines, or budget..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-submit-enquiry"
                  disabled={submittingEnquiry}
                >
                  {submittingEnquiry ? "Sending Inquiry..." : "Send Project Inquiry →"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="home-footer">
        <div className="home-container footer-container">
          <div className="footer-brand-col">
            <div className="footer-brand">
              <img src={phoenixLogo} alt="Phoenix" className="footer-logo-img" />
              <span>PHOENIX</span>
            </div>
            <p>
              Comprehensive IT, creative engineering, design systems, and blueprint solutions for businesses.
            </p>
          </div>

          <div className="footer-col">
            <h4>Services</h4>
            <ul>
              <li>Web & Cloud Development</li>
              <li>Mobile App Engineering</li>
              <li>UI/UX Design Systems</li>
              <li>3D Design & Blueprints</li>
              <li>Video & Creative Media</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Portals</h4>
            <ul>
              <li><Link to="/login">Client Portal</Link></li>
              <li><Link to="/login">Manager Workspace</Link></li>
              <li><Link to="/login">Admin Center</Link></li>
              <li><Link to="/register">Register Account</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li>Enterprise Governance</li>
              <li>Row-Level Security</li>
              <li>Activity Audits</li>
              <li>Asset Storage</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="home-container footer-bottom-inner">
            <p>© {new Date().getFullYear()} Phoenix Company Portal. All rights reserved.</p>
            <div className="footer-meta-links">
              <span>Enterprise Grade</span>
              <span>•</span>
              <span>Cloud Protected</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
