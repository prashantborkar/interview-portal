import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Disable SSL verification for development (only for Piston API calls)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());

interface InterviewSession {
  id: string;
  candidateName: string;
  problem: string;
  problemDescription: string;
  code: string;
  language: string;
  status: 'waiting' | 'active' | 'completed';
  output?: string;
  createdAt: Date;
}

const sessions: Map<string, InterviewSession> = new Map();

// Test result interface
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

// Analyze code for bug fixes
function analyzeDebugFixes(code: string, language: string): TestResult[] {
  const results: TestResult[] = [];

  switch (language) {
    case 'selenium-pageobject':
      // Test 1: Check for WebDriverWait initialization
      const hasWaitInit = code.includes('this.wait = new WebDriverWait') || code.includes('wait = new WebDriverWait');
      results.push({
        name: 'Test 1 (BUG 1): Fix WebDriverWait Initialization',
        passed: hasWaitInit,
        message: hasWaitInit
          ? '✅ PASS - WebDriverWait initialized in constructor'
          : '❌ FAIL - WebDriverWait object not initialized in constructor'
      });

      // Test 2: Check for explicit wait in login method - must NOT have direct driver.findElement in login method
      const loginMethodMatch = code.match(/public void login\(.*?\{[\s\S]*?\n\s*\}/);
      const loginMethodCode = loginMethodMatch ? loginMethodMatch[0] : '';
      const hasDirectFind = loginMethodCode.includes('driver.findElement');
      const hasWaitInLogin = loginMethodCode.includes('wait.until') && loginMethodCode.includes('elementToBeClickable');
      results.push({
        name: 'Test 2 (BUG 2): Fix Login Method Waits',
        passed: !hasDirectFind && hasWaitInLogin,
        message: (!hasDirectFind && hasWaitInLogin)
          ? '✅ PASS - Explicit waits added in login() method'
          : '❌ FAIL - login() method needs explicit waits before element interactions'
      });

      // Test 3: Check for error message wait - must NOT have direct driver.findElement in getErrorMessage
      const errorMethodMatch = code.match(/public String getErrorMessage\(.*?\{[\s\S]*?\n\s*\}/);
      const errorMethodCode = errorMethodMatch ? errorMethodMatch[0] : '';
      const hasDirectFindInError = errorMethodCode.includes('driver.findElement(errorMessage)');
      const hasWaitInError = errorMethodCode.includes('wait.until') && (errorMethodCode.includes('visibilityOfElementLocated') || errorMethodCode.includes('presenceOfElementLocated'));
      results.push({
        name: 'Test 3 (BUG 3): Fix Error Message Wait',
        passed: !hasDirectFindInError && hasWaitInError,
        message: (!hasDirectFindInError && hasWaitInError)
          ? '✅ PASS - Error message wait condition added'
          : '❌ FAIL - getErrorMessage() must wait for element visibility'
      });
      break;

    case 'selenium-waits':
      // Extract addProductToCart method
      const addProductMatch = code.match(/public void addProductToCart\([^)]*\)\s*\{([^}]*)\}/s);
      const addProductContent = addProductMatch ? addProductMatch[1] : '';
      
      // Test 1: Check Thread.sleep removed from addProductToCart
      const hasThreadSleepInAdd = addProductContent.includes('Thread.sleep(');
      results.push({
        name: 'Test 1 (BUG 1): Remove Thread.sleep',
        passed: !hasThreadSleepInAdd,
        message: !hasThreadSleepInAdd
          ? '✅ PASS - Thread.sleep replaced with proper waits'
          : '❌ FAIL - Thread.sleep found in addProductToCart() - replace with explicit WebDriverWait'
      });

      // Test 2: Check for elementToBeClickable wait in addProductToCart
      const hasClickableInAdd = addProductContent.includes('elementToBeClickable');
      results.push({
        name: 'Test 2 (BUG 1): Add Clickable Wait',
        passed: hasClickableInAdd,
        message: hasClickableInAdd
          ? '✅ PASS - Using elementToBeClickable() before click in addProductToCart()'
          : '❌ FAIL - addProductToCart() needs elementToBeClickable wait before interaction'
      });

      // Extract isProductInCart method
      const isProductMatch = code.match(/public boolean isProductInCart\([^)]*\)\s*\{([^}]*)\}/s);
      const isProductContent = isProductMatch ? isProductMatch[1] : '';
      
      // Test 3: Check for cart text update wait in isProductInCart
      const hasTextWaitInCart = isProductContent.includes('textToBePresentInElement');
      results.push({
        name: 'Test 3 (BUG 2): Add Cart Update Wait',
        passed: hasTextWaitInCart,
        message: hasTextWaitInCart
          ? '✅ PASS - Cart update wait condition added in isProductInCart()'
          : '❌ FAIL - isProductInCart() needs textToBePresentInElement wait for cart update'
      });

      // Extract getCartItemCount method
      const getCountMatch = code.match(/public int getCartItemCount\([^)]*\)\s*\{([^}]*)\}/s);
      const getCountContent = getCountMatch ? getCountMatch[1] : '';
      
      // Test 4: Check for badge presence wait in getCartItemCount
      const hasBadgeWaitInCount = getCountContent.includes('presenceOfElementLocated');
      results.push({
        name: 'Test 4 (BUG 3): Add Badge Presence Wait',
        passed: hasBadgeWaitInCount,
        message: hasBadgeWaitInCount
          ? '✅ PASS - Badge wait condition added in getCartItemCount()'
          : '❌ FAIL - getCartItemCount() needs presenceOfElementLocated wait for badge'
      });
      break;

    case 'selenium-locators':
      // Extract fillRegistrationForm method
      const fillFormMatch = code.match(/public void fillRegistrationForm\([^)]*\)\s*\{([^}]*)\}/s);
      const fillFormContent = fillFormMatch ? fillFormMatch[1] : '';
      
      // Test 1: Check for absolute XPath removal in fillRegistrationForm
      const hasAbsXPathInForm = fillFormContent.includes('/html/body/div[1]');
      results.push({
        name: 'Test 1 (BUG 1): Fix Absolute XPath',
        passed: !hasAbsXPathInForm,
        message: !hasAbsXPathInForm
          ? '✅ PASS - Absolute XPath removed from fillRegistrationForm()'
          : '❌ FAIL - fillRegistrationForm() has absolute XPath /html/body/... - use stable ID locator'
      });

      // Test 2: Check for index-based selectors in fillRegistrationForm
      const hasIndexInForm = fillFormContent.includes(':nth-child');
      results.push({
        name: 'Test 2 (BUG 2): Fix Index-Based Selector',
        passed: !hasIndexInForm,
        message: !hasIndexInForm
          ? '✅ PASS - Index-based selector removed from fillRegistrationForm()'
          : '❌ FAIL - fillRegistrationForm() has :nth-child selector - use ID attribute'
      });

      // Test 3: Check for text-based XPath in fillRegistrationForm
      const hasTextXPathInForm = fillFormContent.includes('contains(text(),');
      results.push({
        name: 'Test 3 (BUG 3): Fix Text-Based XPath',
        passed: !hasTextXPathInForm,
        message: !hasTextXPathInForm
          ? '✅ PASS - Text-based XPath removed from fillRegistrationForm()'
          : '❌ FAIL - fillRegistrationForm() has contains(text(),) XPath - use ID locator'
      });

      // Extract submitForm method
      const submitMatch = code.match(/public void submitForm\([^)]*\)\s*\{([^}]*)\}/s);
      const submitContent = submitMatch ? submitMatch[1] : '';
      
      // Test 4: Check for linkText locator in submitForm
      const hasLinkTextInSubmit = submitContent.includes('By.linkText');
      results.push({
        name: 'Test 4 (BUG 4): Fix LinkText Locator',
        passed: !hasLinkTextInSubmit,
        message: !hasLinkTextInSubmit
          ? '✅ PASS - LinkText replaced with stable locator in submitForm()'
          : '❌ FAIL - submitForm() uses By.linkText - use button type selector instead'
      });
      break;

    case 'springboot-rest':
      // Extract testGetUserById method
      const testMethodMatch = code.match(/public void testGetUserById\([^)]*\)\s*\{([^}]*)\}/s);
      const testMethodContent = testMethodMatch ? testMethodMatch[1] : '';
      
      // Test 1: Check for Optional.of in mock within testGetUserById
      const hasOptionalInTest = testMethodContent.includes('Optional.of(') && testMethodContent.includes('thenReturn');
      results.push({
        name: 'Test 1 (BUG 1): Fix Mock Return Type',
        passed: hasOptionalInTest,
        message: hasOptionalInTest
          ? '✅ PASS - Mock returns Optional.of(mockUser) in testGetUserById()'
          : '❌ FAIL - testGetUserById() mock should return Optional wrapper, not raw object'
      });

      // Test 2: Check for Optional<User> variable declaration in testGetUserById
      const hasOptionalTypeInTest = testMethodContent.includes('Optional<User>') && testMethodContent.match(/Optional<User>\s+\w+\s*=/) !== null;
      results.push({
        name: 'Test 2 (BUG 2): Fix Result Type Declaration',
        passed: hasOptionalTypeInTest,
        message: hasOptionalTypeInTest
          ? '✅ PASS - Result declared as Optional<User> in testGetUserById()'
          : '❌ FAIL - testGetUserById() result variable should be Optional<User>, not User'
      });

      // Test 3: Check for isPresent() check in testGetUserById
      const hasIsPresentInTest = testMethodContent.includes('result.isPresent()') && testMethodContent.includes('assertTrue');
      results.push({
        name: 'Test 3 (BUG 3): Add Optional Presence Check',
        passed: hasIsPresentInTest,
        message: hasIsPresentInTest
          ? '✅ PASS - Added assertTrue(result.isPresent()) in testGetUserById()'
          : '❌ FAIL - testGetUserById() must assert Optional is present before accessing value'
      });

      // Test 4: Check for result.get() usage in testGetUserById
      const hasGetInTest = testMethodContent.includes('result.get()');
      results.push({
        name: 'Test 4 (BUG 2 & 3): Use Optional.get() Method',
        passed: hasGetInTest,
        message: hasGetInTest
          ? '✅ PASS - Using result.get() to access value in testGetUserById()'
          : '❌ FAIL - testGetUserById() must use .get() method to extract value from Optional'
      });
      break;

    case 'springboot-test':
      // Extract setup method
      const setupMatch = code.match(/public void setup\([^)]*\)\s*\{([^}]*)\}/s);
      const setupContent = setupMatch ? setupMatch[1] : '';
      
      // Test 1: Check for MockitoAnnotations.openMocks in setup
      const hasMockInitInSetup = setupContent.includes('MockitoAnnotations.openMocks(this)');
      results.push({
        name: 'Test 1 (BUG 1): Initialize Mocks',
        passed: hasMockInitInSetup,
        message: hasMockInitInSetup
          ? '✅ PASS - MockitoAnnotations.openMocks(this) added in setup()'
          : '❌ FAIL - Mocks not initialized in setup() method'
      });

      // Extract testGetAllActiveProducts method
      const testActiveMatch = code.match(/public void testGetAllActiveProducts\([^)]*\)\s*\{([^}]*)\}/s);
      const testActiveContent = testActiveMatch ? testActiveMatch[1] : '';
      
      // Test 2: Check for findByActiveTrue() method in testGetAllActiveProducts
      const hasCorrectMethodInTest = testActiveContent.includes('findByActiveTrue()');
      results.push({
        name: 'Test 2 (BUG 2): Mock Correct Method',
        passed: hasCorrectMethodInTest,
        message: hasCorrectMethodInTest
          ? '✅ PASS - Mocking findByActiveTrue() in testGetAllActiveProducts()'
          : '❌ FAIL - testGetAllActiveProducts() should mock findByActiveTrue(), not findAll()'
      });

      // Test 3: Check mock returns only p1 and p2 in testGetAllActiveProducts
      const hasOnlyP1P2InTest = testActiveContent.includes('Arrays.asList(p1, p2)') && !testActiveContent.includes('Arrays.asList(p1, p2, p3)');
      results.push({
        name: 'Test 3 (BUG 2 & 3): Return Only Active Products',
        passed: hasOnlyP1P2InTest,
        message: hasOnlyP1P2InTest
          ? '✅ PASS - Mock returns only p1 and p2 (active products) in testGetAllActiveProducts()'
          : '❌ FAIL - testGetAllActiveProducts() mock should return only active products, not all products'
      });

      // Test 4: Check verify uses correct method in testGetAllActiveProducts
      const hasCorrectVerifyInTest = testActiveContent.includes('verify(productRepository).findByActiveTrue()');
      results.push({
        name: 'Test 4 (BUG 4): Verify Correct Method',
        passed: hasCorrectVerifyInTest,
        message: hasCorrectVerifyInTest
          ? '✅ PASS - Verifying findByActiveTrue() was called in testGetAllActiveProducts()'
          : '❌ FAIL - testGetAllActiveProducts() verify statement should match the mocked method'
      });
      break;

    default:
      results.push({
        name: 'Unknown Test',
        passed: false,
        message: 'Select a debugging challenge to see test results'
      });
  }

  return results;
}

const problems: { [key: string]: { description: string; starterCode: { [key: string]: string } } } = {
  'Selenium Debugging': {
    description: `Debugging Challenge: Find and fix bugs in Selenium WebDriver automation code.
    
Common issues include:
- Missing WebDriverWait initialization
- Using Thread.sleep instead of explicit waits
- Fragile locators (absolute XPath, index-based selectors)
- No wait conditions for dynamic elements`,
    starterCode: {
      'selenium-pageobject': `// Select debugging challenge from dropdown`,
    },
  },
  'SpringBoot Testing': {
    description: `Debugging Challenge: Fix issues in SpringBoot unit tests and mocks.
    
Common issues include:
- Missing MockitoAnnotations.openMocks()
- Incorrect Optional handling in mocks
- Wrong repository methods being mocked
- Assertion mismatches`,
    starterCode: {
      'springboot-test': `// Select debugging challenge from dropdown`,
    },
  },
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('get-sessions', () => {
    const sessionsList = Array.from(sessions.values());
    socket.emit('sessions-list', sessionsList);
  });

  socket.on('create-session', ({ candidateName, problemTitle }: { candidateName: string; problemTitle: string }) => {
    const sessionId = uuidv4();
    const problem = problems[problemTitle] || problems['Selenium Debugging'];
    
    // Load the first debugging challenge by default
    const defaultCode = `// DEBUGGING CHALLENGE: Page Object Pattern Bug
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
    
    const session: InterviewSession = {
      id: sessionId,
      candidateName,
      problem: problemTitle,
      problemDescription: problem.description,
      code: defaultCode,
      language: 'selenium-pageobject',
      status: 'waiting',
      createdAt: new Date(),
    };

    sessions.set(sessionId, session);
    io.emit('session-created', session);
    console.log('Session created:', sessionId);
  });

  socket.on('join-session', (sessionId: string) => {
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('session-not-found');
      return;
    }
    
    // Check if session is already completed/expired
    if (session.status === 'completed') {
      socket.emit('session-expired', {
        message: 'This interview session has been completed and the link is no longer valid.'
      });
      return;
    }
    
    socket.join(sessionId);
    session.status = 'active';
    socket.emit('session-data', session);
    io.emit('sessions-list', Array.from(sessions.values()));
    console.log('Candidate joined session:', sessionId);
  });

  socket.on('code-change', ({ sessionId, code, language }: { sessionId: string; code: string; language?: string }) => {
    const session = sessions.get(sessionId);
    
    if (session) {
      session.code = code;
      if (language) {
        session.language = language;
      }
      // Broadcast to all clients EXCEPT the sender to prevent cursor jumping
      socket.broadcast.emit('code-update', { sessionId, code, language: session.language });
    }
  });

  socket.on('language-change', ({ sessionId, language }: { sessionId: string; language: string }) => {
    const session = sessions.get(sessionId);
    
    if (session) {
      session.language = language;
      // Broadcast to all clients EXCEPT the sender
      socket.broadcast.emit('language-update', { sessionId, language });
    }
  });

  socket.on('execute-code', async ({ sessionId, code, language }: { sessionId: string; code: string; language: string }) => {
    try {
      let output = '';
      let success = true;

      // Debugging Test Scenarios for Automation Engineer Interview
      // Analyze the code and provide test results based on bug fixes
      
      output += `🧪 Running Test Suite for ${language}...\n`;
      output += `${'='.repeat(60)}\n\n`;

      // Check if code contains bug fixes
      const testResults = analyzeDebugFixes(code, language);
      
      testResults.forEach((test, index) => {
        output += `Test ${index + 1}: ${test.name}\n`;
        output += `${test.message}\n\n`;
      });

      const passedTests = testResults.filter(t => t.passed).length;
      const totalTests = testResults.length;
      
      output += `${'='.repeat(60)}\n`;
      output += `📊 Test Summary: ${passedTests}/${totalTests} tests passed\n`;
      
      if (passedTests === totalTests) {
        output += `\n🎉 All tests passed! Great job fixing the bugs!\n`;
        success = true;
      } else {
        output += `\n⚠️  Some tests failed. Review the bugs and try again.\n`;
        success = false;
      }

      socket.emit('execution-result', {
        sessionId,
        output: output,
        success: success,
      });

      // Store output in session and broadcast to all clients (including interviewer)
      const session = sessions.get(sessionId);
      if (session) {
        session.output = output;
        io.emit('execution-update', {
          sessionId,
          output: session.output,
          success: success,
        });
      }
    } catch (error: any) {
      let errorMessage = 'Test execution failed: ' + error.message;
      
      console.error('Execution error:', errorMessage);
      
      socket.emit('execution-result', {
        sessionId,
        output: errorMessage,
        success: false,
      });

      // Broadcast error to all clients
      io.emit('execution-update', {
        sessionId,
        output: `Error: ${error.message}`,
        success: false,
      });
    }
  });

  socket.on('paste-attempt', ({ sessionId }: { sessionId: string }) => {
    const session = sessions.get(sessionId);
    
    if (session) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`Paste attempt detected for session ${sessionId} at ${timestamp}`);
      
      // Notify all clients (especially interviewers) about the paste attempt
      io.emit('paste-detected', {
        sessionId,
        candidateName: session.candidateName,
        timestamp,
      });
    }
  });

  socket.on('test-submitted', (results: any) => {
    console.log('Test submitted for session:', results.sessionId);
    console.log('Test submission type:', results.isAutoSubmit ? 'AUTO (Timer)' : 'MANUAL (Button)');
    console.log('Score:', results.score, 'Bugs passed:', results.bugsPassed, '/', results.totalBugs);
    
    // Mark session as completed
    const session = sessions.get(results.sessionId);
    if (session) {
      session.status = 'completed';
      console.log(`Session ${results.sessionId} marked as completed and link expired`);
    }
    
    // Broadcast results to all clients (especially interviewer)
    console.log('Broadcasting results to all clients...');
    io.emit('candidate-test-results', results);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
