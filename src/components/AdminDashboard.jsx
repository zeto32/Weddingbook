import React, { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, startAfter, deleteDoc, doc, getCountFromServer, where } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { signOut } from "firebase/auth";
import { db, storage, auth } from "../firebase";

export default function AdminDashboard({ adminUser, onLogout }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, photos: 0, videos: 0 });

  // Pagination states
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchStats = async () => {
    try {
      const [totalSnap, videosSnap] = await Promise.all([
        getCountFromServer(collection(db, "media")),
        getCountFromServer(query(collection(db, "media"), where("type", "==", "video")))
      ]);
      const total = totalSnap.data().count;
      const videos = videosSnap.data().count;
      const photos = total - videos;
      setStats({
        total: total,
        photos: photos,
        videos: videos
      });
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await fetchStats();
      const q = query(
        collection(db, "media"),
        orderBy("createdAt", "desc"),
        limit(15)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMedia(items);

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 15);
    } catch (error) {
      console.error("Erro ao carregar painel:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchMoreData = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "media"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(15)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (items.length > 0) {
        setMedia((prev) => [...prev, ...items]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 15);
    } catch (error) {
      console.error("Erro ao carregar mais dados:", error);
    } finally {
      setLoadingMore(false);
    }
  };

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

      // Update local list
      setMedia((prev) => prev.filter((m) => m.id !== item.id));

      // Update local stats count
      setStats((prev) => {
        const isVideo = item.type === "video";
        return {
          total: Math.max(0, prev.total - 1),
          videos: isVideo ? Math.max(0, prev.videos - 1) : prev.videos,
          photos: !isVideo ? Math.max(0, prev.photos - 1) : prev.photos,
        };
      });

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
        <div className="dashboard-header-actions">
          <button 
            onClick={fetchInitialData} 
            className="dashboard-sync-btn"
            title="Atualizar dados do servidor"
            disabled={loading}
          >
            🔄 Sincronizar
          </button>
          <button onClick={handleLogout} className="dashboard-logout-btn">
            🚪 Terminar Sessão
          </button>
        </div>
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
          <>
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
                              <video src={item.url} muted className="table-thumb" preload="none" />
                              <span className="play-badge">▶</span>
                            </div>
                          ) : (
                            <img src={item.url} alt={item.name} className="table-thumb" loading="lazy" />
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

            {hasMore && (
              <div className="load-more-container">
                <button 
                  className="load-more-btn" 
                  onClick={fetchMoreData} 
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="download-spinner">⏳</span> A carregar...
                    </>
                  ) : (
                    "Carregar mais ficheiros 📂"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

