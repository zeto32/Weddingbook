import React, { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, startAfter, deleteDoc, doc, getCountFromServer } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function Gallery({ isAdmin }) {
  const [media, setMedia] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  // Pagination states
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTotalCount = async () => {
    try {
      const coll = collection(db, "media");
      const snapshot = await getCountFromServer(coll);
      setTotalCount(snapshot.data().count);
    } catch (error) {
      console.error("Erro ao obter contagem total:", error);
    }
  };

  const fetchInitialMedia = async () => {
    setLoading(true);
    try {
      await fetchTotalCount();
      const q = query(
        collection(db, "media"),
        orderBy("createdAt", "desc"),
        limit(12)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMedia(items);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 12);
    } catch (error) {
      console.error("Erro ao carregar galeria:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialMedia();
  }, []);

  const fetchMoreMedia = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "media"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(12)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      if (items.length > 0) {
        setMedia((prev) => [...prev, ...items]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 12);
    } catch (error) {
      console.error("Erro ao carregar mais momentos:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Tens a certeza que queres eliminar este momento para sempre? 🗑️")) return;

    try {
      // 1. Apagar do Firestore
      await deleteDoc(doc(db, "media", item.id));

      // 2. Apagar do Storage
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
          console.warn("Erro ao remover ficheiro do storage:", storageErr);
        }
      }

      // Update local state
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setSelected(null);
    } catch (error) {
      console.error("Erro ao eliminar:", error);
      alert("Houve um problema ao eliminar o ficheiro.");
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      // Obter documentos e filtrar apenas imagens para evitar crash por falta de memória (out of memory) no navegador
      const q = query(collection(db, "media"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const allItems = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.type === "image" || !item.type || item.type.startsWith("image"));

      if (allItems.length === 0) {
        alert("Não existem fotos para descarregar.");
        setDownloading(false);
        return;
      }

      setDownloadProgress({ done: 0, total: allItems.length });

      const zip = new JSZip();
      const folder = zip.folder("galeria-casamento");

      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const response = await fetch(item.url);
        const blob = await response.blob();

        // Determinar extensão pelo tipo MIME ou pelo nome original
        const mimeToExt = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
          "video/mp4": "mp4",
          "video/quicktime": "mov",
          "video/webm": "webm",
        };
        const ext = mimeToExt[blob.type] || (item.type === "video" ? "mp4" : "jpg");
        const filename = item.name
          ? item.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          : `ficheiro_${i + 1}.${ext}`;
        const safeName = filename.includes(".") ? filename : `${filename}.${ext}`;

        folder.file(safeName, blob);
        setDownloadProgress({ done: i + 1, total: allItems.length });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "galeria-casamento.zip");
    } catch (error) {
      console.error("Erro ao criar ZIP:", error);
      alert("Houve um problema ao descarregar os ficheiros. Tenta novamente.");
    } finally {
      setDownloading(false);
      setDownloadProgress({ done: 0, total: 0 });
    }
  };

  if (loading) {
    return <div className="gallery-loading">A carregar galeria... 💫</div>;
  }

  if (media.length === 0) {
    return (
      <div className="gallery-empty">
        <p>🌸 Ainda não há fotos. Sê o primeiro a partilhar!</p>
      </div>
    );
  }

  return (
    <div className="gallery-section">
      <h2 className="section-title">🎞️ Galeria do casamento</h2>
      <p className="gallery-count">{totalCount} momento(s) partilhado(s)</p>

      {isAdmin && (
        <div className="download-admin-container">
          <button
            className="download-all-btn"
            onClick={handleDownloadAll}
            disabled={downloading}
            title="Descarregar apenas fotos em ZIP (vídeos não incluídos)"
          >
            {downloading ? (
              <>
                <span className="download-spinner">⏳</span>
                A criar ZIP… {downloadProgress.done}/{downloadProgress.total}
              </>
            ) : (
              <>📸 Descarregar Fotos em ZIP</>
            )}
          </button>
          <p className="download-disclaimer">
            ⚠️ <strong>Nota de Performance:</strong> Devido a limites de memória do navegador, este ZIP descarrega apenas as <strong>fotos</strong> da galeria. Para descarregar a galeria completa (incluindo todos os vídeos pesados), corre o script <code>node download-photos.js</code> no teu computador.
          </p>
        </div>
      )}

      <div className="gallery-grid">
        {media.map((item) => (
          <div
            key={item.id}
            className="gallery-item"
            onClick={() => setSelected(item)}
          >
            {item.type === "video" ? (
              <video 
                src={item.url} 
                className="gallery-thumb" 
                muted 
                preload="metadata" 
                playsInline 
              />
            ) : (
              <img 
                src={item.url} 
                alt={item.name} 
                className="gallery-thumb" 
                loading="lazy" 
              />
            )}
            {item.type === "video" && <span className="video-badge">▶</span>}
            {item.author && (
              <span className="author-badge">{item.author}</span>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-btn" 
            onClick={fetchMoreMedia} 
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="download-spinner">⏳</span> A carregar...
              </>
            ) : (
              "Ver mais momentos 🎞️"
            )}
          </button>
        </div>
      )}

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelected(null)}>✕</button>
            {selected.type === "video" ? (
              <video src={selected.url} controls className="lightbox-media" autoPlay />
            ) : (
              <img src={selected.url} alt={selected.name} className="lightbox-media" />
            )}
            {selected.author && (
              <p className="lightbox-author">📷 {selected.author}</p>
            )}
            <button 
              className="delete-btn" 
              onClick={() => handleDelete(selected)}
              title="Apagar momento"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

