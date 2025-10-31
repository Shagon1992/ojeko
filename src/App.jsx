import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Couriers from "./components/Couriers";
import Customers from "./components/Customers";
import Deliveries from "./components/Deliveries";
import DBCourier from "./components/DBCourier";
import Laporan from "./components/Laporan"; // ✅ TAMBAH INI
import ImportCustomers from "./components/ImportCustomers"; // ✅ TAMBAH INI
import Settings from "./components/Settings/Settings";
import "./App.css";

// 🔥 IMPORT ONESIGNAL
import OneSignal from "react-onesignal";
import { supabase } from "./lib/supabase"; // Pastikan path ini sesuai

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  // 🎯 PERBAIKAN: Definisikan isAdmin di sini
  const isAdmin = user?.role === "admin";

  // 🔥 ONESIGNAL INITIALIZATION
// 🔥 ONESIGNAL - FIXED PERMISSION VERSION
useEffect(() => {
  const setupOneSignal = () => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser?.courier_id) return;

    console.log('👤 Setting up OneSignal for courier:', currentUser.courier_id);

    // Tampilkan button setelah 3 detik
    setTimeout(() => {
      showSmartPermissionButton(currentUser.courier_id);
    }, 3000);
  };

  const showSmartPermissionButton = (courierId) => {
    if (document.getElementById('notification-btn')) return;

    const button = document.createElement('button');
    button.id = 'notification-btn';
    button.innerHTML = '🔔 AKTIFKAN NOTIFIKASI ORDERAN';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      border: none;
      padding: 15px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    button.onclick = async () => {
      button.innerHTML = '⏳ MEMPROSES...';
      button.style.background = '#6b7280';
      
      try {
        console.log('🎯 Checking current permission state...');
        
        // Cek status permission saat ini
        const permission = await window.OneSignal.getNotificationPermission();
        console.log('📱 Current permission:', permission);
        
        if (permission === 'granted') {
          // User sudah allow, langsung ambil device token
          console.log('✅ Permission already granted, getting device token...');
          const userId = await window.OneSignal.getUserId();
          if (userId) {
            await saveDeviceToken(userId, courierId);
            button.innerHTML = '✅ NOTIFIKASI AKTIF!';
            button.style.background = '#059669';
            setTimeout(() => button.remove(), 2000);
          } else {
            button.innerHTML = '❌ TOKEN TIDAK ADA';
            button.style.background = '#dc2626';
            console.error('User ID tidak tersedia meski permission granted');
          }
        } else if (permission === 'default') {
          // User belum memutuskan, tampilkan prompt
          console.log('🎯 Showing permission prompt...');
          await window.OneSignal.showSlidedownPrompt();
          
          // Tunggu dan cek lagi
          setTimeout(async () => {
            const newPermission = await window.OneSignal.getNotificationPermission();
            if (newPermission === 'granted') {
              const userId = await window.OneSignal.getUserId();
              if (userId) {
                await saveDeviceToken(userId, courierId);
                button.innerHTML = '✅ NOTIFIKASI AKTIF!';
                button.style.background = '#059669';
                setTimeout(() => button.remove(), 2000);
              }
            } else {
              button.innerHTML = '🔔 AKTIFKAN NOTIFIKASI';
              button.style.background = '#10b981';
            }
          }, 3000);
        } else {
          // Permission denied, beri instruksi manual
          console.log('❌ Permission denied, showing manual instructions');
          button.innerHTML = '🔔 IZINKAN MANUAL';
          button.style.background = '#f59e0b';
          alert(
            'Untuk mengaktifkan notifikasi:\n\n' +
            '1. Klik 🔒 icon di address bar\n' +
            '2. Pilih "Site settings"\n' + 
            '3. Cari "Notifications"\n' +
            '4. Pilih "Allow"\n' +
            '5. Refresh halaman'
          );
        }
      } catch (error) {
        console.error('Permission error:', error);
        button.innerHTML = '🔔 AKTIFKAN NOTIFIKASI';
        button.style.background = '#10b981';
      }
    };

    document.body.appendChild(button);
    console.log('✅ Smart permission button displayed');
  };

  const saveDeviceToken = async (deviceId, courierId) => {
    console.log('💾 Saving device token:', deviceId);
    const { error } = await supabase
      .from('courier_devices')
      .upsert({
        courier_id: courierId,
        device_token: deviceId,
        platform: 'web',
        is_active: true
      }, { onConflict: 'courier_id,device_token' });

    if (error) {
      console.error('❌ Database error:', error);
      alert('Gagal menyimpan token: ' + error.message);
    } else {
      console.log('✅ Device token saved successfully!');
      alert('🎉 NOTIFIKASI BERHASIL DIAKTIFKAN!\n\nAnda akan menerima pemberitahuan ketika ada orderan baru.');
    }
  };

  if (user) {
    console.log('👤 User logged in, starting OneSignal setup...');
    setupOneSignal();
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
          className="desktop-nav" // 🎯 PERBAIKAN: Gunakan CSS class untuk media query
          style={{
            display: "none",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {/* 🎯 PERBAIKAN: Tambahkan isAdmin={isAdmin} ke semua NavButton */}
          <NavButton
            page="dashboard"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="📊"
            label="Dashboard"
            isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
          />
          <NavButton
            page="customers"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="👥"
            label="Pelanggan"
            isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
          />
          <NavButton
            page="couriers"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="🚗"
            label="Kurir"
            isAdminOnly={true}
            isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
          />
          <NavButton
            page="deliveries"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            icon="📦"
            label="Deliveries"
            isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
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
          className="mobile-menu-button" // 🎯 PERBAIKAN: Gunakan CSS class
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
          className="mobile-menu-overlay" // 🎯 PERBAIKAN: Gunakan CSS class
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
              {/* 🎯 PERBAIKAN: Tambahkan isAdmin={isAdmin} ke semua MobileNavButton */}
              <MobileNavButton
                page="dashboard"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="📊"
                label="Dashboard"
                isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
              />
              <MobileNavButton
                page="customers"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="👥"
                label="Pelanggan"
                isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
              />
              <MobileNavButton
                page="couriers"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="🚗"
                label="Kurir"
                isAdminOnly={true}
                isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
              />
              <MobileNavButton
                page="deliveries"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                setMobileMenuOpen={setMobileMenuOpen}
                icon="📦"
                label="Deliveries"
                isAdmin={isAdmin} // 🎯 INI YANG DITAMBAHKAN
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
          
          /* 🎯 PERBAIKAN: Media queries yang benar */
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
          
          /* Mobile-first responsive */
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
  isAdmin = false, // 🎯 Parameter yang diperlukan
}) => {
  // 🎯 PERBAIKAN: Hide admin-only buttons for couriers
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
  isAdmin = false, // 🎯 Parameter yang diperlukan
}) => {
  // 🎯 PERBAIKAN: Hide admin-only buttons for couriers
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
