# 💍 Wedding Gallery

Aplicação React para partilha de fotos e vídeos em casamentos. Os convidados acedem pelo QR Code, fazem upload e veem a galeria em tempo real.

---

## 📁 Estrutura do Projeto

```
wedding-gallery/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.jsx        ← Nome e data do casamento
│   │   ├── UploadSection.jsx ← Upload de fotos/vídeos
│   │   └── Gallery.jsx       ← Galeria em tempo real
│   ├── styles/
│   │   └── main.css          ← Design completo
│   ├── firebase.js           ← Configuração Firebase
│   ├── App.jsx               ← App principal
│   └── index.js              ← Entrada React
├── .env.example              ← Variáveis de ambiente
├── package.json
└── README.md
```

---

## 🚀 Passo a passo para implementar

### 1. Instalar dependências

```bash
npm install
```

---

### 2. Criar projeto no Firebase

1. Vai a [console.firebase.google.com](https://console.firebase.google.com)
2. Clica em **"Adicionar projeto"**
3. Dá um nome (ex: `wedding-gallery`)
4. Ativa o **Google Analytics** se quiseres (opcional)

---

### 3. Ativar Firestore (base de dados)

1. No menu lateral → **Firestore Database**
2. Clica **"Criar base de dados"**
3. Escolhe **modo de teste** (para facilitar nos primeiros dias)
4. Seleciona a região `europe-west`

> ⚠️ Depois do casamento, altera as regras de segurança para modo de produção.

---

### 4. Ativar Firebase Storage (ficheiros)

1. No menu lateral → **Storage**
2. Clica **"Começar"**
3. Escolhe **modo de teste**
4. Seleciona a região `europe-west`

---

### 5. Obter as credenciais

1. No Firebase Console → Ícone de engrenagem ⚙️ → **Definições do projeto**
2. Clica em **"Adicionar app"** → Web (`</>`)
3. Regista a app (ex: `wedding-web`)
4. Copia o objeto `firebaseConfig` que aparece

---

### 6. Configurar credenciais

Copia o ficheiro `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preenche o `.env` com os teus valores:

```
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=wedding-gallery.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=wedding-gallery
REACT_APP_FIREBASE_STORAGE_BUCKET=wedding-gallery.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123:web:abc123
```

Ou edita diretamente o ficheiro `src/firebase.js` substituindo os valores.

---

### 7. Personalizar o casamento

Edita `src/components/Header.jsx` com o vosso nome e data:

```jsx
<p className="header-date">26 · Junho · 2026</p>
<h1 className="header-title">Ana & João</h1>
```

---

### 8. Testar localmente

```bash
npm start
```

Abre em [http://localhost:3000](http://localhost:3000)

---

### 9. Publicar no Vercel (gratuito)

1. Cria conta em [vercel.com](https://vercel.com)
2. Instala o Vercel CLI (opcional) ou liga o repositório GitHub
3. Faz deploy:

```bash
npx vercel --prod
```

4. Adiciona as variáveis de ambiente no dashboard do Vercel:
   - **Settings** → **Environment Variables** → cola os valores do `.env`

---

### 10. Gerar o QR Code

Com o link do Vercel (ex: `https://ana-joao.vercel.app`):

- Usa [qr-code-generator.com](https://www.qr-code-generator.com/) ou [qrcode-monkey.com](https://www.qrcode-monkey.com/)
- Imprime e coloca nas mesas 🎉

---

## 🔒 Segurança (após o casamento)

No Firebase Console → Firestore e Storage → **Regras**, substitui por:

```javascript
// Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /media/{doc} {
      allow read: if true;
      allow write: if request.time < timestamp.date(2026, 7, 31); // Fecha após o casamento
    }
  }
}
```

---

## ✨ Funcionalidades

- 📸 Upload de fotos e vídeos (do telemóvel ou computador)
- 🎞️ Galeria em tempo real (atualiza sem refresh)
- 👤 Campo de nome do convidado (opcional)
- 🔍 Lightbox para ver em fullscreen
- 📱 Design responsivo e bonito para mobile
- 🌸 Design elegante estilo casamento
