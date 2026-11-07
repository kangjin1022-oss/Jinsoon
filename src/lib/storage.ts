import type { WineInfo } from "./wine";

export interface CellarEntry {
  id: string;
  createdAt: number;
  thumb: string;
  wine: WineInfo;
  rating: number;
  memo: string;
}

const KEY_API = "wine-app.apiKey";
const KEY_CELLAR = "wine-app.cellar";

export const getApiKey = () => localStorage.getItem(KEY_API) ?? "";
export const setApiKey = (k: string) => localStorage.setItem(KEY_API, k.trim());

export function loadCellar(): CellarEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_CELLAR) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCellar(entries: CellarEntry[]) {
  localStorage.setItem(KEY_CELLAR, JSON.stringify(entries));
}
