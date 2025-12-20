// Device ID management for localStorage-based device recognition

const DEVICE_ID_KEY = 'allbox_device_id';
const DIALOGS_KEY = 'allbox_dialogs';
const ARCHIVED_KEY = 'allbox_archived';
const DEVICE_NAME_KEY = 'allbox_device_name';
const THEME_KEY = 'allbox_theme';

export type Theme = 'dark' | 'light';

export interface StoredDialog {
  dialogId: string;
  deviceLabel: string;
  accessedAt: string;
  name?: string;
  lastActivityAt?: string;
}

// Generate or retrieve persistent device ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get/Set device name
export function getDeviceName(): string | null {
  return localStorage.getItem(DEVICE_NAME_KEY);
}

export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

// Get/Set theme
export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('light');
  }
}

// Initialize theme on page load
export function initTheme(): void {
  setTheme(getTheme());
}

// Get all dialogs this device has access to
export function getStoredDialogs(): StoredDialog[] {
  const stored = localStorage.getItem(DIALOGS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Get archived dialogs
export function getArchivedDialogs(): StoredDialog[] {
  const stored = localStorage.getItem(ARCHIVED_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Add a dialog to this device's memory
export function addStoredDialog(dialogId: string, deviceLabel: string, name?: string, lastActivityAt?: string): void {
  const dialogs = getStoredDialogs();
  const existing = dialogs.findIndex(d => d.dialogId === dialogId);
  
  const newDialog: StoredDialog = {
    dialogId,
    deviceLabel,
    accessedAt: new Date().toISOString(),
    name,
    lastActivityAt: lastActivityAt || new Date().toISOString(),
  };
  
  if (existing >= 0) {
    // Keep the name if not provided
    newDialog.name = name || dialogs[existing].name;
    newDialog.lastActivityAt = lastActivityAt || dialogs[existing].lastActivityAt;
    dialogs[existing] = newDialog;
  } else {
    dialogs.push(newDialog);
  }
  
  localStorage.setItem(DIALOGS_KEY, JSON.stringify(dialogs));
  
  // Remove from archived if it was there
  const archived = getArchivedDialogs().filter(d => d.dialogId !== dialogId);
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archived));
}

// Update dialog last activity
export function updateDialogActivity(dialogId: string, lastActivityAt: string): void {
  const dialogs = getStoredDialogs();
  const dialog = dialogs.find(d => d.dialogId === dialogId);
  if (dialog) {
    dialog.lastActivityAt = lastActivityAt;
    localStorage.setItem(DIALOGS_KEY, JSON.stringify(dialogs));
  }
}

// Update dialog name locally
export function updateStoredDialogName(dialogId: string, name: string): void {
  const dialogs = getStoredDialogs();
  const dialog = dialogs.find(d => d.dialogId === dialogId);
  if (dialog) {
    dialog.name = name;
    localStorage.setItem(DIALOGS_KEY, JSON.stringify(dialogs));
  }
}

// Check if device has access to a dialog
export function hasDialogAccess(dialogId: string): boolean {
  const dialogs = getStoredDialogs();
  return dialogs.some(d => d.dialogId === dialogId);
}

// Get device label for a specific dialog
export function getDeviceLabelForDialog(dialogId: string): string | null {
  const dialogs = getStoredDialogs();
  const dialog = dialogs.find(d => d.dialogId === dialogId);
  return dialog?.deviceLabel || null;
}

// Get dialog name
export function getDialogName(dialogId: string): string | null {
  const dialogs = getStoredDialogs();
  const dialog = dialogs.find(d => d.dialogId === dialogId);
  return dialog?.name || null;
}

// Archive a dialog (exit but keep in archive)
export function archiveDialog(dialogId: string): void {
  const dialogs = getStoredDialogs();
  const dialog = dialogs.find(d => d.dialogId === dialogId);
  if (!dialog) return;
  
  // Remove from active dialogs
  const newDialogs = dialogs.filter(d => d.dialogId !== dialogId);
  localStorage.setItem(DIALOGS_KEY, JSON.stringify(newDialogs));
  
  // Add to archived
  const archived = getArchivedDialogs();
  if (!archived.some(d => d.dialogId === dialogId)) {
    archived.push(dialog);
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archived));
  }
}

// Remove a dialog from archive completely
export function removeFromArchive(dialogId: string): void {
  const archived = getArchivedDialogs().filter(d => d.dialogId !== dialogId);
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archived));
}

// Restore dialog from archive
export function restoreFromArchive(dialogId: string): StoredDialog | null {
  const archived = getArchivedDialogs();
  const dialog = archived.find(d => d.dialogId === dialogId);
  if (!dialog) return null;
  
  // Remove from archive
  removeFromArchive(dialogId);
  
  // Add back to dialogs
  addStoredDialog(dialog.dialogId, dialog.deviceLabel, dialog.name, dialog.lastActivityAt);
  
  return dialog;
}

// Remove a dialog from device memory (legacy, use archiveDialog instead)
export function removeStoredDialog(dialogId: string): void {
  const dialogs = getStoredDialogs().filter(d => d.dialogId !== dialogId);
  localStorage.setItem(DIALOGS_KEY, JSON.stringify(dialogs));
}

// Generate a random 4-digit password
export function generatePassword(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Simple hash function for password (client-side)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'allbox_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
