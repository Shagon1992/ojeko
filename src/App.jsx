import React, { useState, useEffect, Suspense, lazy } from "react";

// 🚀 GLOBAL OPTIMIZATION: Lazy Load semua halaman
const Login = lazy(() => import("./components/Login"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const Couriers = lazy(() => import("./components/Couriers"));
const Customers = lazy(() => import("./components/Customers"));
const Deliveries = lazy(() => import("./components/Deliveries"));
const DBCourier = lazy(() => import("./components/DBCourier"));
const Laporan = lazy(() => import("./components/Laporan"));
const Settings = lazy(() => import("./components/Settings/Settings"));

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem("lastPage") || "dashboard";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  // Simpan halaman aktif
  useEffect(() => {
    localStorage.setItem("lastPage", currentPage);
  }, [currentPage]);

  // 🚀 Preload halaman populer
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        import("./components/Deliveries");
        import("./components/Customers");
        import("./components/Laporan");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Simple PWA Install Prompt
  useEffect(() => {
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      const installButton = document.createElement('button');
      installButton.innerHTML = '📱 INSTALL APLIKASI';
      installButton.style.cssText = `
        position: fixed; bottom: 80px; right: 20px; background: #8b5cf6; color: white;
        border: none; padding: 12px 16px; border-radius: 8px; font-size: 14px;
        font-weight: 600; cursor: pointer; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      installButton.onclick = async () => {
        e.prompt();
        installButton.remove();
      };
      document.body.appendChild(installButton);
      setTimeout(() => {
        if (document.body.contains(installButton)) installButton.remove();
      }, 10000);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Login />
      </Suspense>
    );
  }

  const renderContent = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ flex: 1, paddingBottom: "70px" }}>
          <Suspense fallback={<LoadingScreen />}>
            {(() => {
              switch (currentPage) {
                case "couriers": return <Couriers />;
                case "customers": return <Customers />;
                case "deliveries": return <Deliveries />;
                case "dbcourier": return <DBCourier />;
                case "laporan": return <Laporan />;
                case "settings": return <Settings />;
                case "dashboard":
                default:
                  return isAdmin ? (
                    <Dashboard setCurrentPage={setCurrentPage} />
                  ) : (
                    <DBCourier setCurrentPage={setCurrentPage} />
                  );
              }
            })()}
          </Suspense>
        </div>

        <footer style={{ background: "white", borderTop: "1px solid #e2e8f0", padding: "16px 20px", marginTop: "auto" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
            <p style={{ margin: 0 }}>Ojek-O | Management System v1.0</p>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
              apt. Hermawan Susilo Sandi, S.Farm | © 2024 All rights reserved
            </p>
          </div>
        </footer>
      </div>
    );
  };

  // Navigation
  const Navigation = () => (
    <nav style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src="/icons/icon-192x192.png" 
            alt="Logo Ojek-O" 
            style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} 
          />
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>Ojek-O</span>
        </div>

        {/* Desktop Navigation */}
        <div className="desktop-nav" style={{ display: "none", gap: "8px", alignItems: "center" }}>
          <NavButton page="dashboard" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="📊" label="Dashboard" isAdmin={isAdmin} />
          <NavButton page="customers" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="👥" label="Pelanggan" isAdmin={isAdmin} />
          <NavButton page="couriers" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="🚗" label="Kurir" isAdminOnly={true} isAdmin={isAdmin} />
          <NavButton page="deliveries" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="📦" label="Deliveries" isAdmin={isAdmin} />
          <NavButton page="laporan" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="📊" label="Laporan" isAdmin={isAdmin} />
          <NavButton page="settings" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="⚙️" label="Pengaturan" isAdmin={isAdmin} />
          <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 8px" }}></div>
          <button onClick={() => { localStorage.removeItem("user"); localStorage.removeItem("lastPage"); window.location.href = "/"; }} style={{ padding: "8px 16px", background: "white", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
            Keluar
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-button" style={{ display: "flex", flexDirection: "column", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "8px" }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span style={{ width: "20px", height: "2px", background: "#64748b", transition: "all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(6px, 6px)" : "none" }}></span>
          <span style={{ width: "20px", height: "2px", background: "#64748b", transition: "all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }}></span>
          <span style={{ width: "20px", height: "2px", background: "#64748b", transition: "all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(6px, -6px)" : "none" }}></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" style={{ position: "fixed", top: "73px", left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(2px)", zIndex: 99 }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{ background: "white", margin: "20px", borderRadius: "16px", padding: "24px 20px", animation: "slideDown 0.2s ease-out", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <MobileNavButton page="dashboard" currentPage={currentPage} setCurrentPage={setCurrentPage} setMobileMenuOpen={setMobileMenuOpen} icon="📊" label="Dashboard" isAdmin={isAdmin} />
              <MobileNavButton page="customers" currentPage={currentPage} setCurrentPage={setCurrentPage} setMobileMenuOpen={setMobileMenuOpen} icon="👥" label="Pelanggan" isAdmin={isAdmin} />
              <MobileNavButton page="couriers" currentPage={currentPage} setCurrentPage={setCurrentPage} setMobileMenuOpen={setMobileMenuOpen} icon="🚗" label="Kurir" isAdminOnly={true} isAdmin={isAdmin} />
              <MobileNavButton page="deliveries" currentPage={currentPage} setCurrentPage={setCurrentPage} setMobileMenuOpen={setMobileMenuOpen} icon="📦" label="Deliveries" isAdmin={isAdmin} />
              <MobileNavButton page="laporan" currentPage={currentPage} setCurrentPage={setCurrentPage} setMobileMenuOpen={setMobileMenuOpen} icon="📊" label="Laporan" isAdmin={isAdmin} />
              <MobileNavButton page="settings" currentPage={currentPage} setCurrentPage={setCurrentPage} setMobileMenuOpen={setMobileMenuOpen} icon="⚙️" label="Pengaturan" isAdmin={isAdmin} />
              
              <div style={{ height: "1px", background: "#e2e8f0", margin: "12px 0" }}></div>
              
              <button onClick={() => { localStorage.removeItem("user"); localStorage.removeItem("lastPage"); window.location.href = "/"; }} style={{ padding: "16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "12px", fontSize: "16px", fontWeight: "500", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
                <span>🚪</span> Keluar Aplikasi
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <div className="App">
      <Navigation />
      <div style={{ filter: mobileMenuOpen ? "blur(5px)" : "none", transition: "filter 0.3s ease", minHeight: "100vh", pointerEvents: mobileMenuOpen ? "none" : "auto" }}>
        {renderContent()}
      </div>

      {/* 🚀 BOTTOM NAVIGATION BAR (KHUSUS HP) */}
      <div className="mobile-bottom-nav">
        <BottomNavButton page="dashboard" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="📊" label="Home" />
        <BottomNavButton page="customers" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="👥" label="Pelanggan" />
        <BottomNavButton page="deliveries" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="📦" label="Order" />
        <BottomNavButton page="laporan" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="📈" label="Laporan" />
        <BottomNavButton page="settings" currentPage={currentPage} setCurrentPage={setCurrentPage} icon="⚙️" label="Setelan" />
      </div>

      {/* CSS Animations dan Media Queries */}
      <style>
        {`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .desktop-nav { display: none; }
          .mobile-menu-button { display: flex; }
          .mobile-menu-overlay { display: block; }
          .mobile-bottom-nav { display: none; }

          @media (min-width: 768px) {
            .desktop-nav { display: flex !important; }
            .mobile-menu-button { display: none !important; }
            .mobile-menu-overlay { display: none !important; }
            .mobile-bottom-nav { display: none !important; }
          }
          
          @media (max-width: 767px) {
            .desktop-only { display: none !important; }
            .mobile-bottom-nav {
              display: flex;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: white;
              border-top: 1px solid #e2e8f0;
              justify-content: space-around;
              padding: 8px 0;
              z-index: 1000;
              box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            }
          }
        `}
      </style>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const LoadingScreen = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
    <div style={{ textAlign: "center", color: "#64748b" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
      Memuat halaman...
    </div>
  </div>
);

const NavButton = ({ page, currentPage, setCurrentPage, icon, label, isAdminOnly = false, isAdmin = false }) => {
  if (isAdminOnly && !isAdmin) return null;
  const isActive = currentPage === page;
  return (
    <button onClick={() => setCurrentPage(page)} style={{ padding: "8px 16px", background: isActive ? "#667eea" : "transparent", color: isActive ? "white" : "#64748b", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "8px" }}>
      <span>{icon}</span>
      <span className="desktop-only">{label}</span>
    </button>
  );
};

const MobileNavButton = ({ page, currentPage, setCurrentPage, setMobileMenuOpen, icon, label, isAdminOnly = false, isAdmin = false }) => {
  if (isAdminOnly && !isAdmin) return null;
  const isActive = currentPage === page;
  return (
    <button onClick={() => { setCurrentPage(page); setMobileMenuOpen(false); }} style={{ padding: "16px", background: isActive ? "#f1f5f9" : "transparent", color: isActive ? "#667eea" : "#64748b", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: isActive ? "600" : "500", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s" }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>
      {label}
    </button>
  );
};

const BottomNavButton = ({ page, currentPage, setCurrentPage, icon, label }) => {
  const isActive = currentPage === page;
  return (
    <button onClick={() => setCurrentPage(page)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px", cursor: "pointer", color: isActive ? "#667eea" : "#94a3b8", transition: "color 0.2s" }}>
      <span style={{ fontSize: "20px", filter: isActive ? "none" : "grayscale(100%)", opacity: isActive ? 1 : 0.7 }}>{icon}</span>
      <span style={{ fontSize: "10px", fontWeight: isActive ? "700" : "500" }}>{label}</span>
    </button>
  );
};

export default App;