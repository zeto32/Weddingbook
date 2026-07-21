import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Header from "./components/Header";
import UploadSection from "./components/UploadSection";
import Gallery from "./components/Gallery";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import "./styles/main.css";

export default function App() {
  const [tab, setTab] = useState("upload");
  const [adminUser, setAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const adminDocRef = doc(db, "admins", user.uid);
          const adminDoc = await getDoc(adminDocRef);
          if (adminDoc.exists() && (adminDoc.data().isAdmin === true || adminDoc.data().role === "admin")) {
            setAdminUser(user);
          } else {
            setAdminUser(null);
            await signOut(auth);
          }
        } catch (error) {
          console.error("Erro ao verificar admin na inicialização:", error);
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    if (tab === "admin") {
      if (authLoading) {
        return <div className="admin-loading-screen">A verificar credenciais... 🔑</div>;
      }
      if (adminUser) {
        return <AdminDashboard adminUser={adminUser} onLogout={() => setTab("upload")} />;
      }
      return <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />;
    }
    return tab === "upload" ? <UploadSection /> : <Gallery isAdmin={!!adminUser} />;
  };

  return (
    <div className="app">
      <Header />

      <nav className="tab-nav">
        <button
          className={`tab-btn ${tab === "upload" ? "active" : ""}`}
          onClick={() => setTab("upload")}
        >
          📸 Enviar
        </button>
        <button
          className={`tab-btn ${tab === "gallery" ? "active" : ""}`}
          onClick={() => setTab("gallery")}
        >
          🎞️ Galeria
        </button>
        {adminUser && (
          <button
            className={`tab-btn ${tab === "admin" ? "active" : ""}`}
            onClick={() => setTab("admin")}
          >
            👑 Painel Admin
          </button>
        )}
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>

      <footer className="footer">
        <p>Feito com 💕 para um dia especial</p>
        <div className="admin-footer-link">
          <button 
            className="footer-admin-btn" 
            onClick={() => setTab("admin")}
            title="Aceder à Área de Administração"
          >
            {adminUser ? "👑 Aceder ao Painel Admin" : "🔒 Área do Administrador"}
          </button>
        </div>
      </footer>
    </div>
  );
}
