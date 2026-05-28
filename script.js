// Tests Dataset preserved exactly from uploaded sources
let tests = [];
const THEME_OVERRIDE_KEY = "life_uk_theme_override";
let themeOverrideMode = null;
const SHUFFLE_QUESTIONS_KEY = "life_uk_shuffle_questions";
let shuffleQuestionsEnabled = true;

function getAutoThemeByTime(now = new Date()) {
  const hour = now.getHours();
  return hour >= 7 && hour < 19 ? "light" : "dark";
}

function applyTheme(theme) {
  const isLightTheme = theme === "light";

  document.documentElement.classList.toggle("theme-light", isLightTheme);
  document.documentElement.classList.toggle("theme-dark", !isLightTheme);

  updateThemeToggleButton();
}

function updateThemeToggleButton() {
  const themeToggleButton = document.getElementById("themeToggleButton");
  const themeToggleIcon = document.getElementById("themeToggleIcon");
  if (!themeToggleButton || !themeToggleIcon) return;

  const isDarkTheme = document.documentElement.classList.contains("theme-dark");
  themeToggleIcon.setAttribute("data-lucide", isDarkTheme ? "moon" : "sun");

  const modeLabel = themeOverrideMode ? "Manual" : "Auto";
  const themeLabel = isDarkTheme ? "Dark" : "Light";
  themeToggleButton.setAttribute("title", `${modeLabel}: ${themeLabel} theme`);
  themeToggleButton.setAttribute("aria-label", `${modeLabel} ${themeLabel} theme`);

  lucide.createIcons();
}

function loadThemeOverride() {
  try {
    const savedOverride = localStorage.getItem(THEME_OVERRIDE_KEY);
    if (savedOverride === "light" || savedOverride === "dark") {
      themeOverrideMode = savedOverride;
    }
  } catch (e) {
    console.warn("Could not load theme override:", e);
  }
}

function saveThemeOverride() {
  try {
    if (themeOverrideMode) {
      localStorage.setItem(THEME_OVERRIDE_KEY, themeOverrideMode);
    } else {
      localStorage.removeItem(THEME_OVERRIDE_KEY);
    }
  } catch (e) {
    console.warn("Could not save theme override:", e);
  }
}

function loadShuffleQuestionsPreference() {
  try {
    const savedPreference = localStorage.getItem(SHUFFLE_QUESTIONS_KEY);
    if (savedPreference !== null) {
      shuffleQuestionsEnabled = savedPreference === "true";
    }
  } catch (e) {
    console.warn("Could not load shuffle preference:", e);
  }
}

function saveShuffleQuestionsPreference() {
  try {
    localStorage.setItem(SHUFFLE_QUESTIONS_KEY, String(shuffleQuestionsEnabled));
  } catch (e) {
    console.warn("Could not save shuffle preference:", e);
  }
}

function setShuffleQuestionsPreference(enabled) {
  shuffleQuestionsEnabled = enabled;
  saveShuffleQuestionsPreference();

  const shuffleQuestionsToggle = document.getElementById("shuffleQuestionsToggle");
  if (shuffleQuestionsToggle) {
    shuffleQuestionsToggle.checked = enabled;
  }
}

function applyThemeByTime(now = new Date()) {
  const themeToApply = themeOverrideMode || getAutoThemeByTime(now);
  applyTheme(themeToApply);
}

function toggleThemeOverride() {
  const isDarkTheme = document.documentElement.classList.contains("theme-dark");
  themeOverrideMode = isDarkTheme ? "light" : "dark";
  saveThemeOverride();
  applyTheme(themeOverrideMode);
}

function startThemeScheduler() {
  loadThemeOverride();
  applyThemeByTime();

  // Re-check every minute to switch cleanly at 07:00 and 19:00 while app stays open.
  setInterval(() => {
    applyThemeByTime();
  }, 60000);
}

function transformTests(rawTests) {
  if (!Array.isArray(rawTests)) {
    console.error("Tests dataset must be an array, received:", typeof rawTests);
    return [];
  }

  // Dynamically expand the compressed datasets into active UI state at runtime
  return rawTests.map(t => ({
    name: t.name,
    questions: t.questions.map(q => ({
      questionNumber: q[0],
      questionText: q[1],
      isMultiSelect: q[2],
      answers: q[3].map((ans, idx) => ({
        index: idx,
        text: ans[0],
        isCorrectAnswer: ans[1],
        wasSelected: false
      })),
      correctAnswer: q[4],
      explanation: q[5],
      isCorrect: false
    }))
  }));
}

function shuffleArray(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

async function loadTestsData() {
  try {
    const datasetUrl = new URL("./questiondata.json", window.location.href);
    const response = await fetch(datasetUrl.href, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading ${datasetUrl.href}`);
    }

    const rawTests = await response.json();
    tests = transformTests(rawTests);
  } catch (err) {
    console.error("Failed to load tests dataset:", err);
    tests = [];
  }
}
// App State Management
let currentTestIndex = 0;
let currentQuestionIndex = 0;
let testQuestions = [];
let timeRemaining = 2700; // 45 minutes in seconds
let timerInterval = null;
let correctCount = 0;
let incorrectCount = 0;
let activeUserSelections = [];
let activeReviewFilter = 'all';

// Track test history locally in this session to update dashboard analytics
let testResultsHistory = [];

// DOM Elements Selection
const homeScreen = document.getElementById("homeScreen");
const testScreen = document.getElementById("testScreen");
const resultScreen = document.getElementById("resultScreen");
const testsGrid = document.getElementById("testsGrid");
const activeTestTitle = document.getElementById("activeTestTitle");
const timerText = document.getElementById("timerText");
const timerContainer = document.getElementById("timerContainer");
const testProgressCounter = document.getElementById("testProgressCounter");
const questionWrapper = document.getElementById("questionWrapper");
const questionStepLabel = document.getElementById("questionStepLabel");
const percentCompleteLabel = document.getElementById("percentCompleteLabel");
const progressFill = document.getElementById("progressFill");
const questionBox = document.getElementById("questionBox");
const optionsBox = document.getElementById("optionsBox");
const btnCheck = document.getElementById("btnCheck");
const btnNext = document.getElementById("btnNext");
const btnBackQuestion = document.getElementById("btnBackQuestion");
const actionFeedback = document.getElementById("actionFeedback");
const finalCorrectCount = document.getElementById("finalCorrectCount");
const finalIncorrectCount = document.getElementById("finalIncorrectCount");
const finalScorePercent = document.getElementById("finalScorePercent");
const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");
const statusIcon = document.getElementById("statusIcon");
const statusIconBg = document.getElementById("statusIconBg");
const btnRetryActive = document.getElementById("btnRetryActive");
const reviewQuestionsContainer = document.getElementById("reviewQuestionsContainer");
const filterAllBtn = document.getElementById("filterAllBtn");
const filterWrongBtn = document.getElementById("filterWrongBtn");
const statAttempted = document.getElementById("statAttempted");
const statAvgScore = document.getElementById("statAvgScore");
const statSubtext = document.getElementById("statSubtext");
const statReadiness = document.getElementById("statReadiness");

// Initialize application
window.onload = async function () {
  startThemeScheduler();
  loadShuffleQuestionsPreference();
  await loadTestsData();
  testResultsHistory = Array(tests.length).fill(null);
  loadSessionData();
  setShuffleQuestionsPreference(shuffleQuestionsEnabled);
  renderDashboard();
  lucide.createIcons();
};

// Load saved session progress from localStorage if exists
function loadSessionData() {
  try {
    const saved = localStorage.getItem("life_uk_test_history");
    if (saved) {
      testResultsHistory = JSON.parse(saved);
      // Validate length matching current database
      if (testResultsHistory.length !== tests.length) {
        testResultsHistory = Array(tests.length).fill(null);
      }
    }
  } catch (e) {
    console.warn("Could not load from localStorage: ", e);
  }
}

// Save active session progress to localStorage
function saveSessionData() {
  try {
    localStorage.setItem("life_uk_test_history", JSON.stringify(testResultsHistory));
  } catch (e) {
    console.warn("Could not save to localStorage: ", e);
  }
}

// Draw Dashboard elements
function renderDashboard() {
  // Update Analytics summary panel
  const attemptedCount = testResultsHistory.filter(r => r !== null).length;
  statAttempted.innerText = `${attemptedCount} / ${tests.length}`;

  if (attemptedCount > 0) {
    statSubtext.innerText = "Keep practicing remaining sets!";

    // Calculate overall average of attempted tests
    const scores = testResultsHistory.filter(r => r !== null).map(r => r.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / attemptedCount);
    statAvgScore.innerText = `${avgScore}%`;

    if (avgScore >= 85) {
      statAvgScore.className = "text-3xl font-extrabold mt-1 text-emerald-400";
      statReadiness.innerText = "Excellent readiness! Ready for the exam.";
    } else if (avgScore >= 75) {
      statAvgScore.className = "text-3xl font-extrabold mt-1 text-blue-400";
      statReadiness.innerText = "Solid scores! Secure a pass standard.";
    } else {
      statAvgScore.className = "text-3xl font-extrabold mt-1 text-amber-400";
      statReadiness.innerText = "Study remaining sheets and retake failed sets.";
    }
  } else {
    statAvgScore.innerText = "0%";
    statAvgScore.className = "text-3xl font-extrabold mt-1 text-slate-400";
    statReadiness.innerText = "No data yet";
    statSubtext.innerText = "Start a test below";
  }

  // Draw Practice Sets Grid
  testsGrid.innerHTML = "";
  tests.forEach((test, idx) => {
    const result = testResultsHistory[idx];
    let badgeHtml = "";
    let borderClass = "border-slate-200";

    if (result) {
      const isPassed = result.score >= 75;
      badgeHtml = isPassed
        ? `<span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Passed (${result.score}%)</span>`
        : `<span class="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Failed (${result.score}%)</span>`;
      borderClass = isPassed ? "border-emerald-200" : "border-red-200";
    } else {
      badgeHtml = `<span class="text-xs bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><i data-lucide="circle" class="w-3.5 h-3.5"></i> Not Started</span>`;
    }

    const card = document.createElement("div");
    card.className = `bg-white border ${borderClass} rounded-2xl p-5 custom-shadow flex flex-col justify-between hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer`;
    card.setAttribute("onclick", `startTest(${idx})`);

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold text-slate-400">PAPER ${idx + 1}</span>
          ${badgeHtml}
        </div>
        <h4 class="font-extrabold text-slate-800 text-lg mb-1">${test.name}</h4>
        <p class="text-slate-500 text-xs mb-4">Complete 24 simulated test questions on general history, culture, and legislation principles.</p>
      </div>
      <div class="flex items-center justify-between pt-4 border-t border-slate-100">
        <span class="text-xs text-blue-700 font-extrabold flex items-center gap-1">
          Launch Simulator <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </span>
        <span class="text-xs text-slate-400 flex items-center gap-1">
          <i data-lucide="clock" class="w-3.5 h-3.5"></i> 45m
        </span>
      </div>
    `;

    testsGrid.appendChild(card);
  });

  lucide.createIcons();
}

// Switch back to Dashboard from active screens
function backToDashboard() {
  clearInterval(timerInterval);
  testScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  renderDashboard();
}

// Reset stats back to zero
function resetAllStats() {
  if (confirm("Are you sure you want to clear your entire simulator progress?")) {
    testResultsHistory = Array(tests.length).fill(null);
    saveSessionData();
    renderDashboard();
  }
}

// Begin specific Practice Test Suite
function startTest(index) {
  currentTestIndex = index;
  currentQuestionIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  timeRemaining = 2700; // Reset to 45 mins
  activeUserSelections = [];

  // Clone active test questions to avoid editing the core database source directly
  testQuestions = JSON.parse(JSON.stringify(tests[index].questions));

  // Let the user choose whether question order should be randomized for this attempt.
  if (shuffleQuestionsEnabled) {
    testQuestions = shuffleArray(testQuestions);
  }

  // Shuffle answer options each time the paper starts so the order is not fixed.
  testQuestions = testQuestions.map((question) => ({
    ...question,
    answers: shuffleArray(question.answers)
  }));

  // Update header titles
  activeTestTitle.innerText = tests[index].name;

  // Hide main view, reveal testing screen
  homeScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  testScreen.classList.remove("hidden");

  // Start counting down timer
  startTimer();

  // Draw first question
  renderQuestion();
}

// Manage Exam Countdown Timer
function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      completeTest(true); // Terminate automatically on timeout
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  timerText.innerText = `${formattedMinutes}:${formattedSeconds}`;

  // Apply warming alerts for low remaining minutes
  if (timeRemaining < 300) {
    timerContainer.className = "flex items-center gap-2 bg-red-50 text-red-800 px-3 py-1.5 rounded-lg border border-red-200 font-mono font-bold animate-pulse";
  } else {
    timerContainer.className = "flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 font-mono font-bold";
  }
}

function getRequiredSelectionCount(currentQuestion) {
  if (!currentQuestion.isMultiSelect) return 1;

  const correctAnswersCount = currentQuestion.answers.filter((answer) => answer.isCorrectAnswer).length;
  return Math.max(1, correctAnswersCount);
}

// Display/Draw the active question
function renderQuestion() {
  const currentQuestion = testQuestions[currentQuestionIndex];
  activeUserSelections = currentQuestion.answers
    .filter((answer) => answer.wasSelected)
    .map((answer) => answer.index);

  // Update overall progress markers
  const progressPercent = Math.round((currentQuestionIndex / testQuestions.length) * 100);
  questionStepLabel.innerText = `Question ${currentQuestionIndex + 1} of ${testQuestions.length}`;
  percentCompleteLabel.innerText = `${progressPercent}% Complete`;
  progressFill.style.width = `${progressPercent}%`;
  testProgressCounter.innerText = `${correctCount}/${testQuestions.length} Correct`;
  updateQuestionBackButtonState();

  // Clear Action block state
  actionFeedback.innerHTML = "";
  btnNext.style.display = "none";
  btnCheck.style.display = "flex";
  btnCheck.disabled = true;
  btnCheck.className = "opacity-50 cursor-not-allowed bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-1.5 text-sm";

  // Question Text Block
  let helperBadge = currentQuestion.isMultiSelect
    ? `<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Multiple Choice</span>`
    : `<span class="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Single Choice</span>`;

  questionBox.innerHTML = `
    <div class="flex items-center gap-2.5 mb-3 flex-wrap">
      ${helperBadge}
    </div>
    <h3 class="text-xl font-bold text-slate-900 leading-snug">${currentQuestion.questionText}</h3>
  `;

  // Draw Option Cards
  optionsBox.innerHTML = "";
  currentQuestion.answers.forEach((answer, optionPosition) => {
    const optionCard = document.createElement("div");
    optionCard.id = `option-card-${answer.index}`;
    optionCard.className = "option-card border border-slate-200 bg-white hover:bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all";
    optionCard.setAttribute("onclick", `toggleSelection(${answer.index})`);

    // Choose Checkbox vs Radio icon representation
    let iconName = currentQuestion.isMultiSelect ? "square" : "circle";
    let iconColor = "text-slate-300";

    optionCard.innerHTML = `
      <div class="flex items-center gap-3">
        <div id="option-badge-${answer.index}" class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
          ${String.fromCharCode(65 + optionPosition)}
        </div>
        <span class="text-sm font-semibold text-slate-800">${answer.text}</span>
      </div>
      <i id="option-icon-${answer.index}" data-lucide="${iconName}" class="${iconColor} w-5 h-5 flex-shrink-0"></i>
    `;

    optionsBox.appendChild(optionCard);
  });

  // Restore selected state for previously visited, unanswered questions
  activeUserSelections.forEach((idx) => highlightCard(idx));

  // If the question was already checked before, lock and show saved result state.
  if (currentQuestion.wasChecked) {
    renderCheckedQuestionState(currentQuestion);
  } else {
    const requiredCount = getRequiredSelectionCount(currentQuestion);
    if (activeUserSelections.length === requiredCount) {
      btnCheck.disabled = false;
      btnCheck.className = "bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 custom-shadow text-sm cursor-pointer";
    }
  }

  lucide.createIcons();
}

function updateQuestionBackButtonState() {
  const isFirstQuestion = currentQuestionIndex === 0;
  btnBackQuestion.disabled = isFirstQuestion;
  btnBackQuestion.className = isFirstQuestion
    ? "p-2 rounded-lg text-slate-300 cursor-not-allowed flex items-center gap-1 font-semibold text-sm"
    : "p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-1 font-semibold text-sm";
}

function goToPreviousQuestion() {
  if (currentQuestionIndex === 0) return;
  currentQuestionIndex--;
  renderQuestion();
}

function renderCheckedQuestionState(currentQuestion) {
  currentQuestion.answers.forEach((answer) => {
    const card = document.getElementById(`option-card-${answer.index}`);
    const badge = document.getElementById(`option-badge-${answer.index}`);
    const icon = document.getElementById(`option-icon-${answer.index}`);

    card.classList.add("disabled");

    if (answer.isCorrectAnswer) {
      card.className = "option-card border-emerald-500 bg-emerald-50 rounded-xl p-4 flex items-center justify-between gap-3 select-none transition-all disabled";
      badge.className = "w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border border-emerald-700 shadow-sm";
      icon.setAttribute("data-lucide", "check-circle");
      icon.className = "text-emerald-600 w-5 h-5 flex-shrink-0";
    } else if (answer.wasSelected && !answer.isCorrectAnswer) {
      card.className = "option-card border-red-500 bg-red-50 rounded-xl p-4 flex items-center justify-between gap-3 select-none transition-all disabled";
      badge.className = "w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center border border-red-700 shadow-sm";
      icon.setAttribute("data-lucide", "x-circle");
      icon.className = "text-red-600 w-5 h-5 flex-shrink-0";
    }
  });

  const iconMarkup = currentQuestion.isCorrect
    ? `<div class="bg-emerald-100 text-emerald-800 p-2 rounded-lg"><i data-lucide="smile" class="w-5 h-5"></i></div>`
    : `<div class="bg-red-100 text-red-800 p-2 rounded-lg"><i data-lucide="help-circle" class="w-5 h-5"></i></div>`;

  const statusMarkup = currentQuestion.isCorrect
    ? `<span class="text-emerald-800 font-extrabold text-sm">Correct Answer!</span>`
    : `<span class="text-red-800 font-extrabold text-sm">Incorrect response</span>`;

  actionFeedback.innerHTML = `
    <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex gap-3 max-w-xl transition-all">
      ${iconMarkup}
      <div>
        <div class="mb-1">${statusMarkup}</div>
        <p class="text-xs text-slate-500 leading-relaxed">${currentQuestion.explanation}</p>
      </div>
    </div>
  `;

  btnCheck.style.display = "none";
  btnNext.style.display = "flex";
  lucide.createIcons();
}

// Register Selection Updates on option click
function toggleSelection(index) {
  const currentQuestion = testQuestions[currentQuestionIndex];
  const requiredCount = getRequiredSelectionCount(currentQuestion);

  // If we already validated answer, disable selecting updates
  if (btnNext.style.display === "flex") return;

  if (currentQuestion.isMultiSelect) {
    // Multi Selection logic
    const exists = activeUserSelections.indexOf(index);
    if (exists > -1) {
      activeUserSelections.splice(exists, 1);
      dehighlightCard(index);
    } else {
      if (activeUserSelections.length < requiredCount) {
        activeUserSelections.push(index);
        highlightCard(index);
      } else {
        // Pop off first element to replace
        const first = activeUserSelections.shift();
        dehighlightCard(first);
        activeUserSelections.push(index);
        highlightCard(index);
      }
    }
  } else {
    // Single selection logic
    currentQuestion.answers.forEach((ans) => dehighlightCard(ans.index));
    activeUserSelections = [index];
    highlightCard(index);
  }

  // Manage Validation triggers
  if (activeUserSelections.length === requiredCount) {
    btnCheck.disabled = false;
    btnCheck.className = "bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 custom-shadow text-sm cursor-pointer";
  } else {
    btnCheck.disabled = true;
    btnCheck.className = "opacity-50 cursor-not-allowed bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-1.5 text-sm";
  }
}

function highlightCard(index) {
  const card = document.getElementById(`option-card-${index}`);
  const badge = document.getElementById(`option-badge-${index}`);
  const icon = document.getElementById(`option-icon-${index}`);

  card.className = "option-card border-blue-500 bg-blue-50/50 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all";
  badge.className = "w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-700 shadow-sm";

  const currentQuestion = testQuestions[currentQuestionIndex];
  icon.setAttribute("data-lucide", currentQuestion.isMultiSelect ? "check-square" : "check-circle");
  icon.className = "text-blue-600 w-5 h-5 flex-shrink-0";
  lucide.createIcons();
}

function dehighlightCard(index) {
  const card = document.getElementById(`option-card-${index}`);
  const badge = document.getElementById(`option-badge-${index}`);
  const icon = document.getElementById(`option-icon-${index}`);

  if (!card) return;
  card.className = "option-card border border-slate-200 bg-white hover:bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all";
  badge.className = "w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200";

  const currentQuestion = testQuestions[currentQuestionIndex];
  icon.setAttribute("data-lucide", currentQuestion.isMultiSelect ? "square" : "circle");
  icon.className = "text-slate-300 w-5 h-5 flex-shrink-0";
  lucide.createIcons();
}

// Grade the chosen answers and trigger real-time explanations
function checkActiveAnswer() {
  const currentQuestion = testQuestions[currentQuestionIndex];
  if (currentQuestion.wasChecked) return;

  // Set wasSelected on local copy database answers
  currentQuestion.answers.forEach((answer) => {
    answer.wasSelected = activeUserSelections.includes(answer.index);
  });

  // Calculate if the selections matches correctness criteria
  let isCorrect = true;
  currentQuestion.answers.forEach((answer) => {
    if (answer.isCorrectAnswer !== answer.wasSelected) {
      isCorrect = false;
    }
  });

  currentQuestion.isCorrect = isCorrect;
  currentQuestion.wasChecked = true;
  if (isCorrect) {
    correctCount++;
  } else {
    incorrectCount++;
  }

  // Visual highlights for all cards
  currentQuestion.answers.forEach((answer) => {
    const card = document.getElementById(`option-card-${answer.index}`);
    const badge = document.getElementById(`option-badge-${answer.index}`);
    const icon = document.getElementById(`option-icon-${answer.index}`);

    // Disable hover states
    card.classList.add("disabled");

    if (answer.isCorrectAnswer) {
      // Highlight correct answers green
      card.className = "option-card border-emerald-500 bg-emerald-50 rounded-xl p-4 flex items-center justify-between gap-3 select-none transition-all";
      badge.className = "w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border border-emerald-700 shadow-sm";
      icon.setAttribute("data-lucide", "check-circle");
      icon.className = "text-emerald-600 w-5 h-5 flex-shrink-0";
    } else if (answer.wasSelected && !answer.isCorrectAnswer) {
      // Highlight user wrong selection red
      card.className = "option-card border-red-500 bg-red-50 rounded-xl p-4 flex items-center justify-between gap-3 select-none transition-all";
      badge.className = "w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center border border-red-700 shadow-sm";
      icon.setAttribute("data-lucide", "x-circle");
      icon.className = "text-red-600 w-5 h-5 flex-shrink-0";
    }
  });

  // Display validation details box
  const iconMarkup = isCorrect
    ? `<div class="bg-emerald-100 text-emerald-800 p-2 rounded-lg"><i data-lucide="smile" class="w-5 h-5"></i></div>`
    : `<div class="bg-red-100 text-red-800 p-2 rounded-lg"><i data-lucide="help-circle" class="w-5 h-5"></i></div>`;

  const statusMarkup = isCorrect
    ? `<span class="text-emerald-800 font-extrabold text-sm">Correct Answer!</span>`
    : `<span class="text-red-800 font-extrabold text-sm">Incorrect response</span>`;

  actionFeedback.innerHTML = `
    <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex gap-3 max-w-xl transition-all">
      ${iconMarkup}
      <div>
        <div class="mb-1">${statusMarkup}</div>
        <p class="text-xs text-slate-500 leading-relaxed">${currentQuestion.explanation}</p>
      </div>
    </div>
  `;

  // Toggle button state
  btnCheck.style.display = "none";
  btnNext.style.display = "flex";
  lucide.createIcons();
}

// Proceed forward on next trigger
function advanceQuestion() {
  if (currentQuestionIndex < testQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    completeTest();
  }
}

// End Practice and build Review Dashboard
function completeTest(isTimeout = false) {
  clearInterval(timerInterval);

  // Grade result percent
  const scorePercent = Math.round((correctCount / testQuestions.length) * 100);
  const isPassed = scorePercent >= 75;

  // Save progress back to history arrays
  testResultsHistory[currentTestIndex] = {
    score: scorePercent,
    correct: correctCount,
    incorrect: incorrectCount,
    date: new Date().toLocaleDateString()
  };
  saveSessionData();

  // Draw details onto completed layout
  finalCorrectCount.innerText = correctCount;
  finalIncorrectCount.innerText = incorrectCount;
  finalScorePercent.innerText = `${scorePercent}%`;

  if (isPassed) {
    resultTitle.innerText = "Congratulations! You Passed";
    resultSubtitle.innerText = `Superb achievement! You scored ${correctCount} out of ${testQuestions.length} correctly. You've met the official 75% pass mark.`;
    statusIconBg.className = "w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center animate-bounce";
    statusIcon.setAttribute("data-lucide", "award");

    // Launch celebratory confetti effects
    triggerConfetti();
  } else {
    resultTitle.innerText = "Failed - Keep Studying";
    resultSubtitle.innerText = `You scored ${correctCount} out of ${testQuestions.length} correctly. Don't worry, review the core explanation sheet below and retry to secure a pass.`;
    statusIconBg.className = "w-20 h-20 rounded-full bg-red-100 text-red-700 flex items-center justify-center";
    statusIcon.setAttribute("data-lucide", "alert-triangle");
  }

  // Handle timeout custom overlays
  if (isTimeout) {
    resultSubtitle.innerText = `Time out! Your exam period expired. You scored ${correctCount} out of ${testQuestions.length} correct answers.`;
  }

  // Configure retry parameters
  btnRetryActive.setAttribute("onclick", `startTest(${currentTestIndex})`);

  // Draw Study Review sheets
  activeReviewFilter = 'all';
  filterAllBtn.className = "px-3.5 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all";
  filterWrongBtn.className = "px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-all";
  renderReviewSheet();

  // View toggle
  testScreen.classList.add("hidden");
  homeScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  lucide.createIcons();
}

function retryActiveTest() {
  startTest(currentTestIndex);
}

function toggleShuffleQuestionsPreference() {
  const shuffleQuestionsToggle = document.getElementById("shuffleQuestionsToggle");
  if (!shuffleQuestionsToggle) return;

  setShuffleQuestionsPreference(shuffleQuestionsToggle.checked);
}

function setReviewFilter(filterType) {
  activeReviewFilter = filterType;
  if (filterType === 'all') {
    filterAllBtn.className = "px-3.5 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all";
    filterWrongBtn.className = "px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-all";
  } else {
    filterAllBtn.className = "px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-all";
    filterWrongBtn.className = "px-3.5 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all";
  }
  renderReviewSheet();
}

// Generate the beautiful Study Review list below score summary
function renderReviewSheet() {
  reviewQuestionsContainer.innerHTML = "";

  const filtered = testQuestions.filter((q) => {
    if (activeReviewFilter === 'wrong') return !q.isCorrect;
    return true;
  });

  if (filtered.length === 0) {
    reviewQuestionsContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <p class="text-sm font-semibold">No questions found for this filter.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "border border-slate-200 bg-slate-50/50 rounded-xl p-5 relative overflow-hidden";

    const statusLabel = q.isCorrect
      ? `<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Correct</span>`
      : `<span class="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><i data-lucide="x" class="w-3.5 h-3.5"></i> Incorrect</span>`;

    // Draw answers mapping block showing user choices vs correct keys
    let answersSheetHtml = "";
    q.answers.forEach((ans) => {
      let statusColor = "text-slate-500";
      let checkIconHtml = "";

      if (ans.isCorrectAnswer) {
        statusColor = "text-emerald-700 font-bold";
        checkIconHtml = `<span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-extrabold flex items-center gap-0.5"><i data-lucide="check" class="w-3 h-3"></i> Correct Key</span>`;
      } else if (ans.wasSelected && !ans.isCorrectAnswer) {
        statusColor = "text-red-700 font-medium";
        checkIconHtml = `<span class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold flex items-center gap-0.5"><i data-lucide="x" class="w-3 h-3"></i> Your selection</span>`;
      }

      answersSheetHtml += `
        <div class="flex items-center justify-between text-xs py-1 border-b border-slate-100">
          <span class="${statusColor}">${String.fromCharCode(65 + ans.index)}. ${ans.text}</span>
          ${checkIconHtml}
        </div>
      `;
    });

    card.innerHTML = `
      <div class="flex items-start justify-between mb-3 flex-wrap gap-2">
        <span class="text-xs font-extrabold text-blue-700">QUESTION ${q.questionNumber}</span>
        ${statusLabel}
      </div>
      <h4 class="text-slate-800 font-bold text-sm mb-3">${q.questionText}</h4>
      
      <div class="bg-white border border-slate-100 rounded-lg p-3 space-y-1 mb-3">
        ${answersSheetHtml}
      </div>

      <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs leading-relaxed text-slate-600">
        <span class="font-bold text-blue-800 block mb-0.5">Explanation Study Note:</span>
        ${q.explanation}
      </div>
    `;

    reviewQuestionsContainer.appendChild(card);
  });

  lucide.createIcons();
}

// Canvas-based Custom Confetti Particle System
function triggerConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  canvas.classList.remove("hidden");
  const ctx = canvas.getContext("2d");

  // Resize to full screen
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      r: Math.random() * 6 + 4,
      d: Math.random() * width,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  let animationFrameId;
  let durationTracker = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p, idx) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });

    update();
  }

  function update() {
    durationTracker++;

    // Cycle particles reaching bottom
    particles.forEach((p) => {
      if (p.y > height) {
        p.x = Math.random() * width;
        p.y = -20;
        p.tilt = Math.random() * 10 - 5;
      }
    });

    // Terminate confetti loop after 5 seconds to free system threads
    if (durationTracker < 300) {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, width, height);
      canvas.classList.add("hidden");
      cancelAnimationFrame(animationFrameId);
    }
  }

  draw();
}
