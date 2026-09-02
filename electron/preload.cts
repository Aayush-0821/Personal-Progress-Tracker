import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getProgressByDate: (date: string) =>
    ipcRenderer.invoke("get-progress-by-date", date),

  addTask: (date: string, title: string) =>
    ipcRenderer.invoke("add-task", {
      date,
      title
    }),

  toggleTask: (date: string, taskId: string) =>
    ipcRenderer.invoke("toggle-task", {
      date,
      taskId
    }),

  deleteTask: (date: string, taskId: string) =>
    ipcRenderer.invoke("delete-task", {
      date,
      taskId
    }),

  getAnalytics: () =>
    ipcRenderer.invoke("get-analytics")
});