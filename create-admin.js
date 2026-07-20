const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const readline = require("readline");

// Configuração do Firebase (copiada de src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyB6dvT-3SZBpa2GxuZNUaNzM-oXaQ8nVR0",
  authDomain: "wedding-book-27002.firebaseapp.com",
  projectId: "wedding-book-27002",
  storageBucket: "wedding-book-27002.firebasestorage.app",
  messagingSenderId: "175739326234",
  appId: "1:175739326234:web:7ec57cdca1d0cb5bd8a6a3",
  measurementId: "G-58Q8JKKW03"
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("====================================================");
  console.log("💍 Criador de Utilizador Administrador - Weddingbook");
  console.log("====================================================\n");

  const email = await askQuestion("📧 Insira o e-mail do admin: ");
  if (!email || !email.includes("@")) {
    console.error("❌ E-mail inválido.");
    rl.close();
    return;
  }

  const password = await askQuestion("🔑 Insira a palavra-passe (mínimo 6 caracteres): ");
  if (!password || password.length < 6) {
    console.error("❌ A palavra-passe deve ter pelo menos 6 caracteres.");
    rl.close();
    return;
  }

  console.log("\n⏳ A inicializar Firebase e a criar utilizador...");
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // 1. Criar utilizador no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`✅ Utilizador criado com sucesso no Auth! UID: ${user.uid}`);

    // 2. Criar documento de permissões no Firestore
    console.log("⏳ A registar permissões de administrador no Firestore...");
    const adminDocRef = doc(db, "admins", user.uid);
    await setDoc(adminDocRef, {
      email: email,
      role: "admin",
      isAdmin: true,
      createdAt: new Date().toISOString()
    });

    console.log("\n====================================================");
    console.log("🎉 SUCESSO! Administrador criado e registado!");
    console.log(`📧 E-mail: ${email}`);
    console.log("👉 Agora podes aceder ao Dashboard usando estes dados.");
    console.log("====================================================");

  } catch (error) {
    console.error("\n❌ Ocorreu um erro no processo:");
    if (error.code === "auth/email-already-in-use") {
      console.error("O e-mail introduzido já está registado no Firebase Auth.");
      console.log("Dica: Se já existir no Auth, precisas apenas de criar o documento no Firestore:");
      console.log(`Coleção: 'admins' | ID do Documento: <UID_DO_UTILIZADOR> | Dados: { "isAdmin": true, "role": "admin", "email": "${email}" }`);
    } else {
      console.error(error.message);
    }
  } finally {
    rl.close();
  }
}

main().catch(console.error);
