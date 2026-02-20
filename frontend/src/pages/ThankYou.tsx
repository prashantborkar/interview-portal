import { useEffect } from 'react';
import { Trophy, CheckCircle, Clock, Target } from 'lucide-react';

function ThankYou() {
  // Prevent navigation away from this page
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', '/thank-you');
    };

    window.history.pushState(null, '', '/thank-you');
    window.addEventListener('popstate', handlePopState);

    // Prevent going to other pages by typing in URL bar
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Thank you for completing the interview!';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with Animation */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                  <Trophy className="w-16 h-16 text-white animate-bounce" />
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-2">Test Submitted Successfully! 🎉</h1>
              <p className="text-green-100 text-lg">Thank you for completing the NICE Actimize assessment</p>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-8 space-y-6">
            {/* Success Message */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Interview is Complete</h2>
              <p className="text-gray-600 text-lg">
                Your test results have been submitted to the interviewer for review.
              </p>
            </div>

            {/* Information Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-start space-x-3">
                  <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">What Happens Next?</h3>
                    <p className="text-sm text-gray-600">
                      Our team will review your submission and contact you within 3-5 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-start space-x-3">
                  <Target className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Your Performance</h3>
                    <p className="text-sm text-gray-600">
                      Your scorecard has been sent to the interview panel for evaluation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-1">Please Note</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• This window can now be safely closed</li>
                    <li>• You will receive an email confirmation shortly</li>
                    <li>• Check your spam folder if you don't see our email</li>
                    <li>• The interview link has expired and cannot be reused</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm mb-2">
                Thank you for your interest in NICE Actimize
              </p>
              <p className="text-gray-400 text-xs">
                © {new Date().getFullYear()} NICE Actimize. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Questions about your interview? Contact us at{' '}
            <a href="mailto:recruitment@nice.com" className="text-blue-600 hover:underline font-medium">
              recruitment@nice.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ThankYou;
