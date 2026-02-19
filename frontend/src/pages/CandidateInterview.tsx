import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Code, AlertCircle, Play, Terminal, AlertTriangle, Clock, Trophy } from 'lucide-react';
import CodeEditor from '../components/CodeEditor';

interface SessionData {
  id: string;
  candidateName: string;
  problem: string;
  problemDescription: string;
  code: string;
  language: string;
}

function CandidateInterview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('selenium-pageobject');
  // Store code for each challenge separately
  const [challengeCode, setChallengeCode] = useState<{ [key: string]: string }>({});
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [pasteWarning, setPasteWarning] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const internalClipboard = useRef<string>('');
  const lastCopyTime = useRef<number>(0);
  
  // Helper function to get challenge display name
  const getLanguageLabel = (lang: string): string => {
    const labels: { [key: string]: string } = {
      'selenium-pageobject': '🎭 Selenium - Page Object Model',
      'selenium-waits': '⏳ Selenium - Waits & Synchronization',
      'selenium-locators': '🎯 Selenium - Locator Strategy',
      'springboot-rest': '🌱 SpringBoot - REST API Mock',
      'springboot-test': '✅ SpringBoot - Unit Test'
    };
    return labels[lang] || lang;
  };
  
  // Timer and scoring state
  const [isInstructionPhase, setIsInstructionPhase] = useState(true); // New: instruction reading phase
  const [instructionTimeRemaining, setInstructionTimeRemaining] = useState(60); // 1 minute for instructions
  const [showCodingStartNotification, setShowCodingStartNotification] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Individual bug tracking
  interface BugResult {
    bugNumber: number;
    passed: boolean;
    points: number;
  }
  const [bugResults, setBugResults] = useState<{ [challenge: string]: BugResult[] }>({});
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join-session', sessionId);
    });

    newSocket.on('session-data', (data: SessionData) => {
      setSession(data);
      
      // Set the language first
      const currentLanguage = data.language || 'selenium-pageobject';
      setLanguage(currentLanguage);
      
      // Check if session has existing code (from previous work or interviewer edits)
      if (data.code && data.code !== '// Select a debugging challenge from the dropdown above') {
        // Load existing code from session (persisted state)
        setCode(data.code);
      } else {
        // New session - load the debugging challenge
        setTimeout(() => {
          // Get the buggy code for this challenge
          const event = { target: { value: currentLanguage } } as React.ChangeEvent<HTMLSelectElement>;
          const changeHandler = (e: React.ChangeEvent<HTMLSelectElement>) => {
            handleLanguageChange(e.target.value);
          };
          changeHandler(event);
        }, 100);
      }
    });

    newSocket.on('session-not-found', () => {
      setError('Interview session not found. Please check your link.');
    });

    newSocket.on('session-expired', ({ message }: { message: string }) => {
      setError(message);
      setIsTestSubmitted(true); // Disable all interactions
    });

    newSocket.on('code-update', ({ code: updatedCode, language: updatedLanguage }: { code: string; language?: string }) => {
      // This fires when interviewer or another source updates code
      setCode(updatedCode);
      
      if (updatedLanguage) {
        setLanguage(updatedLanguage);
      }
    });

    newSocket.on('execution-result', ({ output, success }: { output: string; success: boolean }) => {
      setOutput(output);
      setIsRunning(false);
      
      // Parse individual bug results from output
      const bugTestResults: BugResult[] = [];
      const testLines = output.split('\n');
      
      testLines.forEach((line, index) => {
        // Match test name line like "Test 1: Test 1 (BUG 1): Fix WebDriverWait Initialization"
        const testNameMatch = line.match(/Test \d+: Test (\d+) \(BUG (\d+)\):/);
        if (testNameMatch) {
          const bugNumber = Number.parseInt(testNameMatch[2]);
          
          // Check the next line for PASS/FAIL status
          const nextLine = testLines[index + 1] || '';
          const passed = nextLine.includes('✅ PASS');
          const bugPoints = passed ? 2.5 : 0;
          
          bugTestResults.push({
            bugNumber,
            passed,
            points: bugPoints
          });
        }
      });
      
      // Update bug results for current challenge
      if (bugTestResults.length > 0) {
        setBugResults(prev => {
          const updatedResults = {
            ...prev,
            [language]: bugTestResults
          };
          
          // Calculate total points across all challenges with updated results
          const total = Object.values(updatedResults).flat().reduce((sum, bug) => sum + bug.points, 0);
          // Cap at 10 points maximum
          const cappedTotal = Math.min(total, 10);
          setTotalPoints(cappedTotal);
          
          return updatedResults;
        });
      }
      
      // Check if all tests passed for current challenge
      if (success && output.includes('All tests passed')) {
        setCompletedChallenges(prev => new Set(prev).add(language));
      }
    });

    return () => {
      newSocket.close();
    };
  }, [sessionId, language]);

  // Timer countdown effect
  useEffect(() => {
    if (isTestSubmitted) return;
    
    timerRef.current = setInterval(() => {
      if (isInstructionPhase) {
        // Instruction phase: countdown from 1 minute
        setInstructionTimeRemaining(prev => {
          const newTime = prev <= 1 ? 0 : prev - 1;
          
          // Broadcast timer update to interviewer - more frequently during instruction
          if (socket && sessionId) {
            socket.emit('timer-update', {
              sessionId,
              isInstructionPhase: true,
              instructionTimeRemaining: newTime,
              codingTimeRemaining: 15 * 60
            });
          }
          
          if (prev <= 1) {
            setIsInstructionPhase(false); // Switch to coding phase
            setShowCodingStartNotification(true);
            // Hide notification after 5 seconds
            setTimeout(() => setShowCodingStartNotification(false), 5000);
            return 0;
          }
          return prev - 1;
        });
      } else {
        // Coding phase: countdown from 15 minutes
        setTimeRemaining(prev => {
          const newTime = prev <= 1 ? 0 : prev - 1;
          
          // Broadcast timer update - always send to prevent stuck timer
          if (socket && sessionId) {
            socket.emit('timer-update', {
              sessionId,
              isInstructionPhase: false,
              instructionTimeRemaining: 0,
              codingTimeRemaining: newTime
            });
          }
          
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTestSubmitted, isInstructionPhase]);

  // Block paste from external sources, allow internal copy-paste
  useEffect(() => {
    const handleCopy = () => {
      // Track internal copy operations
      const selection = window.getSelection()?.toString();
      if (selection) {
        internalClipboard.current = selection;
        lastCopyTime.current = Date.now();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text') || '';
      const timeSinceLastCopy = Date.now() - lastCopyTime.current;
      
      // Allow paste if:
      // 1. It matches internal clipboard AND
      // 2. Was copied within last 60 seconds (to prevent stale internal clipboard)
      const isInternalPaste = 
        pastedText === internalClipboard.current && 
        timeSinceLastCopy < 60000;
      
      if (!isInternalPaste) {
        // Block external paste
        e.preventDefault();
        
        // Show warning to candidate
        setPasteWarning(true);
        setTimeout(() => setPasteWarning(false), 5000);

        // Notify interviewer
        if (socket && sessionId) {
          socket.emit('paste-attempt', { sessionId });
        }
      }
      // If internal paste, allow it to proceed normally
    };

    const editorElement = editorContainerRef.current;
    if (editorElement) {
      editorElement.addEventListener('copy', handleCopy);
      editorElement.addEventListener('paste', handlePaste);
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener('copy', handleCopy);
        editorElement.removeEventListener('paste', handlePaste);
      }
    };
  }, [socket, sessionId]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    // Save code for current challenge
    setChallengeCode(prev => ({
      ...prev,
      [language]: newCode
    }));
    if (socket && sessionId) {
      console.log('Sending code update:', newCode.substring(0, 50));
      socket.emit('code-change', { sessionId, code: newCode, language });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    // If clicking the same tab, do nothing
    if (language === newLanguage) {
      console.log('Already on', newLanguage, '- no switch needed');
      return;
    }
    
    console.log('=== SWITCHING CHALLENGE ===');
    console.log('From:', language, 'To:', newLanguage);
    console.log('Existing challenges:', Object.keys(challengeCode));
    
    // Check if we already have code for this challenge
    if (challengeCode[newLanguage]) {
      console.log('Restoring saved code for', newLanguage);
      console.log('Saved code length:', challengeCode[newLanguage].length);
      // Restore previously written code - update both states immediately
      setLanguage(newLanguage);
      setCode(challengeCode[newLanguage]);
      
      if (socket && sessionId) {
        socket.emit('language-change', { sessionId, language: newLanguage });
        // Emit the saved code so interviewer sees it too
        socket.emit('code-change', { sessionId, code: challengeCode[newLanguage], language: newLanguage });
      }
      return;
    }
    
    console.log('Loading fresh starter code for', newLanguage);
    // First time loading this challenge - load starter code
    setLanguage(newLanguage);
    
    // Emit language change to backend
    if (socket && sessionId) {
      socket.emit('language-change', { sessionId, language: newLanguage });
    }

    // Set debugging challenges with intentional bugs
    let starterCode = '';
    switch (newLanguage) {
      case 'selenium-pageobject':
        starterCode = `// DEBUGGING CHALLENGE: Page Object Pattern Bug
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
// 4. Add wait for error message visibility`;
        break;

      case 'selenium-waits':
        starterCode = `// DEBUGGING CHALLENGE: Wait Conditions Bug
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
// 4. Add presence wait for cart badge element`;
        break;

      case 'selenium-locators':
        starterCode = `// DEBUGGING CHALLENGE: Locator Strategy Bug
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
// - Relative XPath: //input[@id='name'], //button[@type='submit']`;
        break;

      case 'springboot-rest':
        starterCode = `// DEBUGGING CHALLENGE: REST API Mock Bug
// SCENARIO: Unit test for User Service failing
// ISSUE: Mock not configured correctly, test returns null
// YOUR TASK: Fix the mock setup and assertions

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;

public class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService;
    
    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }
    
    @Test
    public void testGetUserById() {
        // BUG 1: Mock not returning Optional - should wrap in Optional.of()
        User mockUser = new User(1L, "John Doe", "john@example.com");
        when(userRepository.findById(1L)).thenReturn(mockUser);
        
        // BUG 2: Service returns Optional<User> but test expects User
        User result = userService.getUserById(1L);
        
        // BUG 3: Assertion will fail due to incorrect mock setup
        assertNotNull(result);
        assertEquals("John Doe", result.getName());
        verify(userRepository, times(1)).findById(1L);
    }
}

class User {
    private Long id;
    private String name;
    private String email;
    
    public User(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
    
    public String getName() { return name; }
}

// EXPECTED FIX:
// 1. Wrap mock return in Optional
// 2. Change result type to Optional
// 3. Check if Optional has value before accessing
// 4. Use Optional method to get value`;
        break;

      case 'springboot-test':
        starterCode = `// DEBUGGING CHALLENGE: SpringBoot Unit Test Bug
// SCENARIO: Service layer test with multiple issues
// ISSUE: Mock setup incorrect, wrong method verified
// YOUR TASK: Fix initialization and mock behavior

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.MockitoAnnotations;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Arrays;
import java.util.List;

public class ProductServiceTest {
    
    @Mock
    private ProductRepository productRepository;
    
    @InjectMocks
    private ProductService productService;
    
    @BeforeEach
    public void setup() {
        // BUG 1: Missing MockitoAnnotations.openMocks(this)
    }
    
    @Test
    public void testGetAllActiveProducts() {
        // Mock data
        Product p1 = new Product(1L, "Laptop", true);
        Product p2 = new Product(2L, "Phone", true);
        Product p3 = new Product(3L, "Tablet", false);
        
        // BUG 2: Mock returns all products, not filtered
        when(productRepository.findAll())
            .thenReturn(Arrays.asList(p1, p2, p3));
        
        List<Product> activeProducts = productService.getActiveProducts();
        
        // BUG 3: Assertion expects 2 but mock returns 3
        assertEquals(2, activeProducts.size());
        
        // BUG 4: Verify called on wrong method
        verify(productRepository).findByActiveTrue();
    }
}

class Product {
    private Long id;
    private String name;
    private boolean active;
    
    public Product(Long id, String name, boolean active) {
        this.id = id;
        this.name = name;
        this.active = active;
    }
    
    public boolean isActive() { return active; }
}

// EXPECTED FIX:
// 1. Initialize mocks in setup method
// 2. Mock the correct repository method for active products
// 3. Return only active products (2 items)
// 4. Verify the correct method was called`;
        break;

      default:
        starterCode = '// Select a debugging challenge from the dropdown above';
    }
    
    // Update code in state and editor
    setCode(starterCode);
    console.log('Starter code loaded, length:', starterCode.length);
    // Save starter code to challenge-specific storage
    setChallengeCode(prev => {
      const updated = {
        ...prev,
        [newLanguage]: starterCode
      };
      console.log('Saved challenges:', Object.keys(updated));
      return updated;
    });
    
    // Emit to backend so it syncs with interviewer
    if (socket && sessionId) {
      socket.emit('code-change', { sessionId, code: starterCode, language: newLanguage });
    }
  };

  const runCode = () => {
    if (!socket || !sessionId) {
      console.error('Socket or sessionId not available');
      return;
    }
    
    // CRITICAL: Ensure we're using the correct code for current language
    const currentCode = challengeCode[language] || code;
    
    setIsRunning(true);
    setOutput('⏳ Running test suite...\n');

    console.log('=== RUNNING TESTS ===' );
    console.log('Current language:', language);
    console.log('Code state length:', code.length);
    console.log('Challenge code length:', challengeCode[language]?.length || 0);
    console.log('Using code length:', currentCode.length);
    console.log('Code preview (first 200 chars):', currentCode.substring(0, 200));
    console.log('Code contains "BUG 1"?:', currentCode.includes('BUG 1'));
    console.log('Code contains "BUG 2"?:', currentCode.includes('BUG 2'));
    console.log('Code contains "Optional.of"?:', currentCode.includes('Optional.of'));
    console.log('Code contains "MockitoAnnotations.openMocks"?:', currentCode.includes('MockitoAnnotations.openMocks'));
    console.log('Challenge code stored:', Object.keys(challengeCode));
    
    // Send CURRENT CHALLENGE CODE to backend for test execution
    socket.emit('execute-code', { sessionId, code: currentCode, language });
  };

  const handleSubmitTest = () => {
    // Send results to interviewer BEFORE changing state
    if (socket && sessionId) {
      const { score, percentage, bugsPassed, totalBugs } = calculateScore();
      console.log('Submitting test results to interviewer:', { score, percentage, bugsPassed, totalBugs });
      socket.emit('test-submitted', {
        sessionId,
        candidateName: session?.candidateName,
        score,
        percentage,
        bugsPassed,
        totalBugs,
        completedChallenges: Array.from(completedChallenges),
        bugResults,
        timeUsed: 15 * 60 - timeRemaining,
        submittedAt: new Date().toISOString(),
        isAutoSubmit: timeRemaining === 0 // Flag to indicate if this was auto-submitted
      });
    }
    
    setIsTestSubmitted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = (): { score: number; percentage: number; bugsPassed: number; totalBugs: number } => {
    // Calculate from individual bug results
    const allBugs = Object.values(bugResults).flat();
    const bugsPassed = allBugs.filter(b => b.passed).length;
    const totalBugs = allBugs.length;
    
    // Round total points to 1 decimal and cap at 10
    const rawScore = Math.round(totalPoints * 10) / 10;
    const score = Math.min(rawScore, 10);
    const percentage = Math.round((score / 10) * 100);
    
    return { score, percentage, bugsPassed, totalBugs };
  };

  // Results screen
  if (isTestSubmitted) {
    const { score, percentage, bugsPassed, totalBugs } = calculateScore();
    const completed = completedChallenges.size;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mb-6">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Thank You for Your Valuable Time!
              </h1>
              <p className="text-gray-600">NICE Actimize Technical Assessment</p>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-8 mb-6">
              <h2 className="text-5xl font-bold mb-2">{score}/10</h2>
              <p className="text-xl opacity-90">{percentage}% Score</p>
              <p className="text-sm opacity-75 mt-2">{bugsPassed} bugs fixed out of {totalBugs} attempted</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Challenges Completed</p>
                <p className="text-3xl font-bold text-blue-600">{completed}/2</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Bugs Fixed</p>
                <p className="text-3xl font-bold text-purple-600">{bugsPassed}/{totalBugs}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Time Used</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatTime(15 * 60 - timeRemaining)}
                </p>
              </div>
            </div>

            {Object.keys(bugResults).length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">📊 Detailed Bug Results:</h3>
                <div className="space-y-3 text-left">
                  {Object.entries(bugResults).map(([challenge, bugs]) => (
                    <div key={challenge} className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-semibold text-sm text-gray-700 mb-2">
                        {challenge.replace('selenium-', 'Selenium ').replace('springboot-', 'SpringBoot ').replace(/-/g, ' ')}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {bugs.map((bug) => (
                          <div
                            key={bug.bugNumber}
                            className={`text-center p-2 rounded ${
                              bug.passed
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            <div className="text-xs font-semibold">BUG {bug.bugNumber}</div>
                            <div className="text-lg font-bold">{bug.passed ? '✓' : '✗'}</div>
                            <div className="text-xs">{bug.points}pts</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Performance Summary:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Candidate:</strong> {session?.candidateName}</li>
                <li>• <strong>Session ID:</strong> {sessionId?.substring(0, 8)}</li>
                <li>• <strong>Total Time:</strong> 15 minutes</li>
                <li>• <strong>Final Score:</strong> {score} out of 10 points</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Your results have been saved. The interviewer will review your submission.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isExpired = error.includes('completed') || error.includes('expired');
    return (
      <div className="min-h-screen bg-nice-gray flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <AlertCircle className={`w-16 h-16 ${isExpired ? 'text-orange-500' : 'text-red-500'} mx-auto mb-4`} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? 'Session Expired' : 'Session Not Found'}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {isExpired && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                ℹ️ This interview has already been completed. The session link has been deactivated for security purposes.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-nice-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-nice-blue mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nice-gray flex flex-col">
      {/* Paste Warning Banner */}
      {pasteWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-bold">Copy-Paste Blocked!</p>
              <p className="text-sm">External copying is not allowed. Interviewer has been notified.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/nice-logo.svg" alt="NICE" className="h-10" />
              <div>
                <span className="text-2xl font-bold text-nice-blue block">Technical Interview</span>
                <span className="text-sm text-gray-600">Welcome, {session.candidateName}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Timer Display */}
              {isInstructionPhase ? (
                // Instruction Phase Timer
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg bg-blue-500 text-white">
                  <AlertCircle className="w-5 h-5" />
                  <span>Read Instructions: {formatTime(instructionTimeRemaining)}</span>
                </div>
              ) : (
                // Coding Phase Timer
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${
                  timeRemaining < 60 ? 'bg-red-500 text-white animate-pulse' : 
                  timeRemaining < 300 ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              )}
              {/* Submit Test Button */}
              <button
                onClick={handleSubmitTest}
                disabled={isInstructionPhase}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Test
              </button>
              <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-medium">Live Session</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Coding Start Notification */}
      {showCodingStartNotification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <Play className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg">Coding Phase Started!</h3>
              <p className="text-sm">You can now edit code and run tests. Good luck! 🚀</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-[1920px] w-full mx-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Debugging Challenge Overview */}
          <div className="col-span-4 bg-white rounded-xl shadow-md p-6 overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Debugging Challenge</h2>
            </div>
            
            {/* Progress Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 mb-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Your Live Score</span>
                <span className="text-3xl font-bold text-blue-600 transition-all duration-300">
                  {totalPoints.toFixed(1)}<span className="text-lg text-gray-500">/10</span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 ease-out shadow-md"
                  style={{ width: `${(totalPoints / 10) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-green-700">
                  ✓ {Object.values(bugResults).flat().filter(b => b.passed).length} bugs fixed
                </span>
                <span className="text-gray-600">💎 Each bug = 2.5 pts</span>
              </div>
              {totalPoints > 0 && (
                <div className="mt-2 text-center">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    🎉 Keep going! You're making progress!
                  </span>
                </div>
              )}
            </div>
            
            {/* Current Challenge Progress */}
            {bugResults[language] && bugResults[language].length > 0 && (
              <div className="bg-white border border-purple-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Challenge Progress</h3>
                <div className="grid grid-cols-4 gap-2">
                  {bugResults[language].map((bug) => (
                    <div
                      key={bug.bugNumber}
                      className={`text-center p-2 rounded transition-all ${
                        bug.passed
                          ? 'bg-green-100 text-green-800 border-2 border-green-500 shadow-sm'
                          : 'bg-gray-100 text-gray-500 border border-gray-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">BUG {bug.bugNumber}</div>
                      <div className="text-2xl font-bold">{bug.passed ? '✓' : '○'}</div>
                      <div className="text-xs font-semibold">{bug.passed ? '+2.5' : '0'} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-6">
              <p className="text-sm font-bold text-orange-800 mb-2">🎯 Your Mission</p>
              <p className="text-gray-800 font-medium">
                Find and fix bugs in Selenium WebDriver and SpringBoot test automation code.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Available Challenges
                </h3>
                <div className="space-y-3 text-sm">
                  <div 
                    onClick={() => !isInstructionPhase && handleLanguageChange('selenium-pageobject')}
                    className={`p-3 rounded border cursor-pointer transition-all hover:shadow-md ${
                    language === 'selenium-pageobject' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' :
                    completedChallenges.has('selenium-pageobject') 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-white border-blue-200 hover:border-blue-400'
                  } ${isInstructionPhase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <p className="font-bold text-blue-900 flex items-center justify-between">
                      <span>🔍 Selenium - Page Object Bug</span>
                      {completedChallenges.has('selenium-pageobject') && <span className="text-green-600 text-lg">✓</span>}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs">Fix missing WebDriverWait and explicit wait conditions</p>
                    {bugResults['selenium-pageobject'] && (
                      <div className="flex gap-1 mt-2">
                        {bugResults['selenium-pageobject'].map((bug) => (
                          <span
                            key={bug.bugNumber}
                            className={`text-xs px-2 py-1 rounded ${
                              bug.passed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            B{bug.bugNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div 
                    onClick={() => !isInstructionPhase && handleLanguageChange('selenium-waits')}
                    className={`p-3 rounded border cursor-pointer transition-all hover:shadow-md ${
                    language === 'selenium-waits' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' :
                    completedChallenges.has('selenium-waits') 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-white border-blue-200 hover:border-blue-400'
                  } ${isInstructionPhase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <p className="font-bold text-blue-900 flex items-center justify-between">
                      <span>⏱️ Selenium - Wait Conditions</span>
                      {completedChallenges.has('selenium-waits') && <span className="text-green-600 text-lg">✓</span>}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs">Replace Thread.sleep with proper ExpectedConditions</p>
                    {bugResults['selenium-waits'] && (
                      <div className="flex gap-1 mt-2">
                        {bugResults['selenium-waits'].map((bug) => (
                          <span
                            key={bug.bugNumber}
                            className={`text-xs px-2 py-1 rounded ${
                              bug.passed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            B{bug.bugNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div 
                    onClick={() => !isInstructionPhase && handleLanguageChange('selenium-locators')}
                    className={`p-3 rounded border cursor-pointer transition-all hover:shadow-md ${
                    language === 'selenium-locators' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' :
                    completedChallenges.has('selenium-locators') 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-white border-blue-200 hover:border-blue-400'
                  } ${isInstructionPhase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <p className="font-bold text-blue-900 flex items-center justify-between">
                      <span>🎯 Selenium - Locator Strategy</span>
                      {completedChallenges.has('selenium-locators') && <span className="text-green-600 text-lg">✓</span>}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs">Fix fragile XPath and use stable locators</p>
                    {bugResults['selenium-locators'] && (
                      <div className="flex gap-1 mt-2">
                        {bugResults['selenium-locators'].map((bug) => (
                          <span
                            key={bug.bugNumber}
                            className={`text-xs px-2 py-1 rounded ${
                              bug.passed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            B{bug.bugNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div 
                    onClick={() => !isInstructionPhase && handleLanguageChange('springboot-rest')}
                    className={`p-3 rounded border cursor-pointer transition-all hover:shadow-md ${
                    language === 'springboot-rest' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' :
                    completedChallenges.has('springboot-rest') 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-white border-blue-200 hover:border-blue-400'
                  } ${isInstructionPhase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <p className="font-bold text-blue-900 flex items-center justify-between">
                      <span>🌱 SpringBoot - REST API Mock</span>
                      {completedChallenges.has('springboot-rest') && <span className="text-green-600 text-lg">✓</span>}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs">Correct Optional handling in Mockito mocks</p>
                    {bugResults['springboot-rest'] && (
                      <div className="flex gap-1 mt-2">
                        {bugResults['springboot-rest'].map((bug) => (
                          <span
                            key={bug.bugNumber}
                            className={`text-xs px-2 py-1 rounded ${
                              bug.passed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            B{bug.bugNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div 
                    onClick={() => !isInstructionPhase && handleLanguageChange('springboot-test')}
                    className={`p-3 rounded border cursor-pointer transition-all hover:shadow-md ${
                    language === 'springboot-test' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' :
                    completedChallenges.has('springboot-test') 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-white border-blue-200 hover:border-blue-400'
                  } ${isInstructionPhase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <p className="font-bold text-blue-900 flex items-center justify-between">
                      <span>✅ SpringBoot - Unit Test</span>
                      {completedChallenges.has('springboot-test') && <span className="text-green-600 text-lg">✓</span>}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs">Fix mock initialization and method verification</p>
                    {bugResults['springboot-test'] && (
                      <div className="flex gap-1 mt-2">
                        {bugResults['springboot-test'].map((bug) => (
                          <span
                            key={bug.bugNumber}
                            className={`text-xs px-2 py-1 rounded ${
                              bug.passed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            B{bug.bugNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">📝 Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li><strong>Click a challenge</strong> from the list above to load its code</li>
                  <li>Read the code comments - they explain the bugs</li>
                  <li>Identify all issues (usually 2-4 bugs per challenge)</li>
                  <li>Fix the bugs in the code editor</li>
                  <li>Click "Run Tests" to validate your fixes</li>
                  <li>All tests must pass to complete the challenge</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Pro Tip:</strong> Look for patterns like missing waits, Thread.sleep, absolute XPath, missing Optional wrappers, or uninitialized mocks.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>🚫 Anti-Cheat:</strong> External copy-paste is blocked. You can copy within the editor, but pasting from outside will alert the interviewer.
                </p>
              </div>
            </div>
          </div>

          {/* Code Editor and Console */}
          <div className="col-span-8 flex flex-col gap-4">
            {/* Code Editor Section */}
            <div className="bg-white rounded-xl shadow-md p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Debug & Fix</h3>
                  <p className="text-sm text-gray-600 mt-1">Find bugs, fix issues, run tests to validate</p>
                </div>
                
                {/* Instruction Phase Banner */}
                {isInstructionPhase && (
                  <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-blue-900 text-lg">Instruction Reading Phase</h3>
                        <p className="text-blue-800 text-sm mt-1">
                          Please read the debugging challenge description carefully. 
                          Code editor and testing will be enabled in <span className="font-bold">{formatTime(instructionTimeRemaining)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-bold text-gray-800">
                    {getLanguageLabel(language)}
                  </div>
                  <button
                    onClick={runCode}
                    disabled={isRunning || isInstructionPhase}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    <span>{isRunning ? 'Running Tests...' : 'Run Tests'}</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0" ref={editorContainerRef}>
                <CodeEditor
                  code={code}
                  onChange={handleCodeChange}
                  language={language}
                  readOnly={isInstructionPhase}
                />
              </div>
            </div>

            {/* Console Output Section */}
            <div className="bg-white rounded-xl shadow-md p-6 h-64">
              <div className="flex items-center space-x-2 mb-3">
                <Terminal className="w-5 h-5 text-nice-blue" />
                <h3 className="text-lg font-bold text-gray-900">Console Output</h3>
              </div>
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-[calc(100%-44px)] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                {output || '// Click "Run Tests" to execute test scenarios and see results here...\n// Test results will show PASS/FAIL status for each test case'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidateInterview;
