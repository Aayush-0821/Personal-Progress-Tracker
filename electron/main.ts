import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Types } from "mongoose";

import { connectDB, DailyProgress, ITask } from "../src/db.js";

/* ========================================================= */
/* ESM PATH SETUP */
/* ========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ========================================================= */
/* ENVIRONMENT */
/* ========================================================= */

const envPath = app.isPackaged
  ? path.join(app.getPath("userData"), ".env")
  : path.join(process.cwd(), ".env");

dotenv.config({
  path: envPath,
});

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface AnalyticsDay {
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

let mainWindow: BrowserWindow | null = null;

/* ========================================================= */
/* CREATE WINDOW */
/* ========================================================= */

async function createWindow(): Promise<void> {
  /*
   * Connect to MongoDB before creating the window.
   * If the connection fails, the application still opens,
   * but database operations will report errors.
   */
  try {
    await connectDB();
    console.log("Database connected.");
  } catch (error) {
    console.error("Database connection failed:", error);
  }

const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, "app", "assets", "icon.ico")
  : path.join(app.getAppPath(), "assets", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,

    minWidth: 1100,
    minHeight: 700,

    backgroundColor: "#05070b",
    title: "Momentum",

    icon: iconPath,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),

      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
const indexPath = app.isPackaged
  ? path.join(process.resourcesPath, "app", "src", "index.html")
  : path.join(process.cwd(), "src", "index.html");

  await mainWindow.loadFile(indexPath);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* ========================================================= */
/* GET PROGRESS BY DATE */
/* ========================================================= */

ipcMain.handle("get-progress-by-date", async (_event, date: string) => {
  if (!date || typeof date !== "string") {
    throw new Error("Invalid date.");
  }

  let progress = await DailyProgress.findOne({
    date,
  });

  if (!progress) {
    progress = await DailyProgress.create({
      date,
      tasks: [],
    });
  }

  return {
    date: progress.date,

    tasks: progress.tasks.map((task: ITask) => ({
      _id: String(task._id),
      title: task.title,
      completed: task.completed,
    })),
  };
});

/* ========================================================= */
/* ADD TASK */
/* ========================================================= */

ipcMain.handle(
  "add-task",
  async (
    _event,
    payload: {
      date: string;
      title: string;
    },
  ) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid task payload.");
    }

    const title = payload.title?.trim();

    if (!title) {
      throw new Error("Task title cannot be empty.");
    }

    if (!payload.date) {
      throw new Error("Date is required.");
    }

    let progress = await DailyProgress.findOne({
      date: payload.date,
    });

    if (!progress) {
      progress = new DailyProgress({
        date: payload.date,
        tasks: [],
      });
    }

    progress.tasks.push({
      _id: new Types.ObjectId(),
      title,
      completed: false,
    });

    await progress.save();

    const task = progress.tasks[progress.tasks.length - 1];

    return {
      success: true,

      task: {
        _id: String(task._id),
        title: task.title,
        completed: task.completed,
      },
    };
  },
);

/* ========================================================= */
/* TOGGLE TASK */
/* ========================================================= */

ipcMain.handle(
  "toggle-task",
  async (
    _event,
    payload: {
      date: string;
      taskId: string;
    },
  ) => {
    if (!payload?.date || !payload?.taskId) {
      throw new Error("Invalid task information.");
    }

    const progress = await DailyProgress.findOne({
      date: payload.date,
    });

    if (!progress) {
      throw new Error("Daily progress not found.");
    }

    const task = progress.tasks.id(payload.taskId);

    if (!task) {
      throw new Error("Task not found.");
    }

    task.completed = !task.completed;

    await progress.save();

    return {
      success: true,
      completed: task.completed,
    };
  },
);

/* ========================================================= */
/* DELETE TASK */
/* ========================================================= */

ipcMain.handle(
  "delete-task",
  async (
    _event,
    payload: {
      date: string;
      taskId: string;
    },
  ) => {
    if (!payload?.date || !payload?.taskId) {
      throw new Error("Invalid task information.");
    }

    const progress = await DailyProgress.findOne({
      date: payload.date,
    });

    if (!progress) {
      throw new Error("Daily progress not found.");
    }

    const task = progress.tasks.id(payload.taskId);

    if (!task) {
      throw new Error("Task not found.");
    }

    progress.tasks.pull({
      _id: payload.taskId,
    });

    await progress.save();

    return {
      success: true,
    };
  },
);

/* ========================================================= */
/* GET ANALYTICS */
/* ========================================================= */

ipcMain.handle("get-analytics", async (): Promise<AnalyticsDay[]> => {
  const today = new Date();

  const start = new Date(today);

  start.setFullYear(today.getFullYear() - 1);

  const startString = formatDateForDB(start);

  const documents = await DailyProgress.find({
    date: {
      $gte: startString,
    },
  })
    .sort({
      date: 1,
    })
    .lean();

  const documentMap = new Map<string, (typeof documents)[number]>(
    documents.map((doc) => [doc.date, doc]),
  );

  const results: AnalyticsDay[] = [];

  /*
   * Generate exactly the last 90 days,
   * including today.
   */
  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);

    date.setDate(today.getDate() - i);

    const dateString = formatDateForDB(date);

    const document = documentMap.get(dateString);

    const tasks = document?.tasks ?? [];

    const completedTasks = tasks
      .filter((task) => task.completed)
      .map((task) => task.title);

    const total = tasks.length;

    const completed = completedTasks.length;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    results.push({
      date: dateString,
      total,
      completed,
      percentage,

      tasks: tasks.map((task) => task.title),

      completedTasks,
    });
  }

  return results;
});

/* ========================================================= */
/* DATE FORMAT */
/* ========================================================= */

function formatDateForDB(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ========================================================= */
/* ELECTRON LIFECYCLE */
/* ========================================================= */

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  createWindow();
});

/* ========================================================= */
/* ALL WINDOWS CLOSED */
/* ========================================================= */

app.on("window-all-closed", () => {
  /*
   * On Windows/Linux, quit the application.
   * On macOS, applications traditionally remain
   * active until explicitly quit.
   */
  if (process.platform !== "darwin") {
    app.quit();
  }
});
