# NICE Technical Interview Platform

A beautiful, real-time technical interview platform designed for NICE Company. This application enables interviewers to monitor candidates' coding sessions in real-time with a clean, professional bright-themed interface.

## 🌟 Features

- **Real-Time Collaboration**: Watch candidates code in real-time with WebSocket synchronization
- **Monaco Code Editor**: VS Code's powerful editor with syntax highlighting
- **Beautiful Bright Theme**: Professional, clean design that impresses candidates
- **Session Management**: Create and manage multiple interview sessions
- **Shareable Links**: Generate unique URLs for candidates to join interviews
- **Multiple Problems**: Pre-configured coding challenges (Two Sum, Reverse Linked List, etc.)
- **Multi-Language Support**: JavaScript, Python, and Java

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

### Alternative: Start Separately

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📖 Usage

### For Interviewers

1. Navigate to http://localhost:3000
2. Click "Interviewer Dashboard"
3. Click "New Interview" to create a session
4. Enter candidate name and select a problem
5. Copy the generated interview link and share it with the candidate
6. Monitor the candidate's code in real-time

### For Candidates

1. Open the interview link provided by the interviewer
2. Read the problem description on the left
3. Write your solution in the code editor on the right
4. Your code is automatically saved and visible to the interviewer

## 🏗️ Project Structure

```
Technical Interview Platform/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   │   ├── CodeEditor.tsx
│   │   │   └── CodeViewer.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── InterviewerDashboard.tsx
│   │   │   └── CandidateInterview.tsx
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── nice-logo.svg   # NICE Company logo
│   └── package.json
├── backend/                 # Node.js backend
│   ├── src/
│   │   └── server.ts       # Express + Socket.io server
│   └── package.json
└── package.json            # Root package.json
```

## 🎨 Design Features

- **Bright Professional Theme**: Clean whites, sky blues, and NICE brand colors
- **NICE Branding**: Company logo prominently displayed
- **Responsive Layout**: Works on all screen sizes
- **Real-Time Indicators**: Live session status and connection indicators
- **Smooth Animations**: Professional transitions and hover effects

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - Code editor (VS Code's editor)
- **Socket.io Client** - Real-time communication
- **React Router** - Navigation
- **Vite** - Build tool and dev server
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.io** - WebSocket server
- **TypeScript** - Type safety
- **UUID** - Unique session IDs

## 📝 Available Problems

1. **Two Sum** (Easy) - Array manipulation
2. **Reverse Linked List** (Medium) - Data structures
3. **Binary Tree Traversal** (Medium) - Tree algorithms
4. **Merge Sort** (Hard) - Sorting algorithms

## 🔧 Configuration

### Port Configuration

- Frontend: Port 3000 (configurable in `frontend/vite.config.ts`)
- Backend: Port 5000 (configurable in `backend/src/server.ts`)

### CORS Settings

Update CORS origin in `backend/src/server.ts` if deploying to a different domain.

## 🌐 Deployment

### Free Hosting on Render.com

The easiest way to deploy this platform is using **Render.com** (free tier available).

**Quick Deployment:**

1. Push code to GitHub
2. Create free account on [Render.com](https://render.com)
3. Deploy backend as Web Service
4. Deploy frontend as Static Site
5. Configure environment variables
6. Share URL with candidates!

📖 **Complete deployment guide:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for step-by-step instructions.

**Other free hosting options:**
- Railway.app
- Fly.io
- Vercel (frontend) + any Node.js host (backend)

**Your deployed URLs will look like:**
- Frontend: `https://nice-interview-frontend.onrender.com`
- Backend: `https://nice-interview-backend.onrender.com`

## 📦 Build for Production

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 🎯 Key Features Explained

### Real-Time Synchronization
- Uses Socket.io for bidirectional communication
- Code changes are instantly broadcast to all connected clients
- Automatic reconnection handling

### Session Management
- Unique UUID for each interview session
- Status tracking (waiting, active, completed)
- Persistent session data during runtime

### Code Editor
- Full Monaco Editor integration
- Syntax highlighting for multiple languages
- Auto-completion and IntelliSense
- Line numbers and code formatting

## 🤝 Contributing

This is a private NICE Company project. For any improvements or bug fixes, please contact the development team.

## 📄 License

Proprietary - NICE Company

## 🆘 Support

For technical support or questions:
- Contact: IT Support Team
- Email: prashant.borkar@gmail.com

---


