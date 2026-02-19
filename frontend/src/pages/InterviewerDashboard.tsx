import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Copy, Plus, Eye, Clock, CheckCircle2, Users, Terminal, AlertTriangle } from 'lucide-react';
import { InterviewSession } from '../types';
import CodeEditor from '../components/CodeEditor';

interface PasteAlert {
  sessionId: string;
  candidateName: string;
  timestamp: string;
}

interface BugResult {
  bugNumber: number;
  passed: boolean;
  points: number;
}

interface TestResults {
  sessionId: string;
  candidateName: string;
  score: number;
  percentage: number;
  bugsPassed: number;
  totalBugs: number;
  completedChallenges: string[];
  bugResults: { [challenge: string]: BugResult[] };
  timeUsed: number;
  submittedAt: string;
  isAutoSubmit?: boolean;
}

function InterviewerDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [problemTitle, setProblemTitle] = useState('Selenium Debugging');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pasteAlerts, setPasteAlerts] = useState<PasteAlert[]>([]);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0); // Force re-render when tab becomes active

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('get-sessions');
    });

    newSocket.on('sessions-list', (sessionsList: InterviewSession[]) => {
      console.log('Sessions list received with', sessionsList.length, 'sessions');
      // Sessions already have adjusted timer values from backend
      setSessions(sessionsList);
    });

    newSocket.on('code-update', ({ sessionId, code, language }: { sessionId: string; code: string; language?: string }) => {
      console.log('Code update received:', sessionId, code.substring(0, 50));
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, code, ...(language && { language }) } : s)
      );
      setSelectedSession(prev => {
        if (prev?.id === sessionId) {
          return { ...prev, code, ...(language && { language }) };
        }
        return prev;
      });
    });

    newSocket.on('language-update', ({ sessionId, language }: { sessionId: string; language: string }) => {
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, language } : s)
      );
      setSelectedSession(prev => {
        if (prev?.id === sessionId) {
          return { ...prev, language };
        }
        return prev;
      });
    });

    newSocket.on('execution-update', ({ sessionId, output }: { sessionId: string; output: string; success: boolean }) => {
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, output } : s)
      );
      setSelectedSession(prev => {
        if (prev?.id === sessionId) {
          return { ...prev, output };
        }
        return prev;
      });
    });

    newSocket.on('paste-detected', ({ sessionId, candidateName, timestamp }: PasteAlert) => {
      const newAlert = { sessionId, candidateName, timestamp };
      setPasteAlerts(prev => [...prev, newAlert]);
      
      // Auto-remove alert after 10 seconds
      setTimeout(() => {
        setPasteAlerts(prev => prev.filter(alert => alert !== newAlert));
      }, 10000);
    });

    newSocket.on('candidate-test-results', (results: TestResults) => {
      console.log('✅ Candidate test results received on interviewer dashboard:', results);
      console.log('Submission type:', results.isAutoSubmit ? '⏰ AUTO-SUBMITTED (Timer expired)' : '🖱️ MANUALLY SUBMITTED');
      setTestResults(results);
      setShowResultsModal(true);
    });

    newSocket.on('timer-update', (data: { sessionId: string; isInstructionPhase: boolean; instructionTimeRemaining: number; codingTimeRemaining: number }) => {
      console.log('Timer update received:', data.sessionId, data.codingTimeRemaining);
      setSessions(prev => prev.map(session => 
        session.id === data.sessionId
          ? {
              ...session,
              isInstructionPhase: data.isInstructionPhase,
              instructionTimeRemaining: data.instructionTimeRemaining,
              codingTimeRemaining: data.codingTimeRemaining,
              lastUpdate: Date.now() // Force React re-render with timestamp
            }
          : session
      ));
    });

    newSocket.on('session-created', (session: InterviewSession) => {
      setSessions(prev => [...prev, session]);
      setShowCreateForm(false);
      setCandidateName('');
    });

    // Handle tab visibility to prevent timer from getting stuck
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became active - forcing UI refresh');
        // Force a complete re-render by updating counter
        setForceUpdateCounter(prev => prev + 1);
        // Also refresh sessions data
        setSessions(prev => prev.map(s => ({ ...s, lastUpdate: Date.now() })));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      newSocket.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const createSession = () => {
    if (!socket || !candidateName.trim()) return;
    socket.emit('create-session', { candidateName, problemTitle });
  };

  const getLanguageLabel = (lang: string) => {
    const labels: { [key: string]: string } = {
      'selenium-pageobject': 'Selenium Page Object',
      'selenium-waits': 'Selenium Waits',
      'selenium-locators': 'Selenium Locators',
      'springboot-rest': 'SpringBoot REST',
      'springboot-test': 'SpringBoot Test',
    };
    return labels[lang] || lang;
  };

  const getChallengeDisplayName = (challengeId: string) => {
    const names: { [key: string]: string } = {
      'selenium-pageobject': 'Selenium Page Object Pattern',
      'selenium-waits': 'Selenium Explicit Waits',
      'selenium-locators': 'Selenium Locator Strategies',
      'springboot-rest': 'SpringBoot REST Controller',
      'springboot-test': 'SpringBoot Unit Testing',
    };
    return names[challengeId] || challengeId;
  };

  const handleInterviewerCodeChange = (newCode: string) => {
    if (!socket || !selectedSession) return;
    
    // Update local state
    setSelectedSession(prev => prev ? { ...prev, code: newCode } : null);
    setSessions(prev => 
      prev.map(s => s.id === selectedSession.id ? { ...s, code: newCode } : s)
    );
    
    // Broadcast to all clients including candidate
    socket.emit('code-change', { 
      sessionId: selectedSession.id, 
      code: newCode, 
      language: selectedSession.language 
    });
  };

  const copyInterviewLink = (sessionId: string) => {
    const link = `${window.location.origin}/interview/${sessionId}`;
    navigator.clipboard.writeText(link);
    alert('Interview link copied to clipboard!');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'active': return <Eye className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-nice-gray">
      {/* Paste Alert Notifications */}
      {pasteAlerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {pasteAlerts.map((alert, index) => (
            <div
              key={index}
              className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 animate-pulse"
            >
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-bold">Copy-Paste Attempt Detected!</p>
                <p className="text-sm">
                  {alert.candidateName} tried to paste external code at {alert.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/nice-logo.svg" alt="NICE" className="h-10" />
            <span className="text-2xl font-bold text-nice-blue">Automation Engineer Assessment</span>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-nice-blue hover:bg-nice-blue/90 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>New Debug Challenge</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto p-6" style={{ height: 'calc(100vh - 92px)' }}>
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Sessions List */}
          <div className="col-span-4 bg-white rounded-xl shadow-md p-6 flex flex-col" style={{ height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Debug Challenge Sessions</h2>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active sessions</p>
                  <p className="text-sm text-gray-400 mt-2">Create a debug challenge to get started</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={`${session.id}-${forceUpdateCounter}-${session.lastUpdate || 0}`}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedSession?.id === session.id
                        ? 'border-nice-blue bg-nice-sky'
                        : 'border-gray-200 bg-white hover:border-nice-lightblue'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{session.candidateName}</h3>
                        <p className="text-sm text-gray-600">{session.problem}</p>
                      </div>
                      <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {getStatusIcon(session.status)}
                        <span className="capitalize">{session.status}</span>
                      </span>
                    </div>
                    
                    {/* Timer Display */}
                    {session.status === 'active' && (
                      <div className="mt-2 space-y-1">
                        {session.isInstructionPhase ? (
                          <div className="flex items-center space-x-2 text-xs">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span className="text-blue-600 font-medium">
                              Reading Instructions: {formatTime(session.instructionTimeRemaining || 0)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-xs">
                            <Clock className="w-3 h-3 text-green-600" />
                            <span className={
                              (session.codingTimeRemaining || 0) < 60 ? 'text-red-600 font-bold animate-pulse' :
                              (session.codingTimeRemaining || 0) < 300 ? 'text-yellow-600 font-medium' :
                              'text-green-600 font-medium'
                            }>
                              Coding Time: {formatTime(session.codingTimeRemaining || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyInterviewLink(session.id);
                        }}
                        className="flex items-center space-x-1 text-xs text-nice-blue hover:text-nice-lightblue font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(session);
                        }}
                        className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Code Viewer and Console */}
          <div className="col-span-8 flex flex-col gap-4" style={{ height: 'calc(100vh - 140px)' }}>
            {selectedSession ? (
              <>
                {/* Code Viewer */}
                <div className="bg-white rounded-xl shadow-md p-6 flex flex-col" style={{ height: '65%' }}>
                  <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedSession.candidateName}'s Code</h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedSession.problem}</p>
                    </div>
                    <span className="px-3 py-1 bg-nice-sky text-nice-blue rounded-lg font-medium text-sm">
                      {getLanguageLabel(selectedSession.language)}
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Live Collaboration:</strong> You can edit this code to help the candidate. Your changes sync in real-time.
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      code={selectedSession.code}
                      onChange={handleInterviewerCodeChange}
                      language={selectedSession.language}
                    />
                  </div>
                </div>

                {/* Console Output */}
                <div className="bg-white rounded-xl shadow-md p-6 flex flex-col" style={{ height: '35%' }}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Terminal className="w-5 h-5 text-nice-blue" />
                    <h3 className="text-lg font-bold text-gray-900">Console Output</h3>
                  </div>
                  <div className="bg-gray-900 text-green-400 rounded-lg p-4 flex-1 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                    {selectedSession.output || '// Waiting for candidate to run code...'}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-md">
                <div className="text-center">
                  <Eye className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Select a session to view candidate's code</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Debug Challenge Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Enter candidate name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nice-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Challenge Type
                </label>
                <select
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nice-blue focus:border-transparent"
                >
                  <option value="Selenium Debugging">Selenium Debugging Challenges</option>
                  <option value="SpringBoot Testing">SpringBoot Unit Test Challenges</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={!candidateName.trim()}
                className="flex-1 px-6 py-3 bg-nice-blue hover:bg-nice-blue/90 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && testResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-nice-blue to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">{testResults.isAutoSubmit ? '⏰' : '🏆'}</div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {testResults.isAutoSubmit ? 'Time Completed - Auto Submitted' : 'Test Submitted'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {testResults.candidateName || 'Candidate'}
                      {testResults.isAutoSubmit && ' • Timer expired'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Score Card */}
            <div className="p-8">
              {/* Main Score Display */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-6">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-nice-blue mb-2">
                    {testResults.score}<span className="text-3xl text-gray-500">/10</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-700">
                    {testResults.percentage}% Complete
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-nice-blue">{testResults.completedChallenges?.length || 0}</div>
                    <div className="text-sm text-gray-600 mt-1">Challenges Attempted</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{testResults.bugsPassed}/{testResults.totalBugs}</div>
                    <div className="text-sm text-gray-600 mt-1">Bugs Fixed</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.floor(testResults.timeUsed / 60)}:{String(testResults.timeUsed % 60).padStart(2, '0')}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Time Used</div>
                  </div>
                </div>
              </div>

              {/* Detailed Bug Breakdown */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Detailed Results</h3>
                
                {Object.entries(testResults.bugResults || {}).map(([challengeId, bugs]) => (
                  <div key={challengeId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-800">{getChallengeDisplayName(challengeId)}</h4>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {bugs.map((bug) => (
                          <div
                            key={bug.bugNumber}
                            className={`p-3 rounded-lg border-2 ${
                              bug.passed
                                ? 'border-green-500 bg-green-50'
                                : 'border-red-300 bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-gray-700">
                                BUG {bug.bugNumber}
                              </span>
                              <span className="text-lg">
                                {bug.passed ? '✅' : '❌'}
                              </span>
                            </div>
                            <div className={`text-xs font-medium ${
                              bug.passed ? 'text-green-700' : 'text-red-600'
                            }`}>
                              {bug.passed ? `+${bug.points} pts` : '0 pts'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submission Time */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Submitted at {new Date(testResults.submittedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewerDashboard;
