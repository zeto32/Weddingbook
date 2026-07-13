import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function Gallery() {
  const [media, setMedia] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const q = query(collection(db, "media"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMedia(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (item) => {
    if (!window.confirm("Tens a certeza que queres eliminar este momento para sempre? 🗑️")) return;

    try {
      // 1. Apagar do Firestore
      await deleteDoc(doc(db, "media", item.id));

      // 2. Apagar do Storage
      // Precisamos do caminho relativo no Storage. Se guardamos como 'wedding/filename', 
      // podemos extrair da URL ou ter guardado o path. 
      // No UploadSection guardamos como `wedding/${Date.now()}_${file.name}`
      // Infelizmente não guardamos o path no Firestore, mas podemos tentar extrair da URL 
      // ou apenas apagar do Firestore por agora se a URL for complexa.
      // No entanto, é melhor apagar do storage também.
      
      // Tentativa de extrair o path da URL do Firebase Storage
      // URLs do Firebase Storage têm o formato: .../o/path%2Fto%2Ffile?alt=media...
      const decodedUrl = decodeURIComponent(item.url);
      const startIndex = decodedUrl.indexOf("/o/") + 3;
      const endIndex = decodedUrl.indexOf("?");
      const filePath = decodedUrl.substring(startIndex, endIndex);
      
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);

      setSelected(null);
    } catch (error) {
      console.error("Erro ao eliminar:", error);
      alert("Houve um problema ao eliminar o ficheiro.");
    }
  };

  const handleDownloadAll = async () => {
    if (media.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ done: 0, total: media.length });

    const zip = new JSZip();
    const folder = zip.folder("galeria-casamento");

    try {
      for (let i = 0; i < media.length; i++) {
        const item = media[i];
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
        setDownloadProgress({ done: i + 1, total: media.length });
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
      <p className="gallery-count">{media.length} momento(s) partilhado(s)</p>

      <button
        className="download-all-btn"
        onClick={handleDownloadAll}
        disabled={downloading}
        title="Descarregar toda a galeria num ficheiro ZIP"
      >
        {downloading ? (
          <>
            <span className="download-spinner">⏳</span>
            A criar ZIP… {downloadProgress.done}/{downloadProgress.total}
          </>
        ) : (
          <>📦 Descarregar tudo em ZIP</>
        )}
      </button>

      <div className="gallery-grid">
        {media.map((item) => (
          <div
            key={item.id}
            className="gallery-item"
            onClick={() => setSelected(item)}
          >
            {item.type === "video" ? (
              <video src={item.url} className="gallery-thumb" muted />
            ) : (
              <img src={item.url} alt={item.name} className="gallery-thumb" />
            )}
            {item.type === "video" && <span className="video-badge">▶</span>}
            {item.author && (
              <span className="author-badge">{item.author}</span>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelected(null)}>✕</button>
            {selected.type === "video" ? (
              <video src={selected.url} controls className="lightbox-media" />
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
