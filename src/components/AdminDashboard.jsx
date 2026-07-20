import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { signOut } from "firebase/auth";
import { db, storage, auth } from "../firebase";

export default function AdminDashboard({ adminUser, onLogout }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, photos: 0, videos: 0 });

  useEffect(() => {
    const q = query(collection(db, "media"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMedia(items);

      // Calcular estatísticas
      const photos = items.filter(item => item.type === "image" || !item.type || item.type.startsWith("image")).length;
      const videos = items.filter(item => item.type === "video" || item.type.startsWith("video")).length;
      setStats({
        total: items.length,
        photos: photos,
        videos: videos
      });
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onLogout) onLogout();
    } catch (error) {
      console.error("Erro ao efetuar logout:", error);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Tens a certeza absoluta que queres eliminar este ficheiro da galeria para sempre? 🗑️")) {
      return;
    }

    try {
      // 1. Apagar do Firestore
      await deleteDoc(doc(db, "media", item.id));

      // 2. Apagar do Storage (se a URL existir)
      if (item.url) {
        try {
          const decodedUrl = decodeURIComponent(item.url);
          const startIndex = decodedUrl.indexOf("/o/") + 3;
          const endIndex = decodedUrl.indexOf("?");
          if (startIndex > 2 && endIndex > startIndex) {
            const filePath = decodedUrl.substring(startIndex, endIndex);
            const storageRef = ref(storage, filePath);
            await deleteObject(storageRef);
          }
        } catch (storageErr) {
          console.warn("Erro ao remover ficheiro do storage (pode já ter sido apagado):", storageErr);
        }
      }
    } catch (error) {
      console.error("Erro ao eliminar item:", error);
      alert("Erro ao tentar eliminar. Tente novamente.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="admin-info">
          <h2>Painel de Gestão 👑</h2>
          <p className="admin-email">Sessão iniciada como: {adminUser?.email}</p>
        </div>
        <button onClick={handleLogout} className="dashboard-logout-btn">
          🚪 Terminar Sessão
        </button>
      </header>

      {/* Cartões de Estatísticas */}
      <section className="stats-grid">
        <div className="stat-card total-card">
          <div className="stat-icon">📂</div>
          <div className="stat-info">
            <span className="stat-label">Total de Envio(s)</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="stat-card photo-card">
          <div className="stat-icon">📸</div>
          <div className="stat-info">
            <span className="stat-label">Fotos na Galeria</span>
            <span className="stat-value">{stats.photos}</span>
          </div>
        </div>

        <div className="stat-card video-card">
          <div className="stat-icon">🎥</div>
          <div className="stat-info">
            <span className="stat-label">Vídeos na Galeria</span>
            <span className="stat-value">{stats.videos}</span>
          </div>
        </div>
      </section>

      {/* Lista de Ficheiros */}
      <section className="management-section">
        <h3 className="section-subtitle">Gestão de Conteúdos</h3>

        {loading ? (
          <div className="dashboard-loading">A carregar conteúdos... ⏳</div>
        ) : media.length === 0 ? (
          <div className="dashboard-empty">Nenhum ficheiro encontrado na galeria.</div>
        ) : (
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Ficheiro</th>
                  <th>Autor</th>
                  <th>Tipo</th>
                  <th>Data de Envio</th>
                  <th className="actions-header">Ações</th>
                </tr>
              </thead>
              <tbody>
                {media.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-media-preview">
                        {item.type === "video" ? (
                          <div className="preview-video-container">
                            <video src={item.url} muted className="table-thumb" />
                            <span className="play-badge">▶</span>
                          </div>
                        ) : (
                          <img src={item.url} alt={item.name} className="table-thumb" />
                        )}
                        <span className="table-filename" title={item.name}>
                          {item.name || "Sem nome"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="table-author">{item.author || "Anónimo"}</span>
                    </td>
                    <td>
                      <span className={`type-tag tag-${item.type || "image"}`}>
                        {item.type === "video" ? "🎥 Vídeo" : "📸 Foto"}
                      </span>
                    </td>
                    <td>
                      <span className="table-date">{formatDate(item.createdAt)}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn view-btn"
                          title="Ver em tamanho real"
                        >
                          👁️
                        </a>
                        <button
                          onClick={() => handleDelete(item)}
                          className="action-btn delete-btn-table"
                          title="Eliminar permanentemente"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
