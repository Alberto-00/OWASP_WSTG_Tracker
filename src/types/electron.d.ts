export interface SaveFileInfo {
  filename: string;
  path: string;
  size: number;
  modified: Date;
}

export interface ElectronAPI {
  platform: string;
  version: string;

  // File system operations
  showSaveDialog: (defaultFilename: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  showOpenDialog: () => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  saveFile: (filePathOrName: string, data: unknown) => Promise<{ success: boolean; path?: string; filename?: string; error?: string }>;
  loadFile: (filePathOrName: string) => Promise<{ success: boolean; data?: unknown; filePath?: string; error?: string }>;
  getLastSaveFile: () => Promise<{ success: boolean; filename?: string; filePath?: string }>;
  listSaveFiles: () => Promise<{ success: boolean; files?: SaveFileInfo[]; error?: string }>;
  fileExists: (filename: string) => Promise<boolean>;

  // WSTG: ultima release ufficiale su GitHub e suo download nella cartella saves
  wstgLatestRelease: () => Promise<{ success: boolean; tag?: string; date?: string; error?: string }>;
  wstgDownloadRelease: (tag: string) => Promise<{ success: boolean; dir?: string; count?: number; error?: string }>;
  openFolder: (dir: string) => Promise<void>;

  // Window controls
  setUnsavedChanges: (hasChanges: boolean) => void;
  onSaveBeforeClose: (callback: () => void) => () => void;
  onShowUnsavedChangesDialog: (callback: () => void) => () => void;
  forceQuit: () => void;
  quitWithoutSaving: () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
