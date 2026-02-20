import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Code, Users, Sparkles } from 'lucide-react';

function Home() {
  const navigate = useNavigate();

  // Security: Prevent candidates from accessing this page
  useEffect(() => {
    const candidateSession = localStorage.getItem('candidateSession');
    const sessionTime = localStorage.getItem('candidateSessionTime');
    
    if (candidateSession && sessionTime) {
      // Check if session is still active (within 2 hours)
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      const isSessionActive = (Date.now() - parseInt(sessionTime)) < twoHoursInMs;
      
      if (isSessionActive) {
        // Redirect candidate back to their interview
        alert('⛔ Access Denied: You are a candidate in an active interview session. Please complete your test.');
        navigate(`/interview/${candidateSession}`, { replace: true });
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-nice-sky via-white to-nice-gray">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <img src="/nice-logo.svg" alt="NICE" className="h-10" />
            <span className="text-2xl font-bold text-nice-blue">Technical Interview Platform</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-nice-blue/10 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-5 h-5 text-nice-blue" />
            <span className="text-nice-blue font-semibold">Specialist Automation Engineer Assessment</span>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Welcome to NICE
            <br />
            <span className="text-nice-blue">Actimize Platform</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Debugging challenge platform for Automation Engineers. Test your skills in Java, Selenium, and SpringBoot with real-world bug scenarios.
          </p>

          {/* CTA Buttons */}
          <div className="flex justify-center gap-6">
            <button
              onClick={() => navigate('/interviewer')}
              className="group flex items-center space-x-3 bg-nice-blue hover:bg-nice-blue/90 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Users className="w-6 h-6" />
              <span>Interviewer Dashboard</span>
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200">
            <div className="w-14 h-14 bg-nice-sky rounded-xl flex items-center justify-center mb-4">
              <Code className="w-8 h-8 text-nice-blue" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Debugging Challenges</h3>
            <p className="text-gray-600">
              Find and fix bugs in Selenium Page Objects, Wait Conditions, Locators, and SpringBoot mocks.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200">
            <div className="w-14 h-14 bg-nice-sky rounded-xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-nice-blue" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Monitoring</h3>
            <p className="text-gray-600">
              Interviewers see code changes and test results in real-time as candidates debug.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200">
            <div className="w-14 h-14 bg-nice-sky rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-nice-blue" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Testing</h3>
            <p className="text-gray-600">
              Run tests instantly to verify bug fixes. Get immediate pass/fail feedback.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
