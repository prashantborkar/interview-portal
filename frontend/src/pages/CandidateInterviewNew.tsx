import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Code, Play, Clock, Trophy } from 'lucide-react';
import CodeEditor from '../components/CodeEditor';

interface SessionData {
  id: string;
  candidateName: string;
}

// Starter codes for each challenge
const STARTER_CODES = {
  'selenium-pageobject': `// DEBUGGING CHALLENGE: Page Object Pattern Bug
// SCENARIO: Login page automation is failing intermittently
// ISSUE: Tests fail with "Element not found" even though element exists
// YOUR TASK: Fix the bug(s) in this Page Object implementation

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public class LoginPage {
    private WebDriver driver;
    private WebDriverWait wait;
    
    // Locators
    private By usernameField = By.id("username");
    private By passwordField = By.id("password");
    private By loginButton = By.xpath("//button[@type='submit']");
    private By errorMessage = By.className("error-msg");
    
    public LoginPage(WebDriver driver) {
        this.driver = driver;
        // BUG 1: Missing WebDriverWait initialization
    }
    
    // BUG 2: This method doesn't wait for page to load
    public void login(String username, String password) {
        driver.findElement(usernameField).sendKeys(username);
        driver.findElement(passwordField).sendKeys(password);
        driver.findElement(loginButton).click();
    }
    
    // BUG 3: No wait condition for error message
    public String getErrorMessage() {
        return driver.findElement(errorMessage).getText();
    }
    
    public boolean isLoginButtonDisplayed() {
        return driver.findElement(loginButton).isDisplayed();
    }
}

// EXPECTED FIX:
// 1. Initialize WebDriverWait in constructor
// 2. Add explicit waits in login() method
// 3. Use ExpectedConditions.elementToBeClickable()
// 4. Add wait for error message visibility`,

  'selenium-waits': `// DEBUGGING CHALLENGE: Wait Conditions Bug
// SCENARIO: E-commerce cart page test failing randomly
// ISSUE: Test tries to interact with elements before they're ready
// YOUR TASK: Fix the wait strategy to make test stable

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public class ShoppingCartTest {
    private WebDriver driver;
    private WebDriverWait wait;
    
    public ShoppingCartTest(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }
    
    public void addProductToCart(String productId) {
        // BUG 1: Using Thread.sleep instead of explicit wait
        WebElement addButton = driver.findElement(
            By.id("add-to-cart-" + productId)
        );
        try {
            Thread.sleep(2000); // BAD PRACTICE!
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        // BUG 2: Not using elementToBeClickable wait before clicking
        addButton.click();
    }
    
    public boolean isProductInCart(String productName) {
        // BUG 3: Not waiting for cart to update
        WebElement cartItems = driver.findElement(By.id("cart-items"));
        return cartItems.getText().contains(productName);
    }
    
    public int getCartItemCount() {
        // BUG 4: Element might not be present yet
        WebElement badge = driver.findElement(By.className("cart-badge"));
        return Integer.parseInt(badge.getText());
    }
}

// EXPECTED FIX:
// 1. Replace Thread.sleep with WebDriverWait
// 2. Use ExpectedConditions.elementToBeClickable() before clicking
// 3. Wait for cart update using .textToBePresentInElement()
// 4. Add presence wait for cart badge element`,

  'selenium-locators': `// DEBUGGING CHALLENGE: Locator Strategy Bug
// SCENARIO: Form automation breaking after UI updates
// ISSUE: Tests fail when developers change HTML structure
// YOUR TASK: Fix fragile locators to be more robust

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class RegistrationFormPage {
    private WebDriver driver;
    
    public RegistrationFormPage(WebDriver driver) {
        this.driver = driver;
    }
    
    public void fillRegistrationForm(String name, String email, String phone) {
        // BUG 1: Using absolute XPath - breaks when structure changes
        WebElement nameField = driver.findElement(
            By.xpath("/html/body/div[1]/div[2]/form/div[1]/input")
        );
        nameField.sendKeys(name);
        
        // BUG 2: Using index-based locator
        WebElement emailField = driver.findElement(
            By.cssSelector("input:nth-child(2)")
        );
        emailField.sendKeys(email);
        
        // BUG 3: Using text-based XPath in English - fails in other locales
        WebElement phoneField = driver.findElement(
            By.xpath("//label[contains(text(),'Phone Number')]/following-sibling::input")
        );
        phoneField.sendKeys(phone);
    }
    
    public void submitForm() {
        // BUG 4: Using link text that might change
        WebElement submitBtn = driver.findElement(
            By.linkText("Submit Registration")
        );
        submitBtn.click();
    }
}

// EXPECTED FIX: Use stable locators like:
// - By.id("name"), By.id("email"), By.id("phone")
// - By.name("fullName"), By.name("email"), By.name("phoneNumber")
// - By.cssSelector("[data-testid='submit-button']")
// - Relative XPath: //input[@id='name'], //button[@type='submit']`
};

const CHALLENGES = [
  {
    id: 'selenium-pageobject',
    title: 'Selenium - Page Object Model',
    description: 'Fix WebDriverWait initialization and explicit waits',
    icon: '🎭'
  },
  {
    id: 'selenium-waits',
    title: 'Selenium - Waits & Synchronization',
    description: 'Replace Thread.sleep() with proper WebDriverWait',
    icon: '⏳'
  },
  {
    id: 'selenium-locators',
    title: 'Selenium - Locator Strategy',
    description: 'Fix fragile locators with stable strategies',
    icon: '🎯'
  }
];

function CandidateInterviewNew() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  
  // Store code for each challenge
  const [challengeCode, setChallengeCode] = useState<{ [key: string]: string }>({
    'selenium-pageobject': STARTER_CODES['selenium-pageobject'],
    'selenium-waits': STARTER_CODES['selenium-waits'],
    'selenium-locators': STARTER_CODES['selenium-locators']
  });
  
  // Store output for each challenge
  const [challengeOutput, setChallengeOutput] = useState<{ [key: string]: string }>({});
  const [runningChallenge, setRunningChallenge] = useState<string | null>(null);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Socket connection
  useEffect(() => {
    if (!sessionId) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    console.log('🔌 Connecting to backend:', backendUrl);
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      newSocket.emit('join-session', sessionId);
    });

    newSocket.on('session-data', (data: SessionData) => {
      setSession(data);
    });

    newSocket.on('test-results', ({ challenge, output }: { challenge: string; output: string }) => {
      console.log('Test results received for:', challenge);
      setChallengeOutput(prev => ({
        ...prev,
        [challenge]: output
      }));
      setRunningChallenge(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  // Handle code change for a specific challenge
  const handleCodeChange = (challengeId: string, newCode: string) => {
    setChallengeCode(prev => ({
      ...prev,
      [challengeId]: newCode
    }));

    // Save to localStorage
    if (sessionId) {
      localStorage.setItem(`challenge_${sessionId}_${challengeId}`, newCode);
    }

    // Notify backend
    if (socket && sessionId) {
      socket.emit('code-change', { sessionId, code: newCode, language: challengeId });
    }
  };

  // Run tests for a specific challenge
  const runTests = (challengeId: string) => {
    if (!socket || !sessionId) return;

    const code = challengeCode[challengeId];
    setRunningChallenge(challengeId);
    setChallengeOutput(prev => ({
      ...prev,
      [challengeId]: '⏳ Running tests...\n'
    }));

    console.log('Running tests for:', challengeId);
    socket.emit('execute-code', { sessionId, code, language: challengeId });
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nice-blue/5 to-white flex items-center justify-center">
        <div className="text-center">
          <Code className="w-16 h-16 text-nice-blue mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading interview session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nice-blue/5 to-white">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-nice-blue">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Code className="w-8 h-8 text-nice-blue" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  NICE Technical Assessment
                </h1>
                <p className="text-sm text-gray-600">Candidate: {session.candidateName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-nice-blue/10 px-4 py-2 rounded-lg">
                <Clock className="w-5 h-5 text-nice-blue" />
                <span className="font-mono text-lg font-bold text-nice-blue">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {CHALLENGES.map((challenge) => (
          <div key={challenge.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Challenge Header */}
            <div className="bg-gradient-to-r from-nice-blue to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{challenge.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {challenge.title}
                    </h2>
                    <p className="text-blue-100 text-sm">{challenge.description}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => runTests(challenge.id)}
                  disabled={runningChallenge === challenge.id}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                    runningChallenge === challenge.id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-white text-nice-blue hover:bg-gray-100 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>{runningChallenge === challenge.id ? 'Running...' : 'Run Tests'}</span>
                </button>
              </div>
            </div>

            {/* Code Editor and Output */}
            <div className="grid grid-cols-2 gap-4 p-4">
              {/* Code Editor */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 px-2">Code Editor</h3>
                <div className="h-96 border border-gray-200 rounded-lg overflow-hidden">
                  <CodeEditor
                    code={challengeCode[challenge.id]}
                    onChange={(newCode) => handleCodeChange(challenge.id, newCode)}
                    language={challenge.id}
                    readOnly={false}
                  />
                </div>
              </div>

              {/* Console Output */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 px-2">Test Results</h3>
                <div className="h-96 bg-gray-900 text-green-400 rounded-lg p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap border border-gray-200">
                  {challengeOutput[challenge.id] || '// Click "Run Tests" to execute test scenarios\n// Results will appear here...'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Submit Button */}
        <div className="flex justify-center py-8">
          <button
            className="bg-gradient-to-r from-nice-blue to-blue-600 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center space-x-3"
          >
            <Trophy className="w-6 h-6" />
            <span>Submit All Challenges</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CandidateInterviewNew;
