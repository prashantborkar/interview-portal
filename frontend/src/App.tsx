import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InterviewerDashboard from './pages/InterviewerDashboard';
import CandidateInterview from './pages/CandidateInterview';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interviewer" element={<InterviewerDashboard />} />
        <Route path="/interview/:sessionId" element={<CandidateInterview />} />
      </Routes>
    </Router>
  );
}

export default App;
