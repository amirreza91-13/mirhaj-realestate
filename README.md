@'
<div align="center">

# 🏠 Mirhaj Real Estate

### A modern full-stack real-estate platform for Jarquyeh, Isfahan 🇮🇷

Built with **Node.js, Express, JavaScript, HTML & CSS**  
with real-time communication, authentication, property management and PWA capabilities.

<br>

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-Backend-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br>

🏡 **Property Listings** &nbsp; • &nbsp; 🔎 **Search** &nbsp; • &nbsp; 🔐 **Authentication**  
📱 **PWA** &nbsp; • &nbsp; ⚡ **Real-Time Communication** &nbsp; • &nbsp; 🗄️ **Database**

</div>

---

## 🌟 About

**Mirhaj Real Estate** is a full-stack real-estate platform created for the **Jarquyeh region of Isfahan, Iran**.

The project combines a lightweight web frontend with a Node.js backend to provide a foundation for publishing, discovering and managing real-estate listings.

The architecture is designed around a clear separation between:

- 🎨 Frontend
- ⚙️ Backend
- 🗄️ Database
- 🔐 Authentication & middleware
- ⚡ Real-time communication
- 📱 Progressive Web App capabilities

---

## ✨ Core Features

| Feature | Status |
|---|:---:|
| 🏠 Real-estate listings | ✅ |
| 🔎 Property discovery | ✅ |
| 🔐 User authentication | ✅ |
| 👤 User profiles | ✅ |
| 🖼️ Property images | ✅ |
| ⚡ Real-time communication | ✅ |
| 📱 Progressive Web App | ✅ |
| 🧩 Modular backend architecture | ✅ |
| 🌐 Responsive web interface | ✅ |
| 🗄️ Database integration | ✅ |
| 🔒 JWT-based authentication | ✅ |
| 📤 File upload handling | ✅ |

---

## 🧠 Architecture

```mermaid
flowchart TD

    U[👤 User]

    U --> F[🎨 Frontend]

    F --> P[📱 PWA Layer]
    F --> API[⚡ REST API]
    F --> WS[🔌 Socket.IO]

    API --> E[🚀 Express Server]

    E --> C[🧩 Controllers]
    E --> M[🛡️ Middleware]
    E --> R[🛣️ Routes]
    E --> UT[🔧 Utilities]

    C --> DB[🗄️ Database]

    WS --> E
