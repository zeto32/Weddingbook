import React, { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fazer login no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Verificar se o utilizador está na coleção 'admins'
      const adminDocRef = doc(db, "admins", user.uid);
      const adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists() && (adminDoc.data().isAdmin === true || adminDoc.data().role === "admin")) {
        // Sucesso
        onLoginSuccess(user);
      } else {
        // Não é admin, fazer logout imediato
        await signOut(auth);
        setError("Acesso negado: Este utilizador não tem permissões de administrador.");
      }
    } catch (err) {
      console.error("Erro ao efetuar login:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("E-mail ou palavra-passe incorretos.");
      } else {
        setError("Ocorreu um erro ao aceder ao servidor. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <span className="admin-lock-icon">🔒</span>
          <h2>Área Administrativa</h2>
          <p>Insira as suas credenciais para aceder ao dashboard</p>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Palavra-passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? "A entrar..." : "Entrar no Painel 🔑"}
          </button>
        </form>
      </div>
    </div>
  );
}
