import { useEffect, useRef } from "react";
import phoenixLogo from "../assets/phoenix-logo.png";
import "./Phoenix3DHero.css";

function Phoenix3DHero({ onOpenAI }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Subtle 3D perspective mouse tilt on desktop
    const handleMouseMove = (e) => {
      if (window.innerWidth < 1024) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotX = (y / (rect.height / 2)) * -10;
      const rotY = (x / (rect.width / 2)) * 14;

      container.style.setProperty("--tilt-x", `${rotX.toFixed(2)}deg`);
      container.style.setProperty("--tilt-y", `${rotY.toFixed(2)}deg`);
    };

    const handleMouseLeave = () => {
      container.style.setProperty("--tilt-x", "0deg");
      container.style.setProperty("--tilt-y", "0deg");
    };

    const parentSection = container.closest(".home-hero");
    if (parentSection) {
      parentSection.addEventListener("mousemove", handleMouseMove);
      parentSection.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (parentSection) {
        parentSection.removeEventListener("mousemove", handleMouseMove);
        parentSection.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div className="phoenix-3d-wrapper" ref={containerRef}>
      {/* Background Volumetric Light Cone & Rings */}
      <div className="p3d-light-cone" />
      <div className="p3d-ring p3d-ring-outer" />
      <div className="p3d-ring p3d-ring-mid" />
      <div className="p3d-ring p3d-ring-core" />

      {/* Orbiting Tech Particles */}
      <div className="p3d-particle p3d-p1" />
      <div className="p3d-particle p3d-p2" />
      <div className="p3d-particle p3d-p3" />
      <div className="p3d-particle p3d-p4" />
      <div className="p3d-particle p3d-p5" />

      {/* 3D Transform Emblem Card */}
      <div className="p3d-card" onClick={onOpenAI} title="Click to interact with Phoenix AI">
        {/* Shimmer Border */}
        <div className="p3d-glass-border" />

        {/* Central Official Crystal Phoenix Logo */}
        <div className="p3d-logo-halo">
          <img
            src={phoenixLogo}
            alt="Phoenix Solutions Emblem"
            className="p3d-logo-img"
          />
        </div>

        {/* Floating Holographic Badge */}
        <div className="p3d-floating-tag">
          <span className="p3d-tag-dot" />
          <span className="p3d-tag-title">Phoenix AI Engine Active</span>
          <span className="p3d-tag-sparkle">✦</span>
        </div>

        {/* Secondary Glass Indicator */}
        <div className="p3d-sub-card">
          <div className="p3d-sub-stat">
            <span className="stat-num">99.9%</span>
            <span className="stat-lbl">Uptime SLA</span>
          </div>
          <div className="p3d-sub-divider" />
          <div className="p3d-sub-stat">
            <span className="stat-num">Enterprise</span>
            <span className="stat-lbl">Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Phoenix3DHero;

