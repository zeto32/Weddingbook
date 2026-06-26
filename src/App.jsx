import React, { useState } from "react";
import Header from "./components/Header";
import UploadSection from "./components/UploadSection";
import Gallery from "./components/Gallery";
import "./styles/main.css";

export default function App() {
  const [tab, setTab] = useState("upload");

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
      </nav>

      <main className="main-content">
        {tab === "upload" ? <UploadSection /> : <Gallery />}
      </main>

      <footer className="footer">
        <p>Feito com 💕 para um dia especial</p>
      </footer>
    </div>
  );
}
