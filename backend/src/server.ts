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
  isInstructionPhase?: boolean;
  instructionTimeRemaining?: number;
  codingTimeRemaining?: number;
  lastTimerUpdate?: number; // Unix timestamp in milliseconds
}

const sessions: Map<string, InterviewSession> = new Map();

// Helper function to calculate adjusted timer values based on elapsed time
function getSessionWithAdjustedTimer(session: InterviewSession): InterviewSession {
  if (!session.lastTimerUpdate) {
    // No previous update, return as-is
    return session;
  }
  
  const elapsedSeconds = Math.floor((Date.now() - session.lastTimerUpdate) / 1000);
  
  if (elapsedSeconds <= 0) {
    return session;
  }
  
  let adjustedInstructionTime = session.instructionTimeRemaining ?? 60;
  let adjustedCodingTime = session.codingTimeRemaining ?? 900;
  
  if (session.isInstructionPhase) {
    adjustedInstructionTime = Math.max(0, (session.instructionTimeRemaining ?? 60) - elapsedSeconds);
  } else {
    adjustedCodingTime = Math.max(0, (session.codingTimeRemaining ?? 900) - elapsedSeconds);
  }
  
  return {
    ...session,
    instructionTimeRemaining: adjustedInstructionTime,
    codingTimeRemaining: adjustedCodingTime
  };
}

// Test result interface
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

// Analyze code for bug fixes
function analyzeDebugFixes(code: string, language: string): TestResult[] {
  const results: TestResult[] = [];

  // Handle Selenium Senior Automation Engineer Challenge - 10 bugs
  if (language === 'selenium-senior') {
    // === SCENARIO 1: Login & Authentication (3 bugs) ===
    
    // BUG 1: Check for WebDriverWait initialization in SecureLoginPage constructor
    const hasWaitInit = code.match(/public\s+SecureLoginPage\([^)]*\)\s*{[^}]*this\.wait\s*=\s*new\s+WebDriverWait/s);
    results.push({
      name: 'BUG 1',
      passed: !!hasWaitInit,
      message: hasWaitInit 
        ? '✅ PASS - WebDriverWait initialized in SecureLoginPage constructor' 
        : '❌ FAIL - Add "this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));" in constructor'
    });

    // BUG 2: Check for explicit waits in enterCredentials method
    const enterMethod = code.match(/public\s+void\s+enterCredentials\([^)]*\)\s*{([^}]+)}/s);
    const enterMethodCode = enterMethod ? enterMethod[1] : '';
    const hasWaitInEnter = enterMethodCode.includes('wait.until') && 
                          (enterMethodCode.includes('visibilityOfElementLocated') || enterMethodCode.includes('elementToBeClickable')) &&
                          !enterMethodCode.includes('driver.findElement(usernameField)') &&
                          !enterMethodCode.includes('driver.findElement(passwordField)');
    results.push({
      name: 'BUG 2',
      passed: !!hasWaitInEnter,
      message: hasWaitInEnter 
        ? '✅ PASS - Explicit waits added in enterCredentials method' 
        : '❌ FAIL - Replace driver.findElement with wait.until(ExpectedConditions.visibilityOfElementLocated(...))'
    });

    // BUG 3: Check for explicit wait in getErrorMessage method
    const errorMethod = code.match(/public\s+String\s+getErrorMessage\([^)]*\)\s*{([^}]+)}/s);
    const errorMethodCode = errorMethod ? errorMethod[1] : '';
    const hasWaitInError = errorMethodCode.includes('wait.until') && 
                          errorMethodCode.includes('visibilityOfElementLocated') &&
                          !errorMethodCode.includes('driver.findElement(errorMessage).getText()');
    results.push({
      name: 'BUG 3',
      passed: !!hasWaitInError,
      message: hasWaitInError 
        ? '✅ PASS - Explicit wait added for error message visibility' 
        : '❌ FAIL - Add wait.until(ExpectedConditions.visibilityOfElementLocated(errorMessage)) before getText()'
    });

    // === SCENARIO 2: Dynamic Content & Synchronization (4 bugs) ===
    
    // BUG 4: Check Thread.sleep is removed AND replaced with wait.until
    const loadMethod = code.match(/public\s+void\s+loadUserProfile\([^)]*\)\s*{([^}]+)}/s);
    const loadMethodCode = loadMethod ? loadMethod[1] : '';
    const hasNoThreadSleep = !loadMethodCode.includes('Thread.sleep') && loadMethodCode.includes('wait.until');
    results.push({
      name: 'BUG 4',
      passed: hasNoThreadSleep,
      message: hasNoThreadSleep 
        ? '✅ PASS - Thread.sleep removed and replaced with proper wait' 
        : '❌ FAIL - Remove Thread.sleep and add wait.until(ExpectedConditions.visibilityOfElementLocated(...))'
    });

    // BUG 5: Check for elementToBeClickable in clickEditButton
    const clickMethod = code.match(/public\s+void\s+clickEditButton\([^)]*\)\s*{([^}]+)}/s);
    const clickMethodCode = clickMethod ? clickMethod[1] : '';
    const hasClickableWait = clickMethodCode.includes('wait.until') && 
                            clickMethodCode.includes('elementToBeClickable') &&
                            !clickMethodCode.includes('driver.findElement(By.id("edit-profile-btn")).click()');
    results.push({
      name: 'BUG 5',
      passed: !!hasClickableWait,
      message: hasClickableWait 
        ? '✅ PASS - elementToBeClickable wait added in clickEditButton' 
        : '❌ FAIL - Use wait.until(ExpectedConditions.elementToBeClickable(...)) before clicking'
    });

    // BUG 6: Check for explicit wait in isDataLoaded
    const dataMethod = code.match(/public\s+boolean\s+isDataLoaded\([^)]*\)\s*{([^}]+)}/s);
    const dataMethodCode = dataMethod ? dataMethod[1] : '';
    const hasWaitInDataLoaded = dataMethodCode.includes('wait.until') && 
                               dataMethodCode.includes('visibilityOfElementLocated') &&
                               !dataMethodCode.includes('driver.findElement(By.id("profile-data"))');
    results.push({
      name: 'BUG 6',
      passed: !!hasWaitInDataLoaded,
      message: hasWaitInDataLoaded 
        ? '✅ PASS - Explicit wait added in isDataLoaded for AJAX completion' 
        : '❌ FAIL - Add wait.until(ExpectedConditions.visibilityOfElementLocated(...)) before checking display'
    });

    // BUG 7: Check for explicit wait in getNotificationCount
    const notifMethod = code.match(/public\s+int\s+getNotificationCount\([^)]*\)\s*{([^}]+)}/s);
    const notifMethodCode = notifMethod ? notifMethod[1] : '';
    const hasWaitInNotification = notifMethodCode.includes('wait.until') && 
                                 notifMethodCode.includes('presenceOfElementLocated') &&
                                 !notifMethodCode.includes('driver.findElement(By.className("notification-badge"))');
    results.push({
      name: 'BUG 7',
      passed: !!hasWaitInNotification,
      message: hasWaitInNotification 
        ? '✅ PASS - Explicit wait added for notification badge presence' 
        : '❌ FAIL - Add wait.until(ExpectedConditions.presenceOfElementLocated(...)) before getText()'
    });

    // === SCENARIO 3: Complex Form Handling (3 bugs) ===
    
    // BUG 8: Check absolute XPath is replaced with stable locator
    const fillMethod = code.match(/public\s+void\s+fillUserDetails\([^)]*\)\s*{([^}]+)}/s);
    const fillMethodCode = fillMethod ? fillMethod[1] : '';
    const hasNoAbsoluteXPath = !fillMethodCode.includes('/html/body/div[1]/div[2]/form/div[1]/input') &&
                              (fillMethodCode.includes('By.id("name")') || fillMethodCode.includes('By.name('));
    results.push({
      name: 'BUG 8',
      passed: hasNoAbsoluteXPath,
      message: hasNoAbsoluteXPath 
        ? '✅ PASS - Absolute XPath replaced with stable locator (By.id or By.name)' 
        : '❌ FAIL - Replace absolute XPath with By.id("name") or By.name("fullName")'
    });

    // BUG 9: Check nth-child selector is replaced
    const hasNoNthChild = !fillMethodCode.includes('nth-child(2)') &&
                         (fillMethodCode.includes('By.id("email")') || fillMethodCode.includes('By.name('));
    results.push({
      name: 'BUG 9',
      passed: hasNoNthChild,
      message: hasNoNthChild 
        ? '✅ PASS - Index-based CSS selector replaced with stable locator' 
        : '❌ FAIL - Replace nth-child selector with By.id("email") or By.name("emailAddress")'
    });

    // BUG 10: Check linkText is replaced with stable locator
    const submitMethod = code.match(/public\s+void\s+submitForm\([^)]*\)\s*{([^}]+)}/s);
    const submitMethodCode = submitMethod ? submitMethod[1] : '';
    const hasNoLinkText = !submitMethodCode.includes('By.linkText("Submit Registration")') &&
                         (submitMethodCode.includes('By.id') || submitMethodCode.includes('button[type=') || submitMethodCode.includes('data-testid'));
    results.push({
      name: 'BUG 10',
      passed: hasNoLinkText,
      message: hasNoLinkText 
        ? '✅ PASS - linkText replaced with stable, locale-independent locator' 
        : '❌ FAIL - Replace By.linkText with By.id("submit-btn") or By.cssSelector("button[type=\'submit\']")'
    });

    return results;
  }

  // Handle Java Calculator Challenge - 8 bugs
  if (language === 'java-calculator') {
    // BUG 1: Addition should use + operator
    const hasCorrectAdd = code.includes('a + b') && code.match(/public\s+double\s+add\([^)]*\)\s*{[^}]*a\s*\+\s*b/s);
    results.push({
      name: 'BUG 1',
      passed: !!hasCorrectAdd,
      message: hasCorrectAdd 
        ? '\u2705 PASS - Addition uses correct + operator (a + b)' 
        : '\u274C FAIL - Change "a - b" to "a + b" in add() method'
    });

    // BUG 2: Subtraction should be a - b (not b - a)
    const hasCorrectSubtract = code.match(/public\s+double\s+subtract\([^)]*\)\s*{[^}]*a\s*-\s*b/s) && !code.match(/public\s+double\s+subtract\([^)]*\)\s*{[^}]*b\s*-\s*a/s);
    results.push({
      name: 'BUG 2',
      passed: !!hasCorrectSubtract,
      message: hasCorrectSubtract 
        ? '\u2705 PASS - Subtraction uses correct order (a - b)' 
        : '\u274C FAIL - Change "b - a" to "a - b" in subtract() method'
    });

    // BUG 3: Multiply must return result
    const hasMultiplyReturn = code.match(/public\s+double\s+multiply\([^)]*\)\s*{[^}]*return\s+result/s);
    results.push({
      name: 'BUG 3',
      passed: !!hasMultiplyReturn,
      message: hasMultiplyReturn 
        ? '\u2705 PASS - multiply() returns result' 
        : '\u274C FAIL - Add "return result;" at end of multiply() method'
    });

    // BUG 4: Division should check for zero
    const hasDivideCheck = code.match(/public\s+double\s+divide\([^)]*\)\s*{[^}]*(if\s*\(\s*b\s*==\s*0|if\s*\(\s*0\s*==\s*b)/s);
    results.push({
      name: 'BUG 4',
      passed: !!hasDivideCheck,
      message: hasDivideCheck 
        ? '\u2705 PASS - divide() checks for division by zero' 
        : '\u274C FAIL - Add "if (b == 0) throw new ArithmeticException()" before dividing'
    });

    // BUG 5: Power should use exponent, not exponent + 1
    const hasCorrectPower = code.match(/Math\.pow\([^,]+,\s*exponent\s*\)/s) && !code.match(/Math\.pow\([^,]+,\s*exponent\s*\+\s*1\s*\)/s);
    results.push({
      name: 'BUG 5',
      passed: !!hasCorrectPower,
      message: hasCorrectPower 
        ? '\u2705 PASS - power() uses correct exponent value' 
        : '\u274C FAIL - Remove "+ 1" from exponent in Math.pow()'
    });

    // BUG 6: Average should divide by numbers.length, not numbers.length - 1
    const hasCorrectAverage = code.match(/public\s+double\s+average\([^)]*\)\s*{[^}]*sum\s*\/\s*numbers\.length(?!\s*-\s*1)/s);
    results.push({
      name: 'BUG 6',
      passed: !!hasCorrectAverage,
      message: hasCorrectAverage 
        ? '\u2705 PASS - average() divides by correct array length' 
        : '\u274C FAIL - Remove "- 1" from denominator in average() method'
    });

    // BUG 7: findMax should use > operator, not <
    const hasCorrectMax = code.match(/public\s+double\s+findMax\([^)]*\)\s*{[^}]*if\s*\(\s*numbers\[i\]\s*>\s*max\s*\)/s);
    results.push({
      name: 'BUG 7',
      passed: !!hasCorrectMax,
      message: hasCorrectMax 
        ? '\u2705 PASS - findMax() uses correct > comparison' 
        : '\u274C FAIL - Change "numbers[i] < max" to "numbers[i] > max" in findMax()'
    });

    // BUG 8: getHistorySize should return history.size(), not history.size() + 1
    const hasCorrectHistorySize = code.match(/public\s+int\s+getHistorySize\([^)]*\)\s*{[^}]*return\s+history\.size\(\)\s*;/s) && !code.match(/return\s+history\.size\(\)\s*\+\s*1/s);
    results.push({
      name: 'BUG 8',
      passed: !!hasCorrectHistorySize,
      message: hasCorrectHistorySize 
        ? '\u2705 PASS - getHistorySize() returns correct history size' 
        : '\u274C FAIL - Remove "+ 1" from getHistorySize() return statement'
    });

    return results;
  }

  // Handle combined selenium challenge with all 3 scenarios
  if (language === 'selenium-combined') {
    // === SCENARIO 1: Page Object Pattern ===
    // Test 1: Check for WebDriverWait initialization
    const hasWaitInit = code.includes('this.wait = new WebDriverWait') || code.includes('wait = new WebDriverWait');
    results.push({
      name: 'Scenario 1: Page Object Pattern - BUG 1',
      passed: hasWaitInit,
      message: hasWaitInit
        ? '✅ PASS - WebDriverWait initialized in constructor'
        : '❌ FAIL - WebDriverWait object not initialized in constructor'
    });

    // Test 2: Check for explicit wait in login method
    const loginMethodMatch = code.match(/public void login\(.*?\{[\s\S]*?\n\s*\}/);
    const loginMethodCode = loginMethodMatch ? loginMethodMatch[0] : '';
    const hasDirectFind = loginMethodCode.includes('driver.findElement');
    const hasWaitInLogin = loginMethodCode.includes('wait.until') && loginMethodCode.includes('elementToBeClickable');
    results.push({
      name: 'Scenario 1: Page Object Pattern - BUG 2',
      passed: !hasDirectFind && hasWaitInLogin,
      message: (!hasDirectFind && hasWaitInLogin)
        ? '✅ PASS - Explicit waits added in login() method'
        : '❌ FAIL - login() method needs explicit waits before element interactions'
    });

    // Test 3: Check for error message wait
    const errorMethodMatch = code.match(/public String getErrorMessage\(.*?\{[\s\S]*?\n\s*\}/);
    const errorMethodCode = errorMethodMatch ? errorMethodMatch[0] : '';
    const hasDirectFindInError = errorMethodCode.includes('driver.findElement(errorMessage)');
    const hasWaitInError = errorMethodCode.includes('wait.until') && (errorMethodCode.includes('visibilityOfElementLocated') || errorMethodCode.includes('presenceOfElementLocated'));
    results.push({
      name: 'Scenario 1: Page Object Pattern - BUG 3',
      passed: !hasDirectFindInError && hasWaitInError,
      message: (!hasDirectFindInError && hasWaitInError)
        ? '✅ PASS - Error message wait condition added'
        : '❌ FAIL - getErrorMessage() must wait for element visibility'
    });

    // === SCENARIO 2: Wait Conditions ===
    const addProductMatch = code.match(/public void addProductToCart\([^)]*\)\s*\{([^}]*)\}/s);
    const addProductContent = addProductMatch ? addProductMatch[1] : '';
    
    // Test 4: Check Thread.sleep removed
    const hasThreadSleepInAdd = addProductContent.includes('Thread.sleep(');
    results.push({
      name: 'Scenario 2: Wait Conditions - BUG 1',
      passed: !hasThreadSleepInAdd,
      message: !hasThreadSleepInAdd
        ? '✅ PASS - Thread.sleep replaced with proper waits'
        : '❌ FAIL - Thread.sleep found - replace with explicit WebDriverWait'
    });

    // Test 5: Check for elementToBeClickable wait
    const hasClickableInAdd = addProductContent.includes('elementToBeClickable');
    results.push({
      name: 'Scenario 2: Wait Conditions - BUG 2',
      passed: hasClickableInAdd,
      message: hasClickableInAdd
        ? '✅ PASS - Using elementToBeClickable() before click'
        : '❌ FAIL - addProductToCart() needs elementToBeClickable wait'
    });

    // Test 6: Check for cart text update wait
    const isProductMatch = code.match(/public boolean isProductInCart\([^)]*\)\s*\{([^}]*)\}/s);
    const isProductContent = isProductMatch ? isProductMatch[1] : '';
    const hasTextWaitInCart = isProductContent.includes('textToBePresentInElement');
    results.push({
      name: 'Scenario 2: Wait Conditions - BUG 3',
      passed: hasTextWaitInCart,
      message: hasTextWaitInCart
        ? '✅ PASS - Cart update wait condition added'
        : '❌ FAIL - isProductInCart() needs textToBePresentInElement wait'
    });

    // Test 7: Check for badge presence wait
    const getCountMatch = code.match(/public int getCartItemCount\([^)]*\)\s*\{([^}]*)\}/s);
    const getCountContent = getCountMatch ? getCountMatch[1] : '';
    const hasBadgeWaitInCount = getCountContent.includes('presenceOfElementLocated');
    results.push({
      name: 'Scenario 2: Wait Conditions - BUG 4',
      passed: hasBadgeWaitInCount,
      message: hasBadgeWaitInCount
        ? '✅ PASS - Badge wait condition added'
        : '❌ FAIL - getCartItemCount() needs presenceOfElementLocated wait'
    });

    // === SCENARIO 3: Locator Strategy ===
    const fillFormMatch = code.match(/public void fillRegistrationForm\([^)]*\)[^{]*\{([\s\S]*?)\n\s*}\s*public/);
    const fillFormContent = fillFormMatch ? fillFormMatch[1] : code;
    
    // Test 8: Check for absolute XPath removal
    const hasAbsXPathInForm = fillFormContent.includes('/html/body/div[1]');
    results.push({
      name: 'Scenario 3: Locator Strategy - BUG 1',
      passed: !hasAbsXPathInForm,
      message: !hasAbsXPathInForm
        ? '✅ PASS - Absolute XPath removed'
        : '❌ FAIL - Replace absolute XPath with stable ID locator'
    });

    // Test 9: Check for index-based selectors
    const hasIndexInForm = code.includes(':nth-child');
    results.push({
      name: 'Scenario 3: Locator Strategy - BUG 2',
      passed: !hasIndexInForm,
      message: !hasIndexInForm
        ? '✅ PASS - Index-based selector removed'
        : '❌ FAIL - Replace :nth-child selector with ID attribute'
    });

    // Test 10: Check for text-based XPath
    const hasTextXPathInForm = code.includes('contains(text(),');
    results.push({
      name: 'Scenario 3: Locator Strategy - BUG 3',
      passed: !hasTextXPathInForm,
      message: !hasTextXPathInForm
        ? '✅ PASS - Text-based XPath removed'
        : '❌ FAIL - Replace contains(text(),) XPath with ID locator'
    });

    // Test 11: Check for linkText locator
    const hasLinkTextInSubmit = code.includes('By.linkText');
    results.push({
      name: 'Scenario 3: Locator Strategy - BUG 4',
      passed: !hasLinkTextInSubmit,
      message: !hasLinkTextInSubmit
        ? '✅ PASS - LinkText replaced with stable locator'
        : '❌ FAIL - Replace By.linkText with button type selector'
    });

    return results;
  }

  // Legacy support for individual challenges
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
        name: 'Test 2 (BUG 2): Add Clickable Wait',
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
        name: 'Test 3 (BUG 3): Add Cart Update Wait',
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
        name: 'Test 4 (BUG 4): Add Badge Presence Wait',
        passed: hasBadgeWaitInCount,
        message: hasBadgeWaitInCount
          ? '✅ PASS - Badge wait condition added in getCartItemCount()'
          : '❌ FAIL - getCartItemCount() needs presenceOfElementLocated wait for badge'
      });
      break;

    case 'selenium-locators':
      // Extract fillRegistrationForm method - use greedy matching for nested content
      const fillFormMatch = code.match(/public void fillRegistrationForm\([^)]*\)[^{]*\{([\s\S]*?)\n\s*}\s*public/);
      const fillFormContent = fillFormMatch ? fillFormMatch[1] : code;
      
      // Test 1: Check for absolute XPath removal in fillRegistrationForm
      const hasAbsXPathInForm = fillFormContent.includes('/html/body/div[1]');
      results.push({
        name: 'Test 1 (BUG 1): Fix Absolute XPath',
        passed: !hasAbsXPathInForm,
        message: !hasAbsXPathInForm
          ? '✅ PASS - Absolute XPath removed from fillRegistrationForm()'
          : '❌ FAIL - fillRegistrationForm() has absolute XPath /html/body/... - use stable ID locator'
      });

      // Test 2: Check for index-based selectors in code
      const hasIndexInForm = code.includes(':nth-child');
      results.push({
        name: 'Test 2 (BUG 2): Fix Index-Based Selector',
        passed: !hasIndexInForm,
        message: !hasIndexInForm
          ? '✅ PASS - Index-based selector removed from fillRegistrationForm()'
          : '❌ FAIL - fillRegistrationForm() has :nth-child selector - use ID attribute'
      });

      // Test 3: Check for text-based XPath in code
      const hasTextXPathInForm = code.includes('contains(text(),');
      results.push({
        name: 'Test 3 (BUG 3): Fix Text-Based XPath',
        passed: !hasTextXPathInForm,
        message: !hasTextXPathInForm
          ? '✅ PASS - Text-based XPath removed from fillRegistrationForm()'
          : '❌ FAIL - fillRegistrationForm() has contains(text(),) XPath - use ID locator'
      });

      // Test 4: Check for linkText locator in code
      const hasLinkTextInSubmit = code.includes('By.linkText');
      results.push({
        name: 'Test 4 (BUG 4): Fix LinkText Locator',
        passed: !hasLinkTextInSubmit,
        message: !hasLinkTextInSubmit
          ? '✅ PASS - LinkText replaced with stable locator in submitForm()'
          : '❌ FAIL - submitForm() uses By.linkText - use button type selector instead'
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
    // Calculate adjusted timer values for all sessions before sending
    const sessionsList = Array.from(sessions.values()).map(session => 
      getSessionWithAdjustedTimer(session)
    );
    socket.emit('sessions-list', sessionsList);
  });

  socket.on('create-session', ({ candidateName, problemTitle }: { candidateName: string; problemTitle: string }) => {
    const sessionId = uuidv4();
    const problem = problems[problemTitle] || problems['Selenium Debugging'];
    
    // Load the Selenium Senior Automation Engineer challenge
    const defaultCode = `// ═══════════════════════════════════════════════════════════════
// NICE ACTIMIZE - SENIOR AUTOMATION ENGINEER TEST
// Selenium WebDriver Debugging Challenge (7+ Years Experience)
// Fix all 10 bugs across 3 real-world scenarios
// Each bug is worth 1 point (Total: 10 points)
// ═══════════════════════════════════════════════════════════════


import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;
import java.util.List;

// ═══════════════════════════════════════════════════════════════
// SCENARIO 1: Login & Authentication (3 bugs)
// ═══════════════════════════════════════════════════════════════

public class SecureLoginPage {
    private WebDriver driver;
    private WebDriverWait wait;
    
    // Locators
    private By usernameField = By.id("username");
    private By passwordField = By.id("password");
    private By loginButton = By.xpath("//button[@type='submit']");
    private By errorMessage = By.className("error-msg");
    private By successMessage = By.id("welcome-msg");
    
    public SecureLoginPage(WebDriver driver) {
        this.driver = driver;
        // BUG 1: WebDriverWait not initialized - causes NullPointerException
    }
    
    public void enterCredentials(String username, String password) {
        // BUG 2: Direct findElement without wait - fails on slow networks
        driver.findElement(usernameField).sendKeys(username);
        driver.findElement(passwordField).sendKeys(password);
    }
    
    public void clickLogin() {
        driver.findElement(loginButton).click();
    }
    
    public String getErrorMessage() {
        // BUG 3: No explicit wait for error message visibility
        return driver.findElement(errorMessage).getText();
    }
    
    public boolean isLoginSuccessful() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(successMessage)).isDisplayed();
    }
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 2: Dynamic Content & Synchronization (4 bugs)
// ═══════════════════════════════════════════════════════════════

public class DynamicDashboard {
    private WebDriver driver;
    private WebDriverWait wait;
    
    public DynamicDashboard(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }
    
    public void loadUserProfile(String userId) {
        driver.get("https://app.example.com/profile/" + userId);
        
        // BUG 4: Using Thread.sleep instead of explicit wait
        try {
            Thread.sleep(3000);  // BAD PRACTICE!
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
    
    public void clickEditButton() {
        // BUG 5: Not waiting for element to be clickable
        WebElement editBtn = driver.findElement(By.id("edit-profile-btn"));
        editBtn.click();
    }
    
    public boolean isDataLoaded() {
        // BUG 6: Missing wait for AJAX call completion
        WebElement dataTable = driver.findElement(By.id("profile-data"));
        return dataTable.isDisplayed();
    }
    
    public int getNotificationCount() {
        // BUG 7: Element might not be present in DOM yet
        WebElement badge = driver.findElement(By.className("notification-badge"));
        return Integer.parseInt(badge.getText());
    }
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 3: Complex Form Handling (3 bugs)
// ═══════════════════════════════════════════════════════════════

public class RegistrationForm {
    private WebDriver driver;
    private WebDriverWait wait;
    
    public RegistrationForm(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }
    
    public void fillUserDetails(String name, String email, String phone) {
        // BUG 8: Fragile absolute XPath - breaks when UI structure changes
        WebElement nameField = driver.findElement(
            By.xpath("/html/body/div[1]/div[2]/form/div[1]/input")
        );
        nameField.sendKeys(name);
        
        // BUG 9: Index-based CSS selector - unreliable
        WebElement emailField = driver.findElement(
            By.cssSelector("input:nth-child(2)")
        );
        emailField.sendKeys(email);
        
        // Use stable locator for phone (CORRECT)
        driver.findElement(By.id("phone")).sendKeys(phone);
    }
    
    public void selectCountry(String country) {
        Select countryDropdown = new Select(driver.findElement(By.id("country")));
        countryDropdown.selectByVisibleText(country);
    }
    
    public void submitForm() {
        // BUG 10: Using link text that's locale-dependent
        WebElement submitBtn = driver.findElement(
            By.linkText("Submit Registration")
        );
        submitBtn.click();
    }
    
    public boolean isRegistrationSuccessful() {
        return wait.until(ExpectedConditions.urlContains("/success"));
    }
}`;
    
    const session: InterviewSession = {
      id: sessionId,
      candidateName,
      problem: problemTitle,
      problemDescription: problem.description,
      code: defaultCode,
      language: 'selenium-senior',
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
    
    // Calculate elapsed time since last update to properly resume timer
    let adjustedInstructionTime = session.instructionTimeRemaining ?? 60;
    let adjustedCodingTime = session.codingTimeRemaining ?? 900;
    
    if (session.lastTimerUpdate) {
      const elapsedSeconds = Math.floor((Date.now() - session.lastTimerUpdate) / 1000);
      console.log('Time elapsed since last update:', elapsedSeconds, 'seconds');
      
      if (session.isInstructionPhase) {
        adjustedInstructionTime = Math.max(0, (session.instructionTimeRemaining ?? 60) - elapsedSeconds);
        console.log('Adjusted instruction time:', adjustedInstructionTime);
      } else {
        adjustedCodingTime = Math.max(0, (session.codingTimeRemaining ?? 900) - elapsedSeconds);
        console.log('Adjusted coding time:', adjustedCodingTime);
      }
    }
    
    // Update session with adjusted times
    session.instructionTimeRemaining = adjustedInstructionTime;
    session.codingTimeRemaining = adjustedCodingTime;
    session.lastTimerUpdate = Date.now();
    
    // Include timer state for resume after refresh
    socket.emit('session-data', {
      ...session,
      isInstructionPhase: session.isInstructionPhase ?? true,
      instructionTimeRemaining: adjustedInstructionTime,
      codingTimeRemaining: adjustedCodingTime
    });
    
    // Broadcast updated sessions list with adjusted timers to all clients
    const sessionsList = Array.from(sessions.values()).map(s => 
      getSessionWithAdjustedTimer(s)
    );
    io.emit('sessions-list', sessionsList);
    
    console.log('Candidate joined/rejoined session:', sessionId, '- Timer:', {
      phase: session.isInstructionPhase ? 'Instruction' : 'Coding',
      instructionTime: adjustedInstructionTime,
      codingTime: adjustedCodingTime
    });
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

  socket.on('timer-update', ({ sessionId, isInstructionPhase, instructionTimeRemaining, codingTimeRemaining }: { 
    sessionId: string; 
    isInstructionPhase: boolean; 
    instructionTimeRemaining: number; 
    codingTimeRemaining: number 
  }) => {
    const session = sessions.get(sessionId);
    
    if (session) {
      session.isInstructionPhase = isInstructionPhase;
      session.instructionTimeRemaining = instructionTimeRemaining;
      session.codingTimeRemaining = codingTimeRemaining;
      session.lastTimerUpdate = Date.now(); // Save timestamp for resume calculation
      
      // Broadcast timer update to all clients (especially interviewer)
      io.emit('timer-update', { 
        sessionId, 
        isInstructionPhase, 
        instructionTimeRemaining, 
        codingTimeRemaining 
      });
    }
  });

  socket.on('execute-code', async ({ sessionId, code, language }: { sessionId: string; code: string; language: string }) => {
    try {
      console.log('=== BACKEND: EXECUTE-CODE RECEIVED ===');
      console.log('Session ID:', sessionId);
      console.log('Language:', language);
      console.log('Code length:', code.length);
      console.log('Code preview (first 150 chars):', code.substring(0, 150));
      console.log('Code contains /html/body?:', code.includes('/html/body'));
      console.log('Code contains Thread.sleep?:', code.includes('Thread.sleep'));
      console.log('Code contains Optional.of?:', code.includes('Optional.of'));
      
      let output = '';
      let success = true;

      // Analyze the code and provide test results
      const testResults = analyzeDebugFixes(code, language);
      
      console.log('Test results:', testResults.map(t => `${t.name}: ${t.passed ? 'PASS' : 'FAIL'}`));
      
      // Display results based on challenge type
      if (language === 'selenium-senior') {
        output += `╔═══════════════════════════════════════════════════════════════╗\n`;
        output += `║     NICE ACTIMIZE - SENIOR AUTOMATION ENGINEER TEST          ║\n`;
        output += `║          Selenium WebDriver Debugging Challenge              ║\n`;
        output += `╚═══════════════════════════════════════════════════════════════╝\n\n`;
        
        const scenario1 = testResults.slice(0, 3);
        const scenario2 = testResults.slice(3, 7);
        const scenario3 = testResults.slice(7, 10);

        // Scenario 1
        output += `┌─────────────────────────────────────────────────────────────┐\n`;
        output += `│ 📋 SCENARIO 1: Login & Authentication (3 bugs)             │\n`;
        output += `└─────────────────────────────────────────────────────────────┘\n\n`;
        scenario1.forEach((test, index) => {
          const icon = test.passed ? '✅' : '❌';
          const status = test.passed ? 'PASS' : 'FAIL';
          const points = test.passed ? '1.0' : '0.0';
          output += `  ${icon} ${test.name}: ${status} [${points} point]\n`;
          output += `     ${test.message}\n\n`;
        });

        // Scenario 2
        output += `┌─────────────────────────────────────────────────────────────┐\n`;
        output += `│ 📋 SCENARIO 2: Dynamic Content & Synchronization (4 bugs)  │\n`;
        output += `└─────────────────────────────────────────────────────────────┘\n\n`;
        scenario2.forEach((test, index) => {
          const icon = test.passed ? '✅' : '❌';
          const status = test.passed ? 'PASS' : 'FAIL';
          const points = test.passed ? '1.0' : '0.0';
          output += `  ${icon} ${test.name}: ${status} [${points} point]\n`;
          output += `     ${test.message}\n\n`;
        });

        // Scenario 3
        output += `┌─────────────────────────────────────────────────────────────┐\n`;
        output += `│ 📋 SCENARIO 3: Complex Form Handling (3 bugs)              │\n`;
        output += `└─────────────────────────────────────────────────────────────┘\n\n`;
        scenario3.forEach((test, index) => {
          const icon = test.passed ? '✅' : '❌';
          const status = test.passed ? 'PASS' : 'FAIL';
          const points = test.passed ? '1.0' : '0.0';
          output += `  ${icon} ${test.name}: ${status} [${points} point]\n`;
          output += `     ${test.message}\n\n`;
        });
      } else if (language === 'java-calculator') {
        const scenario1 = testResults.slice(0, 3);
        const scenario2 = testResults.slice(3, 7);
        const scenario3 = testResults.slice(7, 11);

        // Scenario 1
        output += `📋 Scenario 1: Page Object Pattern (3 bugs)\\n`;
        output += `${'─'.repeat(60)}\\n`;
        scenario1.forEach((test, index) => {
          const icon = test.passed ? '✓' : '✗';
          output += `  BUG ${index + 1}: ${icon} ${test.passed ? 'PASS' : 'FAIL'}\\n`;
          output += `    ${test.message}\\n\\n`;
        });

        // Scenario 2
        output += `📋 Scenario 2: Wait Conditions (4 bugs)\\n`;
        output += `${'─'.repeat(60)}\\n`;
        scenario2.forEach((test, index) => {
          const icon = test.passed ? '✓' : '✗';
          output += `  BUG ${index + 1}: ${icon} ${test.passed ? 'PASS' : 'FAIL'}\\n`;
          output += `    ${test.message}\\n\\n`;
        });

        // Scenario 3
        output += `📋 Scenario 3: Locator Strategy (4 bugs)\\n`;
        output += `${'─'.repeat(60)}\\n`;
        scenario3.forEach((test, index) => {
          const icon = test.passed ? '✓' : '✗';
          output += `  BUG ${index + 1}: ${icon} ${test.passed ? 'PASS' : 'FAIL'}\\n`;
          output += `    ${test.message}\\n\\n`;
        });
      } else {
        // Legacy format for individual challenges
        testResults.forEach((test, index) => {
          output += `Test ${index + 1}: ${test.name}\n`;
          output += `${test.message}\n\n`;
        });
      }

      const passedTests = testResults.filter(t => t.passed).length;
      const totalTests = testResults.length;
      const totalPoints = passedTests * 1.0;
      
      output += `\n╔═══════════════════════════════════════════════════════════════╗\n`;
      output += `║                        TEST SUMMARY                           ║\n`;
      output += `╠═══════════════════════════════════════════════════════════════╣\n`;
      output += `║  Bugs Fixed: ${passedTests}/${totalTests}                                              ║\n`;
      output += `║  Score: ${totalPoints.toFixed(1)}/10.0 points                                    ║\n`;
      
      if (passedTests === totalTests) {
        output += `║                                                               ║\n`;
        output += `║  🎉 EXCELLENT! All bugs fixed!                               ║\n`;
        output += `║  You've demonstrated expert Selenium knowledge!              ║\n`;
        success = true;
      } else if (passedTests >= 7) {
        output += `║                                                               ║\n`;
        output += `║  ✨ GOOD JOB! ${totalTests - passedTests} bug(s) remaining.                           ║\n`;
        output += `║  Review the failed tests and try again!                      ║\n`;
        success = false;
      } else {
        output += `║                                                               ║\n`;
        output += `║  ⚠️  ${totalTests - passedTests} bug(s) remaining. Keep debugging!                   ║\n`;
        output += `║  Focus on explicit waits and stable locators.                ║\n`;
        success = false;
      }
      
      output += `╚═══════════════════════════════════════════════════════════════╝\n`;

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
