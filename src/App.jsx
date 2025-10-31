import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Couriers from "./components/Couriers";
import Customers from "./components/Customers";
import Deliveries from "./components/Deliveries";
import DBCourier from "./components/DBCourier";
import Laporan from "./components/Laporan";
import ImportCustomers from "./components/ImportCustomers";
import Settings from "./components/Settings/Settings";
import "./App.css";

// 🔥 IMPORT SUPABASE SAJA - HAPUS ONESIGNAL
import { supabase } from "./lib/supabase";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  // 🎯 PERBAIKAN: Definisikan isAdmin di sini
  const isAdmin = user?.role === "admin";

  // 🔥 SERVICE WORKER REGISTRATION FOR PWA
  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('✅ Service Worker registered:', registration);
          
          // Check if app is installed as PWA
          if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('📱 App running as PWA');
          }
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      }
    };

    // Show install prompt for PWA
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      
      // Create install button
      const installButton = document.createElement('button');
      installButton.innerHTML = '📱 INSTALL APLIKASI';
      installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #8b5cf6;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      
      installButton.onclick = async () => {
        e.prompt();
        installButton.remove();
      };
      
      document.body.appendChild(installButton);
      
      // Auto remove after 10 seconds
      setTimeout(() => {
        if (document.body.contains(installButton)) {
          installButton.remove();
        }
      }, 10000);
    };

    // Register service worker
    registerServiceWorker();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  // 🔥 ENHANCED NOTIFICATION SETUP
  // 🔥 ENHANCED NOTIFICATION SETUP
  useEffect(() => {
    const setupEnhancedNotifications = async () => {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser?.courier_id) return;
  
      console.log('👤 Setting up enhanced notifications for courier:', currentUser.courier_id);
  
      // 1. Service Worker Registration
      if ('serviceWorker' in navigator) {
        try {
          // Unregister existing service workers first
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
            console.log('🗑️ Unregistered old service worker');
          }
  
          // Register new service worker
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('✅ Service Worker registered:', registration);
  
          // Wait for service worker to be ready
          await navigator.serviceWorker.ready;
          console.log('✅ Service Worker ready');
  
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      }
  
      // 2. Notification Permission
      if (!("Notification" in window)) {
        console.log("❌ Browser tidak support notifications");
        return;
      }
  
      // 3. Permission Handling dengan Enhanced UX
      if (Notification.permission === "granted") {
        console.log('✅ Notifications already enabled');
        await registerCourierDevice(currentUser.courier_id);
        showNotificationWelcome(currentUser.courier_id);
      } else if (Notification.permission === "default") {
        // Tampilkan enhanced permission button
        setTimeout(() => {
          showEnhancedPermissionButton(currentUser.courier_id);
        }, 2000);
      }
    };
  
    const showEnhancedPermissionButton = (courierId) => {
      if (document.getElementById('notification-permission-btn')) return;
  
      const button = document.createElement('button');
      button.id = 'notification-permission-btn';
      button.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>🔔</span>
          <span>AKTIFKAN NOTIFIKASI ORDERAN</span>
        </div>
        <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
          Dapatkan pemberitahuan orderan baru secara real-time
        </div>
      `;
      button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        padding: 16px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        max-width: 280px;
        text-align: left;
        transition: all 0.3s ease;
      `;
  
      button.onclick = async () => {
        button.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="spinner" style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>MEMPROSES...</span>
          </div>
        `;
        button.style.background = '#6b7280';
        button.style.cursor = 'not-allowed';
        
        try {
          const permission = await Notification.requestPermission();
          
          if (permission === "granted") {
            console.log('✅ Notification permission granted');
            await registerCourierDevice(courierId);
            
            button.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>✅</span>
                <span>NOTIFIKASI AKTIF!</span>
              </div>
              <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                Anda akan dapat pemberitahuan orderan
              </div>
            `;
            button.style.background = '#059669';
            
            // Show welcome notification
            showNotificationWelcome(courierId);
            
            setTimeout(() => button.remove(), 3000);
          } else {
            button.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>🔔</span>
                <span>IZINKAN NOTIFIKASI</span>
              </div>
              <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                  Klik "Izinkan" saat diminta browser
              </div>
            `;
            button.style.background = '#10b981';
            button.style.cursor = 'pointer';
            
            alert('❌ Silakan izinkan notifikasi untuk mendapatkan pemberitahuan orderan baru. Klik ikon gembok/gembok di address bar browser Anda dan izinkan notifikasi.');
          }
        } catch (error) {
          console.error('Permission error:', error);
          button.innerHTML = '🔔 AKTIFKAN NOTIFIKASI';
          button.style.background = '#10b981';
          button.style.cursor = 'pointer';
        }
      };
  
      // Hover effects
      button.onmouseenter = () => {
        if (!button.innerHTML.includes('MEMPROSES')) {
          button.style.transform = 'translateY(-2px)';
          button.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.4)';
        }
      };
      
      button.onmouseleave = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
      };
  
      document.body.appendChild(button);
      console.log('✅ Enhanced notification permission button displayed');
    };
  
    const showNotificationWelcome = (courierId) => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🎉 Notifikasi Ojek-O Aktif!", {
          body: "Anda akan mendapatkan pemberitahuan orderan baru secara real-time. Selamat bekerja!",
          icon: "/icons/icon-192x192.png",
          tag: "welcome",
          requireInteraction: true
        });
      }
    };
  
    const registerCourierDevice = async (courierId) => {
      try {
        const deviceToken = `browser-${courierId}-${Date.now()}`;
        
        const { error } = await supabase
          .from('courier_devices')
          .upsert({
            courier_id: courierId,
            device_token: deviceToken,
            platform: 'web',
            is_active: true,
            last_active: new Date().toISOString()
          }, {
            onConflict: 'courier_id,device_token'
          });
  
        if (error) {
          console.error('❌ Device registration error:', error);
        } else {
          console.log('✅ Device registered in database');
          
          // Simpan device token di localStorage untuk penggunaan berikutnya
          localStorage.setItem('device_token', deviceToken);
        }
      } catch (error) {
        console.error('❌ Device registration error:', error);
      }
    };
  
    if (user) {
      console.log('👤 User logged in, setting up enhanced notifications...');
      setupEnhancedNotifications();
    }
  }, [user]);



  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Jika belum login, tampilkan login page
  if (!user) {
    return <Login />;
  }

  // Render content berdasarkan current page
  const renderContent = () => {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Main Content - Grow to fill space */}
        <div style={{ flex: 1 }}>
          {(() => {
            switch (currentPage) {
              case "couriers":
                return <Couriers />;
              case "customers":
                return <Customers />;
              case "deliveries":
                return <Deliveries />;
              case "dbcourier":
                return <DBCourier />;
              case "laporan":
                return <Laporan />;
              case "settings":
                return <Settings />;
              case "dashboard":
              default:
                return isAdmin ? (
                  <Dashboard setCurrentPage={setCurrentPage} />
                ) : (
                  <DBCourier setCurrentPage={setCurrentPage} />
                );
            }
          })()}
        </div>

        {/* Global Footer */}
        <footer
          style={{
            background: "white",
            borderTop: "1px solid #e2e8f0",
            padding: "16px 20px",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              textAlign: "center",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            <p style={{ margin: 0 }}>Ojek-O | Management System v1.0</p>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "#94a3b8",
              }}
            >
              apt. Hermawan Susilo Sandi, S.Farm | © 2024 All rights reserved
            </p>
          </div>
        </footer>
      </div>
    );
  };

  // Mobile-friendly navigation
  const Navigation = () => (
    <nav
      style={{
        background: "white",
        padding: "16px 20px",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(10px)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              color: "white",
            }}
          >
            🚀
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            Ojek-O RSU Aminah Blitar
          </span>
        </div>

        {/* Desktop Navigation */}
        <div
          className="desktop-nav"
          style={{
            display: "none",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <NavButton
            page="dashboard"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="📊"
            label="Dashboard"
            isAdmin={isAdmin}
          />
          <NavButton
            page="customers"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="👥"
            label="Pelanggan"
            isAdmin={isAdmin}
          />
          <NavButton
            page="couriers"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="🚗"
            label="Kurir"
            isAdminOnly={true}
            isAdmin={isAdmin}
          />
          <NavButton
            page="deliveries"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="📦"
            label="Deliveries"
            isAdmin={isAdmin}
          />
          <NavButton
            page="laporan"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="📊"
            label="Laporan"
            isAdmin={isAdmin}
          />
          <NavButton
            page="settings"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="⚙️"
            label="Pengaturan"
            isAdmin={isAdmin}
          />
          <div
            style={{
              width: "1px",
              height: "24px",
              background: "#e2e8f0",
              margin: "0 8px",
            }}
          ></div>
          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
            style={{
              padding: "8px 16px",
              background: "white",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#fef2f2";
              e.target.style.color = "#dc2626";
              e.target.style.borderColor = "#fecaca";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "white";
              e.target.style.color = "#64748b";
              e.target.style.borderColor = "#e2e8f0";
            }}
          >
            Keluar
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
          }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span
            style={{
              width: "20px",
              height: "2px",
              background: "#64748b",
              transition: "all 0.3s",
              transform: mobileMenuOpen
                ? "rotate(45deg) translate(6px, 6px)"
                : "none",
            }}
          ></span>
          <span
            style={{
              width: "20px",
              height: "2px",
              background: "#64748b",
              transition: "all 0.3s",
              opacity: mobileMenuOpen ? 0 : 1,
            }}
          ></span>
          <span
            style={{
              width: "20px",
              height: "2px",
              background: "#64748b",
              transition: "all 0.3s",
              transform: mobileMenuOpen
                ? "rotate(-45deg) translate(6px, -6px)"
                : "none",
            }}
          ></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: "fixed",
            top: "73px",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(2px)",
            zIndex: 99,
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              background: "white",
              margin: "20px",
              borderRadius: "16px",
              padding: "24px 20px",
              animation: "slideDown 0.2s ease-out",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <MobileNavButton
                page="dashboard"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="📊"
                label="Dashboard"
                isAdmin={isAdmin}
              />
              <MobileNavButton
                page="customers"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="👥"
                label="Pelanggan"
                isAdmin={isAdmin}
              />
              <MobileNavButton
                page="couriers"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="🚗"
                label="Kurir"
                isAdminOnly={true}
                isAdmin={isAdmin}
              />
              <MobileNavButton
                page="deliveries"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="📦"
                label="Deliveries"
                isAdmin={isAdmin}
              />
              <MobileNavButton
                page="laporan"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="📊"
                label="Laporan"
                isAdmin={isAdmin}
              />
              <MobileNavButton
                page="settings"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="⚙️"
                label="Pengaturan"
                isAdmin={isAdmin}
              />

              <div
                style={{
                  height: "1px",
                  background: "#e2e8f0",
                  margin: "12px 0",
                }}
              ></div>

              <button
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }}
                style={{
                  padding: "16px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span>🚪</span>
                Keluar Aplikasi
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

      {/* Main Content dengan blur effect dan disable clicks ketika menu terbuka */}
      <div
        style={{
          filter: mobileMenuOpen ? "blur(5px)" : "none",
          transition: "filter 0.3s ease",
          minHeight: "100vh",
          pointerEvents: mobileMenuOpen ? "none" : "auto",
        }}
      >
        {renderContent()}
      </div>

      {/* CSS Animations dan Media Queries */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .desktop-nav {
            display: none;
          }
          
          .mobile-menu-button {
            display: flex;
          }
          
          .mobile-menu-overlay {
            display: block;
          }
          
          @media (min-width: 768px) {
            .desktop-nav {
              display: flex !important;
            }
            
            .mobile-menu-button {
              display: none !important;
            }
            
            .mobile-menu-overlay {
              display: none !important;
            }
          }
          
          @media (max-width: 767px) {
            .desktop-only {
              display: none !important;
            }
          }
          
          @media (min-width: 768px) {
            .mobile-only {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}

// Desktop Navigation Button Component
const NavButton = ({
  page,
  currentPage,
  setCurrentPage,
  icon,
  label,
  isAdminOnly = false,
  isAdmin = false,
}) => {
  if (isAdminOnly && !isAdmin) return null;

  const isActive = currentPage === page;

  return (
    <button
      onClick={() => setCurrentPage(page)}
      style={{
        padding: "8px 16px",
        background: isActive ? "#667eea" : "transparent",
        color: isActive ? "white" : "#64748b",
        border: "none",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
      onMouseOver={(e) => {
        if (!isActive) {
          e.target.style.background = "#f8fafc";
          e.target.style.color = "#334155";
        }
      }}
      onMouseOut={(e) => {
        if (!isActive) {
          e.target.style.background = "transparent";
          e.target.style.color = "#64748b";
        }
      }}
    >
      <span>{icon}</span>
      <span className="desktop-only">{label}</span>
    </button>
  );
};

// Mobile Navigation Button Component
const MobileNavButton = ({
  page,
  currentPage,
  setCurrentPage,
  setMobileMenuOpen,
  icon,
  label,
  isAdminOnly = false,
  isAdmin = false,
}) => {
  if (isAdminOnly && !isAdmin) return null;

  const isActive = currentPage === page;

  return (
    <button
      onClick={() => {
        setCurrentPage(page);
        setMobileMenuOpen(false);
      }}
      style={{
        padding: "16px",
        background: isActive ? "#f1f5f9" : "transparent",
        color: isActive ? "#667eea" : "#64748b",
        border: "none",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: isActive ? "600" : "500",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: "18px" }}>{icon}</span>
      {label}
    </button>
  );
};

export default App;
