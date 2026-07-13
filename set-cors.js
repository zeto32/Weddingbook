/**
 * Script para configurar CORS no Firebase Storage
 * Uso: node set-cors.js <caminho-para-service-account.json>
 */
const { Storage } = require("@google-cloud/storage");
const path = require("path");

const BUCKET_NAME = "wedding-book-27002.firebasestorage.app";

const CORS_CONFIG = [
  {
    origin: ["*"],
    method: ["GET", "HEAD", "OPTIONS"],
    maxAgeSeconds: 3600,
    responseHeader: ["Content-Type", "Content-Disposition", "Content-Length"],
  },
];

async function setCors() {
  const keyFile = process.argv[2];

  if (!keyFile) {
    console.error("\n? Erro: Indica o caminho para o ficheiro de credenciais.");
    console.error(
      "   Exemplo: node set-cors.js C:\\Users\\joaos\\Downloads\\serviceAccount.json\n"
    );
    process.exit(1);
  }

  const resolvedKey = path.resolve(keyFile);
  console.log("\n?? A usar credenciais:", resolvedKey);

  const storage = new Storage({ keyFilename: resolvedKey });
  const bucket = storage.bucket(BUCKET_NAME);

  try {
    console.log("??  Bucket:", BUCKET_NAME);
    console.log("? A aplicar configuração CORS...\n");
    await bucket.setCorsConfiguration(CORS_CONFIG);
    console.log("? CORS configurado com sucesso!");
    console.log("   Os downloads da galeria devem funcionar agora.\n");
  } catch (err) {
    console.error("? Erro ao configurar CORS:", err.message);
    if (err.code === 403) {
      console.error(
        "   ? A conta de serviço não tem permissão. Garante que tem o papel 'Storage Admin'."
      );
    }
    process.exit(1);
  }
}

setCors();
