export {};

declare global {
  interface Window {
    api: {
      getProgressByDate: (date: string) => Promise<any>;
      addTask: (date: string, title: string) => Promise<any>;
      toggleTask: (date: string, taskId: string) => Promise<any>;
      deleteTask: (date: string, taskId: string) => Promise<any>;
      getAnalytics: () => Promise<any[]>;
    };

    Chart: any;
  }
}

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface Task {
  _id: string;
  title: string;
  completed: boolean;
}

interface DailyData {
  date: string;
  tasks: Task[];
}

interface DayAnalytics {
  date: string;
  total: number;
  completed: number;
  percentage: number;
  tasks: string[];
  completedTasks: string[];
}

/* ========================================================= */
/* STATE */
/* ========================================================= */

let selectedDate = getTodayString();

let dailyDonutChart: any = null;
let activityLineChart: any = null;
let completionBarChart: any = null;
let radarChart: any = null;
let distributionChart: any = null;

let analyticsData: DayAnalytics[] = [];

const chartColors = [
  "#00d9ff",
  "#ff238f",
  "#8b5cf6",
  "#00e676",
  "#ffb300",
  "#ec4899",
  "#22d3ee",
  "#a78bfa",
];

/* ========================================================= */
/* DATE HELPERS */
/* ========================================================= */

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/* ========================================================= */
/* ANALYTICS */
/* ========================================================= */

async function loadAnalytics() {
  try {
    const result = await window.api.getAnalytics();
    analyticsData = Array.isArray(result) ? result : [];

    renderHeatmap();
    renderAnalyticsCharts();
    renderCategoryPerformance();
    renderRightCharts();
    renderInsights();
  } catch (error) {
    console.error("Failed to load analytics:", error);
  }
}

/* ========================================================= */
/* DAILY DATA */
/* ========================================================= */

async function loadSelectedDay() {
  try {
    const data: DailyData = await window.api.getProgressByDate(selectedDate);
    const tasks = data?.tasks ?? [];

    renderTaskList(tasks);
    updateDailyStats(tasks);
    updateSelectedDateUI();
  } catch (error) {
    console.error("Failed to load daily progress:", error);
  }
}

/* ========================================================= */
/* TASK LIST */
/* ========================================================= */

function renderTaskList(tasks: Task[]) {
  const list = document.getElementById("taskList")!;

  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty-tasks">
        <i class="fa-solid fa-list-check"></i>
        <div>No tasks yet.</div>
        <small>Add your first task above.</small>
      </div>
    `;
    return;
  }

  list.innerHTML = tasks
    .map(
      (task) => `
      <div class="task-item ${task.completed ? "completed" : ""}">
        <input
          class="task-checkbox"
          type="checkbox"
          data-task-id="${task._id}"
          ${task.completed ? "checked" : ""}
        >
        <span class="task-title">
          ${escapeHtml(task.title)}
        </span>
        <button class="task-delete-btn" data-delete-id="${task._id}" title="Delete task">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `,
    )
    .join("");

  list
    .querySelectorAll<HTMLInputElement>(".task-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        const taskId = checkbox.dataset.taskId;
        if (!taskId) return;
        await window.api.toggleTask(selectedDate, taskId);
        await loadSelectedDay();
        await loadAnalytics();
      });
    });

  list
    .querySelectorAll<HTMLButtonElement>(".task-delete-btn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const taskId = btn.dataset.deleteId;
        if (!taskId) return;
        await window.api.deleteTask(selectedDate, taskId);
        await loadSelectedDay();
        await loadAnalytics();
      });
    });
}

/* ========================================================= */
/* DAILY STATS */
/* ========================================================= */

function updateDailyStats(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const remaining = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("taskCount")!.textContent = `${completed}/${total}`;
  document.getElementById("dailyProgressText")!.textContent = `${percentage}%`;
  document.getElementById("dailyProgressFill")!.style.width = `${percentage}%`;
  document.getElementById("dailyDonutPercent")!.textContent = `${percentage}%`;
  document.getElementById("completedCount")!.textContent = String(completed);
  document.getElementById("remainingCount")!.textContent = String(remaining);

  updateDailyDonut(completed, remaining);
}

/* ========================================================= */
/* DAILY DONUT */
/* ========================================================= */

function updateDailyDonut(completed: number, remaining: number) {
  const canvas = document.getElementById(
    "dailyDonutChart",
  ) as HTMLCanvasElement;
  if (!dailyDonutChart) {
    dailyDonutChart = new window.Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Completed", "Remaining"],
        datasets: [
          {
            data: [completed, remaining],
            backgroundColor: ["#00d9ff", "#1a2332"],
            borderWidth: 0,
            hoverOffset: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "78%",
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
      },
    });
  } else {
    dailyDonutChart.data.datasets[0].data = [completed, remaining];
    dailyDonutChart.update();
  }
}

/* ========================================================= */
/* SELECTED DATE UI */
/* ========================================================= */

function updateSelectedDateUI() {
  const today = getTodayString();
  const title =
    selectedDate === today ? "Today's Tasks" : formatDate(selectedDate);
  document.getElementById("taskDateTitle")!.textContent = title;
  document.getElementById("pieTitle")!.textContent =
    selectedDate === today
      ? "Today's Breakdown"
      : `${formatShortDate(selectedDate)} Breakdown`;
  document.getElementById("headerSelectedDate")!.textContent =
    selectedDate === today ? "Today" : formatDate(selectedDate);
}

/* ========================================================= */
/* HEATMAP */
/* ========================================================= */

function renderHeatmap() {
  const heatmap = document.getElementById("heatmap")!;
  const months = document.getElementById("heatmapMonths")!;
  const days = getLast12MonthsDays();

  heatmap.innerHTML = "";
  months.innerHTML = "";

  days.forEach((date, index) => {
    const data = analyticsData.find((item) => item.date === date);
    const total = data?.total ?? 0;
    const completed = data?.completed ?? 0;
    const level = getHeatLevel(completed, total);

    const cell = document.createElement("div");
    cell.className = `heat-cell level-${level}`;
    if (date === selectedDate) cell.classList.add("selected");
    cell.dataset.date = date;
    cell.title = buildTooltip(data);

    cell.addEventListener("click", async () => {
      selectedDate = date;
      renderHeatmap();
      await loadSelectedDay();
    });

    heatmap.appendChild(cell);

    if (index === 0 || new Date(`${date}T00:00:00`).getDate() === 1) {
      const monthLabel = document.createElement("span");
      monthLabel.className = "month-label";
      monthLabel.textContent = new Date(`${date}T00:00:00`).toLocaleDateString(
        "en-IN",
        { month: "short" },
      );
      monthLabel.style.left = `${(index / days.length) * 100}%`;
      months.appendChild(monthLabel);
    }
  });

  const totalCompleted = analyticsData.reduce(
    (sum, item) => sum + item.completed,
    0,
  );
  const active = analyticsData.filter((item) => item.completed > 0).length;

  document.getElementById("activeDays")!.textContent = String(active);
  document.getElementById("totalTracked")!.textContent = String(totalCompleted);
}

function getLast12MonthsDays(): string[] {
  const days: string[] = [];

  const today = new Date();

  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);

    date.setDate(today.getDate() - i);

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    days.push(`${year}-${month}-${day}`);
  }

  return days;
}

function getHeatLevel(completed: number, total: number): number {
  if (total === 0 || completed === 0) return 0;
  const percentage = (completed / total) * 100;
  if (percentage < 25) return 1;
  if (percentage < 50) return 2;
  if (percentage < 80) return 3;
  return 4;
}

function buildTooltip(data?: DayAnalytics): string {
  if (!data || data.total === 0) {
    return `${formatDate(data?.date ?? selectedDate)}\nNo tasks recorded`;
  }
  const completed = data.completedTasks.length
    ? data.completedTasks.join(", ")
    : "None";
  return [
    formatDate(data.date),
    `${data.completed}/${data.total} tasks completed`,
    `${data.percentage}% completion`,
    "",
    "Completed:",
    completed,
  ].join("\n");
}

/* ========================================================= */
/* MAIN ANALYTICS CHARTS */
/* ========================================================= */

function renderAnalyticsCharts() {
  const last30 = analyticsData.slice(-30);
  const labels = last30.map((item) => formatShortDate(item.date));
  const percentages = last30.map((item) => item.percentage);
  const completed = last30.map((item) => item.completed);

  const lineCanvas = document.getElementById(
    "activityLineChart",
  ) as HTMLCanvasElement;
  if (!activityLineChart) {
    activityLineChart = new window.Chart(lineCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: percentages,
            borderColor: "#00d9ff",
            backgroundColor: "rgba(0,217,255,0.08)",
            fill: true,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#00d9ff",
          },
        ],
      },
      options: chartOptions(),
    });
  } else {
    activityLineChart.data.labels = labels;
    activityLineChart.data.datasets[0].data = percentages;
    activityLineChart.update();
  }

  const barCanvas = document.getElementById(
    "completionBarChart",
  ) as HTMLCanvasElement;
  if (!completionBarChart) {
    completionBarChart = new window.Chart(barCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: completed,
            backgroundColor: completed.map((_, i) =>
              i % 3 === 0 ? "#ff238f" : i % 3 === 1 ? "#8b5cf6" : "#00d9ff",
            ),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        ...chartOptions(),
        scales: {
          ...chartOptions().scales,
          y: {
            ...chartOptions().scales.y,
            beginAtZero: true,
            ticks: { ...chartOptions().scales.y.ticks, precision: 0 },
          },
        },
      },
    });
  } else {
    completionBarChart.data.labels = labels;
    completionBarChart.data.datasets[0].data = completed;
    completionBarChart.update();
  }

  const avg = last30.length
    ? Math.round(
        last30.reduce((sum, item) => sum + item.percentage, 0) / last30.length,
      )
    : 0;

  const totalCompleted = last30.reduce((sum, item) => sum + item.completed, 0);
  document.getElementById("avgCompletion")!.textContent = `${avg}%`;
  document.getElementById("weeklyCompleted")!.textContent =
    String(totalCompleted);
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#090e17",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#9ca8b8",
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: {
        display: true,
        grid: { color: "rgba(255,255,255,0.045)" },
        border: { display: false },
        ticks: { color: "#566376", font: { size: 7 }, maxTicksLimit: 4 },
      },
    },
  };
}

/* ========================================================= */
/* DYNAMIC CATEGORY & RADAR METRICS FROM DATABASE */
/* ========================================================= */

function getTopDynamicHabits() {
  const taskMap = new Map<string, { total: number; completed: number }>();

  analyticsData.forEach((day) => {
    day.tasks.forEach((title) => {
      const existing = taskMap.get(title) || { total: 0, completed: 0 };
      existing.total += 1;
      if (day.completedTasks.includes(title)) {
        existing.completed += 1;
      }
      taskMap.set(title, existing);
    });
  });

  return Array.from(taskMap.entries())
    .map(([name, stat]) => ({
      name,
      rate: Math.round((stat.completed / stat.total) * 100),
    }))
    .sort((a, b) => b.rate - a.rate);
}

function renderCategoryPerformance() {
  const container = document.getElementById("categoryBars")!;
  const habits = getTopDynamicHabits().slice(0, 10);

  if (!habits.length) {
    container.innerHTML = `<div style="color:var(--muted); font-size:9px; padding:10px;">Add tasks to view performance breakdown</div>`;
    return;
  }

  container.innerHTML = habits
    .map(
      (habit, index) => `
    <div class="category-row">
      <div class="category-label">
        <span>${escapeHtml(habit.name)}</span>
        <strong>${habit.rate}%</strong>
      </div>
      <div class="category-track">
        <div
          class="category-fill"
          style="width:${habit.rate}%; background: linear-gradient(90deg, ${chartColors[index % chartColors.length]}, #8b5cf6);"
        ></div>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderRightCharts() {
  const topHabits = getTopDynamicHabits().slice(0, 6);
  const labels = topHabits.length ? topHabits.map((h) => h.name) : ["No Tasks"];
  const values = topHabits.length ? topHabits.map((h) => h.rate) : [0];

  const radarCanvas = document.getElementById(
    "radarChart",
  ) as HTMLCanvasElement;
  if (!radarChart) {
    radarChart = new window.Chart(radarCanvas.getContext("2d"), {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139,92,246,0.13)",
            borderWidth: 2,
            pointBackgroundColor: "#00d9ff",
            pointBorderColor: "#00d9ff",
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { display: false },
            grid: { color: "rgba(255,255,255,0.07)" },
            angleLines: { color: "rgba(255,255,255,0.07)" },
            pointLabels: { color: "#748196", font: { size: 7 } },
          },
        },
      },
    });
  } else {
    radarChart.data.labels = labels;
    radarChart.data.datasets[0].data = values;
    radarChart.update();
  }

  const activeDays = analyticsData.filter((d) => d.total > 0);
  const overallAvg = activeDays.length
    ? Math.round(
        activeDays.reduce((sum, d) => sum + d.percentage, 0) /
          activeDays.length,
      )
    : 0;

  const distributionCanvas = document.getElementById(
    "distributionChart",
  ) as HTMLCanvasElement;
  if (!distributionChart) {
    distributionChart = new window.Chart(distributionCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Completed Rate", "Remaining Rate"],
        datasets: [
          {
            data: [overallAvg, 100 - overallAvg],
            backgroundColor: ["#00d9ff", "#ff238f"],
            borderWidth: 0,
            spacing: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: { legend: { display: false } },
      },
    });
  } else {
    distributionChart.data.datasets[0].data = [overallAvg, 100 - overallAvg];
    distributionChart.update();
  }

  document.getElementById("productivityScore")!.textContent = `${overallAvg}%`;
}

/* ========================================================= */
/* INSIGHTS */
/* ========================================================= */

function renderInsights() {
  if (!analyticsData.length) return;

  const activeDays = analyticsData.filter((item) => item.completed > 0);
  const average = analyticsData.length
    ? Math.round(
        analyticsData.reduce((sum, item) => sum + item.percentage, 0) /
          analyticsData.length,
      )
    : 0;

  const best = [...analyticsData].sort(
    (a, b) => b.percentage - a.percentage,
  )[0];

  document.getElementById("bestDay")!.textContent =
    best && best.total > 0
      ? `${formatShortDate(best.date)} · ${best.percentage}%`
      : "—";

  document.getElementById("insightActiveDays")!.textContent = String(
    activeDays.length,
  );
  document.getElementById("insightAverage")!.textContent = `${average}%`;

  let streak = 0;
  const reversed = [...analyticsData].reverse();
  for (const day of reversed) {
    if (day.completed > 0) streak++;
    else break;
  }

  document.getElementById("streakValue")!.textContent =
    `${streak} DAY${streak === 1 ? "" : "S"}`;
}

/* ========================================================= */
/* ADD TASK */
/* ========================================================= */

async function addTask() {
  const input = document.getElementById("taskInput") as HTMLInputElement;
  const title = input.value.trim();
  if (!title) return;

  try {
    await window.api.addTask(selectedDate, title);
    input.value = "";
    await loadSelectedDay();
    await loadAnalytics();
  } catch (error) {
    console.error("Failed to add task:", error);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========================================================= */
/* MONTH CALENDAR */
/* ========================================================= */

function renderCalendar() {
  const overlay = document.getElementById("calendarOverlay")!;

  const grid = document.getElementById("calendarGrid")!;

  const title = document.getElementById("calendarMonthTitle")!;

  const today = new Date();

  const year = today.getFullYear();

  const month = today.getMonth();

  const monthName = today.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  title.textContent = monthName;

  grid.innerHTML = "";

  const firstDay = new Date(year, month, 1);

  // Convert JS Sunday=0 format into Monday=0 format.
  const startingDay = (firstDay.getDay() + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before day 1.
  for (let i = 0; i < startingDay; i++) {
    const empty = document.createElement("div");

    empty.className = "calendar-day empty";

    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const data = analyticsData.find((item) => item.date === dateString);

    const isToday = dateString === getTodayString();

    /*
     * A tick appears ONLY when:
     * 1. There were tasks that day.
     * 2. Every task was completed.
     */
    const completedEverything = Boolean(
      data && data.total > 0 && data.completed === data.total,
    );

    const cell = document.createElement("button");

    cell.type = "button";

    cell.className = "calendar-day";

    if (isToday) {
      cell.classList.add("today");
    }

    if (completedEverything) {
      cell.classList.add("completed-day");
    }

    cell.innerHTML = `
      <span class="calendar-day-number">
        ${day}
      </span>

      ${completedEverything ? `<span class="calendar-day-check">✓</span>` : ""}
    `;

    cell.title =
      data && data.total > 0
        ? `${data.completed}/${data.total} tasks completed`
        : "No completed tasks";

    cell.addEventListener("click", async () => {
      selectedDate = dateString;

      renderHeatmap();

      await loadSelectedDay();

      closeCalendar();
    });

    grid.appendChild(cell);
  }

  overlay.classList.add("open");
}

function closeCalendar() {
  document.getElementById("calendarOverlay")!.classList.remove("open");
}

function setupEvents() {
  const form = document.getElementById("taskForm")!;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addTask();
  });

  document.getElementById("todayButton")!.addEventListener("click", () => {
    renderCalendar();
  });

  document.getElementById("calendarClose")!.addEventListener("click", () => {
    closeCalendar();
  });

  document
    .getElementById("calendarOverlay")!
    .addEventListener("click", (event) => {
      if (event.target === document.getElementById("calendarOverlay")) {
        closeCalendar();
      }
    });
}

async function initialize() {
  setupEvents();
  await loadAnalytics();
  await loadSelectedDay();
}

initialize();
