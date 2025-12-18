// Device ID management for localStorage-based device recognition

const DEVICE_ID_KEY = 'allbox_device_id';
const DIALOGS_KEY = 'allbox_dialogs';

export interface StoredDialog {
  dialogId: string;
  deviceLabel: string;
  accessedAt: string;
  name?: string;
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

// Add a dialog to this device's memory
export function addStoredDialog(dialogId: string, deviceLabel: string, name?: string): void {
  const dialogs = getStoredDialogs();
  const existing = dialogs.findIndex(d => d.dialogId === dialogId);
  
  const newDialog: StoredDialog = {
    dialogId,
    deviceLabel,
    accessedAt: new Date().toISOString(),
    name,
  };
  
  if (existing >= 0) {
    // Keep the name if not provided
    newDialog.name = name || dialogs[existing].name;
    dialogs[existing] = newDialog;
  } else {
    dialogs.push(newDialog);
  }
  
  localStorage.setItem(DIALOGS_KEY, JSON.stringify(dialogs));
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

// Remove a dialog from device memory
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
