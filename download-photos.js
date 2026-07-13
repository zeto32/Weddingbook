const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = "wedding-book-27002";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/media`;

// Função para descarregar um ficheiro resolvendo redirecionamentos
function download(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    function get(currentUrl) {
      try {
        const parsedUrl = new URL(currentUrl);
        const requestModule = parsedUrl.protocol === 'https:' ? https : http;
        
        requestModule.get(currentUrl, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectUrl = new URL(response.headers.location, currentUrl).toString();
            get(redirectUrl);
            return;
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`Status HTTP inválido: ${response.statusCode}`));
            return;
          }

          const file = fs.createWriteStream(destPath);
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve();
          });
          
          file.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        }).on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    }
    
    get(fileUrl);
  });
}

// Função para fazer pedido JSON simples via HTTPS
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Erro ao obter dados: ${response.statusCode} - ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Função principal
async function main() {
  console.log("==========================================");
  console.log("🚀 A iniciar a transferência de todas as fotos/vídeos...");
  console.log(`   Projeto: ${PROJECT_ID}`);
  console.log("==========================================\n");
  
  const downloadsDir = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }
  
  let allMedia = [];
  let pageToken = '';
  
  do {
    let url = `${BASE_URL}?pageSize=100`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    
    console.log("📖 A consultar lista de ficheiros na base de dados...");
    try {
      const data = await fetchJSON(url);
      if (data.documents && data.documents.length > 0) {
        allMedia = allMedia.concat(data.documents);
      }
      pageToken = data.nextPageToken || '';
    } catch (err) {
      console.error("❌ Erro ao obter documentos da base de dados:", err.message);
      process.exit(1);
    }
  } while (pageToken);
  
  if (allMedia.length === 0) {
    console.log("🌸 Nenhuma foto ou vídeo encontrado no Firebase.");
    return;
  }
  
  console.log(`✨ Encontrados ${allMedia.length} ficheiros para descarregar.`);
  
  // Limpar caracteres inválidos em nomes de ficheiro no Windows/macOS/Linux
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  
  // Mapear os itens e definir os caminhos únicos de destino
  const itemsToDownload = [];
  
  allMedia.forEach((doc, idx) => {
    const fields = doc.fields || {};
    const url = fields.url ? fields.url.stringValue : '';
    if (!url) return;
    
    const originalName = fields.name ? fields.name.stringValue : `media_${idx}`;
    const author = fields.author ? fields.author.stringValue : 'Anonimo';
    
    const safeAuthor = author.replace(invalidChars, '_').trim();
    const safeName = originalName.replace(invalidChars, '_').trim();
    
    const finalName = `[${safeAuthor || 'Anonimo'}]_${safeName || `ficheiro_${idx}`}`;
    
    let destPath = path.join(downloadsDir, finalName);
    let counter = 1;
    const ext = path.extname(finalName);
    const base = path.basename(finalName, ext);
    
    // Evitar substituir ficheiros com o mesmo nome original
    while (fs.existsSync(destPath) || itemsToDownload.some(item => item.destPath === destPath)) {
      destPath = path.join(downloadsDir, `${base}_${counter}${ext}`);
      counter++;
    }
    
    itemsToDownload.push({ url, name: path.basename(destPath), destPath });
  });
  
  console.log(`📥 A iniciar download para a pasta './downloads/'...`);
  console.log(`⚡ Descarregando com concorrência máxima de 5 ligação(ões)...\n`);
  
  const total = itemsToDownload.length;
  let downloadedCount = 0;
  let failedCount = 0;
  
  async function downloadWithProgress(item) {
    console.log(`⏳ [A iniciar] ${item.name}`);
    await download(item.url, item.destPath);
    downloadedCount++;
    console.log(`✅ [Concluído] (${downloadedCount}/${total}) ${item.name}`);
  }
  
  let index = 0;
  async function worker() {
    while (index < itemsToDownload.length) {
      const currentIndex = index++;
      const item = itemsToDownload[currentIndex];
      try {
        await downloadWithProgress(item);
      } catch (err) {
        failedCount++;
        console.error(`❌ [Falhou] ${item.name} - Erro: ${err.message}`);
      }
    }
  }
  
  // Limpar concorrência para 5 downloads em simultâneo
  const concurrency = 5;
  const workers = Array.from({ length: Math.min(concurrency, itemsToDownload.length) }, worker);
  await Promise.all(workers);
  
  console.log("\n==========================================");
  console.log("🎉 Processo concluído!");
  console.log(`📂 Pasta de destino: ${downloadsDir}`);
  console.log(`🔹 Descarregados com sucesso: ${downloadedCount}`);
  if (failedCount > 0) {
    console.log(`⚠️ Falhas: ${failedCount}`);
  }
  console.log("==========================================");
}

main().catch(err => {
  console.error("❌ Ocorreu um erro inesperado:", err);
});
