(() => {
  "use strict";

  const STORAGE_KEY = "codeBloomProblems";
  const DAILY_GOAL = 2;
  const TOPIC_TARGET = 10;

  const TOPICS = [
    "Arrays",
    "Strings",
    "Linked Lists",
    "Stacks & Queues",
    "Trees",
    "Graphs",
    "Dynamic Programming",
    "Other"
  ];

  const $ = (id) => document.getElementById(id);

  const formSection = $("problem-form-section");
  const form = $("problem-form");
  const formError = $("form-error");
  const nameInput = $("problem-name");
  const problemList = $("problem-list");
  const weakTopicsList = $("weak-topics-list");
  const problemCount = $("problem-count");

  let problems = loadProblems();
  let editingProblemId = null;
  let selectedCalendarDate = today();

  function safeParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function today() {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function dateFromDaysAgo(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - days);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function normalizeProblem(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const name = String(
      item.name ?? item.problemName ?? item.title ?? ""
    ).trim();

    if (!name) {
      return null;
    }

    const status =
      item.learningStatus ??
      item.learningStatusValue ??
      item.status ??
      "revision";

    const date = String(
      item.date ?? item.problemDate ?? item.createdAt ?? today()
    ).slice(0, 10);

    return {
      id: String(
        item.id ??
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      ),
      name,
      platform: String(item.platform ?? "Other"),
      topic: TOPICS.includes(String(item.topic))
        ? String(item.topic)
        : "Other",
      difficulty: ["Easy", "Medium", "Hard"].includes(item.difficulty)
        ? item.difficulty
        : "Easy",
      learningStatus: ["independent", "hints", "revision"].includes(status)
        ? status
        : (item.solved === true ? "independent" : "revision"),
      date,
      solved:
        Boolean(item.solved) ||
        status === "independent" ||
        status === "hints",
      needsRevision:
        Boolean(item.needsRevision) || status === "revision"
    };
  }

  // Load existing entries without clearing browser storage.
  function loadProblems() {
    const current = safeParse(localStorage.getItem(STORAGE_KEY));

    if (Array.isArray(current)) {
      return current.map(normalizeProblem).filter(Boolean);
    }

    // Attempt migration from a compatible older storage key.
    for (const key of Object.keys(localStorage)) {
      const parsed = safeParse(localStorage.getItem(key));

      if (
        Array.isArray(parsed) &&
        parsed.some(item =>
          item &&
          typeof item === "object" &&
          ("name" in item || "problemName" in item) &&
          ("topic" in item || "platform" in item)
        )
      ) {
        const migrated = parsed.map(normalizeProblem).filter(Boolean);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));

        return migrated;
      }

      if (parsed && Array.isArray(parsed.problems)) {
        const migrated = parsed.problems
          .map(normalizeProblem)
          .filter(Boolean);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));

        return migrated;
      }
    }

    return [];
  }

  function saveProblems() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(problems)
      );
    } catch (error) {
      console.error("Could not save CodeBloom data:", error);
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDate(dateString) {
    const parts = String(dateString).split("-").map(Number);

    if (parts.length !== 3 || !parts.every(Number.isFinite)) {
      return dateString;
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    ).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // FORM: open and close
  function showForm() {
    formSection.hidden = false;
    formError.textContent = "";

    if (!$("problem-date").value) {
      $("problem-date").value = today();
    }

    formSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    nameInput.focus({ preventScroll: true });
  }

  
  function hideForm() {
    formSection.hidden = true;
    formError.textContent = "";
    form.reset();
    $("problem-date").value = today();

    editingProblemId = null;

    formSection.querySelector("h3").textContent =
      "🌷 Log a coding problem";

    form.querySelector('[type="submit"]').textContent =
      "Save Problem ♡";
  }


  $("open-form").addEventListener("click", showForm);
  $("close-form").addEventListener("click", hideForm);
  $("cancel-form").addEventListener("click", hideForm);

  $("view-log").addEventListener("click", () => {
    $("my-log").scrollIntoView({ behavior: "smooth" });
  });

  $("nav-add-problem").addEventListener("click", event => {
    event.preventDefault();
    showForm();
  });

  // Navigation highlighting
  document.querySelectorAll(".nav-link[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item => {
        item.classList.remove("active");
      });

      link.classList.add("active");
    });
  });

  // FORM: save a new problem
  form.addEventListener("submit", event => {
    event.preventDefault();
    formError.textContent = "";

    const name = nameInput.value.trim();
    const platform = $("platform").value;
    const topic = $("topic").value;
    const difficulty = $("difficulty").value;
    const learningStatus = $("learning-status").value;
    const date = $("problem-date").value;

    if (
      !name ||
      !platform ||
      !topic ||
      !difficulty ||
      !learningStatus ||
      !date
    ) {
      formError.textContent = "Please complete every required field.";
      return;
    }

    if (date > today()) {
      formError.textContent = "Choose today or a date in the past.";
      return;
    }

    
    const duplicate = problems.some(problem =>
      problem.id !== editingProblemId &&
      problem.name.toLowerCase() === name.toLowerCase() &&
      problem.platform === platform &&
      problem.topic === topic &&
      problem.date === date
    );

    if (duplicate) {
      formError.textContent =
        "This problem is already in your log for that date.";
      return;
    }

    if (editingProblemId !== null) {
      const existingProblem = problems.find(
        problem => problem.id === editingProblemId
      );

      if (!existingProblem) {
        formError.textContent =
          "Problem not found. Please close the form and try again.";
        return;
      }

      existingProblem.name = name;
      existingProblem.platform = platform;
      existingProblem.topic = topic;
      existingProblem.difficulty = difficulty;
      existingProblem.learningStatus = learningStatus;
      existingProblem.date = date;
      existingProblem.solved = learningStatus !== "revision";
      existingProblem.needsRevision = learningStatus === "revision";

      saveProblems();
      renderAll();
      hideForm();

      return;
    }


    problems.unshift({
      id: Date.now().toString(36) +
        Math.random().toString(36).slice(2, 7),
      name,
      platform,
      topic,
      difficulty,
      learningStatus,
      date,
      solved: learningStatus !== "revision",
      needsRevision: learningStatus === "revision"
    });

    saveProblems();
    renderAll();
    hideForm();

    $("my-log").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  function statusLabel(problem) {
    if (
      problem.needsRevision ||
      problem.learningStatus === "revision"
    ) {
      return "Needs revision";
    }

    if (problem.learningStatus === "hints") {
      return "Solved with hints";
    }

    return problem.solved
      ? "Solved independently"
      : "Not solved yet";
  }

  // CODING LOG
  
  function renderLog() {
    problemCount.textContent =
      `${problems.length} ${problems.length === 1 ? "entry" : "entries"}`;

    const searchText = document
      .getElementById("search-problems")
      .value.trim().toLowerCase();

    const topic = document.getElementById("filter-topic").value;
    const difficulty = document.getElementById("filter-difficulty").value;
    const platform = document.getElementById("filter-platform").value;
    const status = document.getElementById("filter-status").value;
    const sort = document.getElementById("sort-problems").value;

    const results = problems.filter(problem => {
      const matchesSearch = problem.name.toLowerCase().includes(searchText);
      const matchesTopic = topic === "all" || problem.topic === topic;
      const matchesDifficulty =
        difficulty === "all" || problem.difficulty === difficulty;
      const matchesPlatform =
        platform === "all" || problem.platform === platform;

      let matchesStatus = true;

      if (status === "independent") {
        matchesStatus =
          problem.solved &&
          !problem.needsRevision &&
          problem.learningStatus !== "hints" &&
          problem.learningStatus !== "revision";
      } else if (status === "hints") {
        matchesStatus =
          problem.learningStatus === "hints" &&
          !problem.needsRevision;
      } else if (status === "revision") {
        matchesStatus =
          problem.needsRevision ||
          problem.learningStatus === "revision";
      }

      return (
        matchesSearch &&
        matchesTopic &&
        matchesDifficulty &&
        matchesPlatform &&
        matchesStatus
      );
    });

    const difficultyOrder = {
      Easy: 1,
      Medium: 2,
      Hard: 3
    };

    results.sort((a, b) => {
      if (sort === "newest") {
        return b.date.localeCompare(a.date);
      }

      if (sort === "oldest") {
        return a.date.localeCompare(b.date);
      }

      if (sort === "difficulty-asc") {
        return (
          (difficultyOrder[a.difficulty] || 99) -
          (difficultyOrder[b.difficulty] || 99)
        );
      }

      if (sort === "difficulty-desc") {
        return (
          (difficultyOrder[b.difficulty] || 0) -
          (difficultyOrder[a.difficulty] || 0)
        );
      }

      if (sort === "name-asc") {
        return a.name.localeCompare(b.name);
      }

      return 0;
    });

    document.getElementById("filter-results").textContent =
      `Showing ${results.length} of ${problems.length} ${
        problems.length === 1 ? "problem" : "problems"
      }`;

    if (problems.length === 0) {
      problemList.innerHTML =
        '<p class="empty-state">No problems logged yet. Add your first problem! 🌱</p>';
      return;
    }

    if (results.length === 0) {
      problemList.innerHTML =
        '<p class="empty-state">No matching problems found. Try changing your search or filters. 🌷</p>';
      return;
    }

    problemList.innerHTML = results
      .map(problem => `
        <article class="problem-card" data-id="${escapeHTML(problem.id)}">
          <div class="problem-card-top">
            <div>
              <h4>${escapeHTML(problem.name)}</h4>

              <div class="problem-meta">
                <span class="pill">${escapeHTML(problem.platform)}</span>
                <span class="pill">${escapeHTML(problem.topic)}</span>
                <span class="pill ${problem.difficulty.toLowerCase()}">
                  ${escapeHTML(problem.difficulty)}
                </span>
              </div>
            </div>

            <time class="problem-date" datetime="${escapeHTML(problem.date)}">
              ${escapeHTML(formatDate(problem.date))}
            </time>
          </div>

          <div class="problem-status">
            ${escapeHTML(statusLabel(problem))}
          </div>

          <div class="problem-actions">
            <button
              type="button"
              class="small-button ${
                problem.solved && !problem.needsRevision ? "done" : ""
              }"
              data-action="toggle-solved"
            >
              ${
                problem.solved && !problem.needsRevision
                  ? "✓ Solved"
                  : "Mark solved"
              }
            </button>

            <button
              type="button"
              class="small-button"
              data-action="revision"
            >
              ${problem.needsRevision ? "Revision marked" : "Needs revision"}
            </button>

            <button
              type="button"
              class="small-button"
              data-action="edit"
            >
              ✏️ Edit
            </button>

            <button
              type="button"
              class="small-button danger"
              data-action="delete"
            >
              Delete
            </button>
          </div>
        </article>
      `)
      .join("");
  }
  
  // Connect Search, Filter and Sort controls
  const logControlIds = [
    "search-problems",
    "filter-topic",
    "filter-difficulty",
    "filter-platform",
    "filter-status",
    "sort-problems"
  ];

  logControlIds.forEach(id => {
    const control = document.getElementById(id);

    control.addEventListener(
      id === "search-problems" ? "input" : "change",
      renderLog
    );
  });

  // Reset all search and filter settings
  document.getElementById("reset-filters").addEventListener("click", () => {
    document.getElementById("search-problems").value = "";
    document.getElementById("filter-topic").value = "all";
    document.getElementById("filter-difficulty").value = "all";
    document.getElementById("filter-platform").value = "all";
    document.getElementById("filter-status").value = "all";
    document.getElementById("sort-problems").value = "newest";

    renderLog();
  });

  // Handle log buttons without creating duplicate listeners.
  problemList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const card = button.closest(".problem-card");

    if (!card) return;

    const problem = problems.find(
      item => item.id === card.dataset.id
    );

    if (!problem) return;
    
    if (button.dataset.action === "edit") {
      editingProblemId = problem.id;

      $("problem-name").value = problem.name;
      $("platform").value = problem.platform;
      $("topic").value = problem.topic;
      $("difficulty").value = problem.difficulty;
      $("learning-status").value = problem.learningStatus;
      $("problem-date").value = problem.date;

      showForm();

      $("problem-form-section").querySelector("h3").textContent =
        "✏️ Edit coding problem";

      form.querySelector('[type="submit"]').textContent =
        "Save Changes ♡";

      return;
    }

    if (button.dataset.action === "delete") {
      if (!window.confirm(`Delete "${problem.name}" from your log?`)) {
        return;
      }

      problems = problems.filter(item => item.id !== problem.id);
    } else if (button.dataset.action === "toggle-solved") {
      problem.solved = !problem.solved;
      problem.needsRevision = false;
      problem.learningStatus = problem.solved
        ? "independent"
        : "revision";
    } else if (button.dataset.action === "revision") {
      problem.needsRevision = !problem.needsRevision;

      if (problem.needsRevision) {
        problem.solved = false;
        problem.learningStatus = "revision";
      } else {
        problem.learningStatus = "independent";
        problem.solved = true;
      }
    }

    saveProblems();
    renderAll();
  });

  // DASHBOARD STATISTICS
  function renderStats() {
    const solved = problems.filter(
      problem => problem.solved && !problem.needsRevision
    );

    $("total-solved").textContent = solved.length;

    const byDate = new Map();

    solved.forEach(problem => {
      byDate.set(
        problem.date,
        (byDate.get(problem.date) || 0) + 1
      );
    });

    $("daily-goal").textContent =
      `${byDate.get(today()) || 0} / ${DAILY_GOAL}`;

    $("practice-days").textContent =
      new Set(problems.map(problem => problem.date).filter(Boolean)).size;

    let streak = 0;
    let cursor = today();

    if (!byDate.has(cursor)) {
      cursor = dateFromDaysAgo(1);
    }

    while (byDate.has(cursor)) {
      streak++;

      const date = new Date(cursor + "T12:00:00");
      date.setDate(date.getDate() - 1);

      cursor = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");
    }

    $("streak").textContent = streak;
  }

  // DSA TOPIC PROGRESS + WEAK TOPICS
  function renderProgress() {
    document.querySelectorAll(".topic[data-topic]").forEach(topicElement => {
      const topicName = topicElement.dataset.topic;

      const topicProblems = problems.filter(
        problem => problem.topic === topicName
      );

      const solvedCount = topicProblems.filter(
        problem => problem.solved && !problem.needsRevision
      ).length;

      const percentage = Math.min(
        Math.round((solvedCount / TOPIC_TARGET) * 100),
        100
      );

      const fill = topicElement.querySelector(".progress-fill");
      const label = topicElement.querySelector(".topic-percentage");

      if (fill) {
        fill.style.width = `${percentage}%`;
      }

      if (label) {
        label.textContent = `${percentage}%`;
      }
    });

    if (problems.length === 0) {
      weakTopicsList.innerHTML =
        '<p class="muted">Add and solve problems to discover which topics need practice.</p>';
      return;
    }

    const weakTopics = TOPICS
      .map(topicName => {
        const topicProblems = problems.filter(
          problem => problem.topic === topicName
        );

        const solvedCount = topicProblems.filter(
          problem => problem.solved && !problem.needsRevision
        ).length;

        return {
          name: topicName,
          total: topicProblems.length,
          percentage: Math.min(
            Math.round((solvedCount / TOPIC_TARGET) * 100),
            100
          )
        };
      })
      .filter(topic => topic.total > 0 && topic.percentage < 50)
      .sort((a, b) =>
        a.percentage - b.percentage || b.total - a.total
      );

    if (weakTopics.length === 0) {
      weakTopicsList.innerHTML =
        '<p class="muted">Amazing progress! All topics with logged problems have reached at least 50% progress. 🎉</p>';
      return;
    }

    weakTopicsList.innerHTML = weakTopics.map(topic => {
      const message = topic.percentage === 0
        ? "Try solving your first problem in this topic."
        : "Keep practising to improve your progress.";

      return `
        <div class="weak-topic-item">
          <strong>${escapeHTML(topic.name)}</strong>
          <p>
            ${topic.percentage}% progress ·
            ${topic.total} ${topic.total === 1 ? "problem" : "problems"} added
          </p>
          <p>${message}</p>
        </div>
      `;
    }).join("");
  }

  // CODING ACTIVITY CALENDAR
  function renderCalendar() {
    const calendar = $("activity-calendar");
    
    const counts = new Map();

    problems.forEach(problem => {
      if (problem.solved && !problem.needsRevision) {
        counts.set(
          problem.date,
          (counts.get(problem.date) || 0) + 1
        );
      }
    });



    calendar.innerHTML = "";

    // Display 12 weeks of activity.
    for (let i = 83; i >= 0; i--) {
      const date = dateFromDaysAgo(i);
      const count = counts.get(date) || 0;

      const level =
        count === 0 ? 0 :
        count === 1 ? 1 :
        count === 2 ? 2 :
        count <= 4 ? 3 : 4;

      
        const cell = document.createElement("button");

        cell.type = "button";
        cell.className = `activity-day level-${level}`;
        cell.dataset.date = date;
        cell.title = `${date}: ${count} ${count === 1 ? "problem" : "problems"}`;
        cell.setAttribute("aria-label", cell.title);
        cell.setAttribute(
          "aria-pressed",
          String(date === selectedCalendarDate)
        );

        if (date === selectedCalendarDate) {
          cell.classList.add("selected-day");
        }

        calendar.appendChild(cell);

    }
  }
  
function renderSelectedDay() {
  const title = $("selected-day-title");
  const list = $("selected-day-problems");

  if (!title || !list) return;

  title.textContent =
    `Problems for ${formatDate(selectedCalendarDate)}`;

  const dayProblems = problems.filter(
    problem => problem.date === selectedCalendarDate
  );

  if (dayProblems.length === 0) {
    list.innerHTML =
      '<p class="muted">No problems logged on this day. Every new day is another chance to grow! 🌱</p>';
    return;
  }

  list.innerHTML = dayProblems.map(problem => `
    <div class="selected-problem">
      <strong>${escapeHTML(problem.name)}</strong>
      <span>${escapeHTML(problem.topic)} · ${escapeHTML(problem.difficulty)}</span>
      <small>${escapeHTML(problem.platform)} — ${escapeHTML(statusLabel(problem))}</small>
    </div>
  `).join("");
}

$("activity-calendar").addEventListener("click", event => {
  const cell = event.target.closest("button[data-date]");

  if (!cell) return;

  selectedCalendarDate = cell.dataset.date;

  renderCalendar();
  renderSelectedDay();
});


 function renderAll() {
  renderLog();
  renderStats();
  renderProgress();
  renderCalendar();
  renderSelectedDay();
}

  // Initial setup
  $("problem-date").value = today();
  renderAll();
})();