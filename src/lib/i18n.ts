export type Language = 'en' | 'ru';

const LANG_KEY = 'allbox_language';

export const translations = {
  en: {
    // Homepage
    appName: 'AllBox',
    tagline: 'Share files through password-protected dialogs. No registration required.',
    createDialog: 'Create New Dialog',
    enterDialog: 'Enter Dialog',
    myDialogs: 'My Dialogs',
    footer: 'Files are stored securely. Max 100MB per file.',
    
    // Password screen
    savePassword: 'Save Your Password',
    onlyTime: 'only time',
    saveWarning: "This is the {onlyTime} you'll see this password. Save it somewhere safe!",
    passwordWarning: "This password will NOT be shown again. Anyone with this password can access your dialog.",
    savedIt: "I've Saved It",
    
    // Enter dialog modal
    enterDialogTitle: 'Enter Dialog',
    enterPasswordPrompt: 'Enter the 4-digit password to access the dialog',
    wrongPassword: 'Wrong password. Please try again.',
    enter: 'Enter Dialog',
    
    // Dialog view
    dialog: 'Dialog',
    youAre: 'You are',
    devices: 'device(s)',
    files: 'Files',
    noFiles: 'No files yet. Upload something!',
    dragDrop: 'Drag & drop files',
    clickBrowse: 'or click to browse',
    maxSize: 'Max {size} per file',
    uploading: 'Uploading...',
    dropHere: 'Drop files here',
    
    // File card
    download: 'Download',
    delete: 'Delete',
    justNow: 'Just now',
    minutesAgo: '{n}m ago',
    hoursAgo: '{n}h ago',
    daysAgo: '{n}d ago',
    
    // Toasts
    uploadSuccess: 'Uploaded {n} file(s)',
    uploadFailed: 'Failed to upload {name}',
    saveFailed: 'Failed to save {name}',
    fileDeleted: 'File deleted',
    deleteFailed: 'Failed to delete file',
    downloadFailed: 'Failed to download file',
    createFailed: 'Failed to create dialog',
    noAccess: "You don't have access to this dialog",
  },
  ru: {
    // Homepage
    appName: 'AllBox',
    tagline: 'Делитесь файлами через защищённые паролем диалоги. Регистрация не требуется.',
    createDialog: 'Создать диалог',
    enterDialog: 'Войти в диалог',
    myDialogs: 'Мои диалоги',
    footer: 'Файлы хранятся безопасно. Максимум 100МБ на файл.',
    
    // Password screen
    savePassword: 'Сохраните пароль',
    onlyTime: 'единственный раз',
    saveWarning: 'Это {onlyTime}, когда вы видите этот пароль. Сохраните его!',
    passwordWarning: 'Этот пароль больше НЕ будет показан. Любой с этим паролем может войти в диалог.',
    savedIt: 'Я сохранил',
    
    // Enter dialog modal
    enterDialogTitle: 'Войти в диалог',
    enterPasswordPrompt: 'Введите 4-значный пароль для доступа к диалогу',
    wrongPassword: 'Неверный пароль. Попробуйте снова.',
    enter: 'Войти',
    
    // Dialog view
    dialog: 'Диалог',
    youAre: 'Вы',
    devices: 'устройств(а)',
    files: 'Файлы',
    noFiles: 'Пока нет файлов. Загрузите что-нибудь!',
    dragDrop: 'Перетащите файлы',
    clickBrowse: 'или нажмите для выбора',
    maxSize: 'Макс. {size} на файл',
    uploading: 'Загрузка...',
    dropHere: 'Отпустите файлы здесь',
    
    // File card
    download: 'Скачать',
    delete: 'Удалить',
    justNow: 'Только что',
    minutesAgo: '{n} мин. назад',
    hoursAgo: '{n} ч. назад',
    daysAgo: '{n} дн. назад',
    
    // Toasts
    uploadSuccess: 'Загружено {n} файл(ов)',
    uploadFailed: 'Не удалось загрузить {name}',
    saveFailed: 'Не удалось сохранить {name}',
    fileDeleted: 'Файл удалён',
    deleteFailed: 'Не удалось удалить файл',
    downloadFailed: 'Не удалось скачать файл',
    createFailed: 'Не удалось создать диалог',
    noAccess: 'У вас нет доступа к этому диалогу',
  },
};

export function getLanguage(): Language {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'ru' || stored === 'en') return stored;
  // Auto-detect from browser
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('ru') ? 'ru' : 'en';
}

export function setLanguage(lang: Language): void {
  localStorage.setItem(LANG_KEY, lang);
}

export function t(key: keyof typeof translations.en, params?: Record<string, string | number>): string {
  const lang = getLanguage();
  let text = translations[lang][key] || translations.en[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  
  return text;
}
