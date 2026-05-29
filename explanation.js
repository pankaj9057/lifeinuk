const THEME_OVERRIDE_KEY = "life_uk_theme_override";
let themeOverrideMode = null;
let explanationTests = [];

const explanationContainer = document.getElementById("explanationContainer");
const searchInput = document.getElementById("searchInput");
const totalExams = document.getElementById("totalExams");
const totalQuestions = document.getElementById("totalQuestions");
const totalNotes = document.getElementById("totalNotes");

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
  } catch (error) {
    console.warn("Could not load theme override:", error);
  }
}

function saveThemeOverride() {
  try {
    if (themeOverrideMode) {
      localStorage.setItem(THEME_OVERRIDE_KEY, themeOverrideMode);
    } else {
      localStorage.removeItem(THEME_OVERRIDE_KEY);
    }
  } catch (error) {
    console.warn("Could not save theme override:", error);
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

  setInterval(() => {
    applyThemeByTime();
  }, 60000);
}

function transformTests(rawTests) {
  if (!Array.isArray(rawTests)) {
    console.error("Tests dataset must be an array, received:", typeof rawTests);
    return [];
  }

  return rawTests.map((test) => ({
    name: test.name,
    questions: test.questions.map((question) => ({
      questionNumber: question[0],
      questionText: question[1],
      isMultiSelect: question[2],
      answers: question[3].map((answer, index) => ({
        index,
        text: answer[0],
        isCorrectAnswer: answer[1]
      })),
      correctAnswer: question[4],
      explanation: question[5]
    }))
  }));
}

async function loadTestsData() {
  try {
    const datasetUrl = new URL("./questiondata.json", window.location.href);
    const response = await fetch(datasetUrl.href, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading ${datasetUrl.href}`);
    }

    const rawTests = await response.json();
    explanationTests = transformTests(rawTests);
  } catch (error) {
    console.error("Failed to load tests dataset:", error);
    explanationTests = [];
  }
}

function getQuestionCount() {
  return explanationTests.reduce((count, test) => count + test.questions.length, 0);
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function getFilteredTests() {
  const query = normalizeText(searchInput.value).trim();
  if (!query) return explanationTests;

  return explanationTests
    .map((test) => {
      const matchingQuestions = test.questions.filter((question) => {
        const answerText = question.answers.map((answer) => answer.text).join(" ");
        return normalizeText(test.name).includes(query) ||
          normalizeText(question.questionText).includes(query) ||
          normalizeText(question.correctAnswer).includes(query) ||
          normalizeText(question.explanation).includes(query) ||
          normalizeText(answerText).includes(query);
      });

      return {
        ...test,
        questions: matchingQuestions
      };
    })
    .filter((test) => test.questions.length > 0);
}

function renderExplanationPage() {
  const filteredTests = getFilteredTests();
  explanationContainer.innerHTML = "";

  if (filteredTests.length === 0) {
    explanationContainer.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center custom-shadow">
        <p class="text-sm font-semibold text-slate-700">No explanations match your search.</p>
        <p class="text-xs text-slate-500 mt-1">Try a different exam name, answer, or keyword.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filteredTests.forEach((test, testIndex) => {
    const section = document.createElement("details");
    section.className = "bg-white border border-slate-200 rounded-2xl custom-shadow overflow-hidden";
    section.open = testIndex === 0;

    const questionCards = test.questions.map((question) => {
      const answerLines = question.answers.map((answer) => {
        const badgeClass = answer.isCorrectAnswer
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-500";

        return `
          <div class="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0">
            <div class="text-sm ${answer.isCorrectAnswer ? "font-semibold text-emerald-700" : "text-slate-600"}">
              ${String.fromCharCode(65 + answer.index)}. ${answer.text}
            </div>
            <span class="text-[11px] font-bold px-2 py-1 rounded-full ${badgeClass}">${answer.isCorrectAnswer ? "Correct answer" : "Option"}</span>
          </div>
        `;
      }).join("");

      return `
        <article class="border border-slate-200 rounded-2xl p-5 bg-slate-50/40">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span class="text-xs font-extrabold text-blue-700 uppercase tracking-wider">Question ${question.questionNumber}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${question.isMultiSelect ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}">
              ${question.isMultiSelect ? "Multiple choice" : "Single choice"}
            </span>
          </div>
          <h3 class="text-base md:text-lg font-bold text-slate-900 leading-snug mb-3">${question.questionText}</h3>

          <div class="bg-white border border-slate-200 rounded-xl p-3 mb-3">
            ${answerLines}
          </div>

          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 mb-2">Explanation</p>
            <p class="text-sm text-slate-700 leading-relaxed">${question.explanation}</p>
          </div>
        </article>
      `;
    }).join("");

    section.innerHTML = `
      <summary class="list-none cursor-pointer select-none p-5 md:p-6 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Exam ${testIndex + 1}</p>
          <h2 class="text-xl md:text-2xl font-black mt-1">${test.name}</h2>
          <p class="text-xs text-slate-300 mt-1">${test.questions.length} questions with explanations</p>
        </div>
        <div class="text-white/80">
          <i data-lucide="chevron-down" class="w-5 h-5"></i>
        </div>
      </summary>
      <div class="p-4 md:p-6 space-y-4">
        ${questionCards}
      </div>
    `;

    explanationContainer.appendChild(section);
  });

  lucide.createIcons();
}

function updateSummaryStats() {
  totalExams.innerText = String(explanationTests.length);
  totalQuestions.innerText = String(getQuestionCount());
  totalNotes.innerText = String(getQuestionCount());
}

async function initialize() {
  startThemeScheduler();
  await loadTestsData();
  updateSummaryStats();
  renderExplanationPage();
  searchInput.addEventListener("input", renderExplanationPage);
  lucide.createIcons();
}

window.addEventListener("DOMContentLoaded", initialize);