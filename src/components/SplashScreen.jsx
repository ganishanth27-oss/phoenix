import { useEffect, useState } from "react";
import logo from "../assets/phoenix-logo.png";
import "./SplashScreen.css";
function SplashScreen({ onFinish }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show logo first
    const loadingTimer = setTimeout(() => {
      setLoading(true);
    }, 1500);

    // Finish splash screen
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo-box">
          <img src={logo} alt="PHOENIX" />
        </div>

        <h1>PHOENIX</h1>

        {loading ? (
          <div className="splash-loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <p>Initializing workspace...</p>
          </div>
        ) : (
          <p className="splash-tagline">
            Powering work. Managing progress.
          </p>
        )}
      </div>
    </div>
  );
}

export default SplashScreen;