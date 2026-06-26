import React, { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../firebase";

export default function UploadSection() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progresses, setProgresses] = useState({});
  const [done, setDone] = useState(false);
  const [author, setAuthor] = useState("");
  const inputRef = useRef();

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setDone(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(dropped);
    setDone(false);
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    setUploading(true);
    setDone(false);

    const uploads = files.map((file) => {
      return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `wedding/${Date.now()}_${file.name}`);
        const task = uploadBytesResumable(storageRef, file);

        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgresses((prev) => ({ ...prev, [file.name]: pct }));
          },
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            await addDoc(collection(db, "media"), {
              url,
              name: file.name,
              type: file.type.startsWith("video") ? "video" : "image",
              author: author || "Anónimo",
              createdAt: serverTimestamp(),
            });
            resolve();
          }
        );
      });
    });

    Promise.all(uploads).then(() => {
      setUploading(false);
      setDone(true);
      setFiles([]);
      setProgresses({});
    });
  };

  return (
    <div className="upload-section">
      <h2 className="section-title">📸 Partilha o teu momento</h2>

      <input
        type="text"
        placeholder="O teu nome (opcional)"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className="name-input"
      />

      <div
        className="dropzone"
        onClick={() => inputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={handleFiles}
        />
        {files.length > 0 ? (
          <p>{files.length} ficheiro(s) selecionado(s)</p>
        ) : (
          <>
            <p className="drop-icon">📁</p>
            <p>Toca para escolher fotos ou vídeos</p>
            <p className="drop-hint">ou arrasta para aqui</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f) => (
            <div key={f.name} className="file-item">
              <span>{f.name}</span>
              {progresses[f.name] != null && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progresses[f.name]}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="upload-btn"
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
      >
        {uploading ? "A enviar..." : "Enviar para a galeria 💌"}
      </button>

      {done && (
        <p className="success-msg">✅ Obrigado! As tuas fotos já estão na galeria!</p>
      )}
    </div>
  );
}
