import type { App } from "./types";

const APPS_KEY = "genphone:apps";
const ACTIVE_KEY = "genphone:activeAppId";

export const storage = {
  loadApps(): App[] {
    try {
      const raw = localStorage.getItem(APPS_KEY);
      return raw ? (JSON.parse(raw) as App[]) : [];
    } catch {
      return [];
    }
  },
  saveApps(apps: App[]): void {
    localStorage.setItem(APPS_KEY, JSON.stringify(apps));
  },
  upsertApp(app: App): void {
    const apps = storage.loadApps();
    const idx = apps.findIndex((a) => a.id === app.id);
    if (idx >= 0) apps[idx] = app;
    else apps.push(app);
    storage.saveApps(apps);
  },
  getApp(id: string): App | undefined {
    return storage.loadApps().find((a) => a.id === id);
  },
  setActive(id: string | null): void {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  },
  getActive(): string | null {
    return localStorage.getItem(ACTIVE_KEY);
  },
};
