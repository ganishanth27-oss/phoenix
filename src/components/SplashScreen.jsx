import { useEffect, useState } from "react";
import logo from "../assets/phoenix-logo.png";
import "./SplashScreen.css";

function SplashScreen({ onFinish }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show logo first
    const loadingTimer = setTimeout(() => {
      setLoading(true);
    }, 1300);

    // Finish splash screen
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2800);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <div className="splash-ambient-glow" />
      <div className="splash-ring splash-ring-outer" />
      <div className="splash-ring splash-ring-inner" />

      <div className="splash-content">
        <div className="splash-logo-box">
          <div className="splash-logo-halo" />
          <img src={logo} alt="Phoenix Solutions Official Logo" />
        </div>

        <h1 className="splash-title">
          PHOENIX <span className="splash-gold-word">SOLUTIONS</span>
        </h1>

        <p className="splash-tagline">
          Creating Beyond Limits
        </p>

        {loading ? (
          <div className="splash-loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="splash-status">Initializing Intelligent 3D Platform...</p>
          </div>
        ) : (
          <div className="splash-badge">
            <span className="splash-sparkle">✦</span>
            <span>Enterprise Digital Ecosystem</span>
            <span className="splash-sparkle">✦</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SplashScreen;