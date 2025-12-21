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
    archivedDialogs: 'Archived Dialogs',
    footer: 'Files are stored securely. Max 2GB per file.',
    searchDialogs: 'Search dialogs...',
    noArchivedDialogs: 'No archived dialogs',
    
    // Password screen
    savePassword: 'Save Your Password',
    onlyTime: 'only time',
    saveWarning: "This is the {onlyTime} you'll see this password. Save it somewhere safe!",
    passwordWarning: "This password will NOT be shown again. Anyone with this password can access your dialog.",
    savedIt: "I've Saved It",
    downloadPassword: 'Download Password',
    dialogCode: 'Dialog Code',
    
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
    messages: 'Messages',
    noFiles: 'No files yet. Upload something!',
    noMessages: 'No messages yet. Send something!',
    dragDrop: 'Drag & drop files',
    clickBrowse: 'or click to browse',
    maxSize: 'Max {size} per file',
    uploading: 'Uploading...',
    dropHere: 'Drop files here',
    editName: 'Edit name',
    saveName: 'Save',
    cancelEdit: 'Cancel',
    exitDialog: 'Exit to Archive',
    exitDialogConfirm: 'Are you sure you want to exit? Dialog will be moved to archive.',
    leaveDialog: 'Leave Completely',
    leaveDialogConfirm: 'Are you sure you want to leave completely? You can rejoin with password.',
    restoreDialog: 'Restore',
    
    // Device settings
    deviceName: 'Device Name',
    editDeviceName: 'Edit device name',
    deviceNamePlaceholder: 'Enter device name',
    
    // Theme
    lightTheme: 'Light',
    darkTheme: 'Dark',
    
    // File card
    download: 'Download',
    delete: 'Delete',
    justNow: 'Just now',
    minutesAgo: '{n}m ago',
    hoursAgo: '{n}h ago',
    daysAgo: '{n}d ago',
    play: 'Play',
    
    // Messages
    typeMessage: 'Type a message...',
    recording: 'Recording',
    copy: 'Copy',
    copied: 'Copied!',
    copyFailed: 'Failed to copy',
    newContent: 'New content available',
    
    // Toasts
    uploadSuccess: 'Uploaded {n} file(s)',
    uploadFailed: 'Failed to upload {name}',
    saveFailed: 'Failed to save {name}',
    fileDeleted: 'File deleted',
    messageDeleted: 'Message deleted',
    deleteFailed: 'Failed to delete file',
    downloadFailed: 'Failed to download file',
    createFailed: 'Failed to create dialog',
    noAccess: "You don't have access to this dialog",
    messageSent: 'Message sent',
    messageFailed: 'Failed to send message',
    dialogRenamed: 'Dialog renamed',
    dialogExited: 'Dialog moved to archive',
    dialogLeft: 'Left dialog completely',
    dialogRestored: 'Dialog restored',
    deviceNameUpdated: 'Device name updated',
  },
  ru: {
    // Homepage
    appName: 'AllBox',
    tagline: 'Делитесь файлами через защищённые паролем диалоги. Регистрация не требуется.',
    createDialog: 'Создать диалог',
    enterDialog: 'Войти в диалог',
    myDialogs: 'Мои диалоги',
    archivedDialogs: 'Архив диалогов',
    footer: 'Файлы хранятся безопасно. Максимум 100 МБ на файл.',
    searchDialogs: 'Поиск диалогов...',
    noArchivedDialogs: 'Нет архивных диалогов',
    
    // Password screen
    savePassword: 'Сохраните пароль',
    onlyTime: 'единственный раз',
    saveWarning: 'Это {onlyTime}, когда вы видите этот пароль. Сохраните его!',
    passwordWarning: 'Этот пароль больше НЕ будет показан. Любой с этим паролем может войти в диалог.',
    savedIt: 'Я сохранил',
    downloadPassword: 'Скачать пароль',
    dialogCode: 'Код диалога',
    
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
    messages: 'Сообщения',
    noFiles: 'Пока нет файлов. Загрузите что-нибудь!',
    noMessages: 'Пока нет сообщений. Напишите что-нибудь!',
    dragDrop: 'Перетащите файлы',
    clickBrowse: 'или нажмите для выбора',
    maxSize: 'Макс. {size} на файл',
    uploading: 'Загрузка...',
    dropHere: 'Отпустите файлы здесь',
    editName: 'Изменить',
    saveName: 'Сохранить',
    cancelEdit: 'Отмена',
    exitDialog: 'В архив',
    exitDialogConfirm: 'Вы уверены? Диалог будет перемещён в архив.',
    leaveDialog: 'Покинуть полностью',
    leaveDialogConfirm: 'Вы уверены? Вы можете войти снова по паролю.',
    restoreDialog: 'Восстановить',
    
    // Device settings
    deviceName: 'Имя устройства',
    editDeviceName: 'Изменить имя устройства',
    deviceNamePlaceholder: 'Введите имя устройства',
    
    // Theme
    lightTheme: 'Светлая',
    darkTheme: 'Тёмная',
    
    // File card
    download: 'Скачать',
    delete: 'Удалить',
    justNow: 'Только что',
    minutesAgo: '{n} мин. назад',
    hoursAgo: '{n} ч. назад',
    daysAgo: '{n} дн. назад',
    play: 'Воспроизвести',
    
    // Messages
    typeMessage: 'Введите сообщение...',
    recording: 'Запись',
    copy: 'Копировать',
    copied: 'Скопировано!',
    copyFailed: 'Не удалось скопировать',
    newContent: 'Доступен новый контент',
    
    // Toasts
    uploadSuccess: 'Загружено {n} файл(ов)',
    uploadFailed: 'Не удалось загрузить {name}',
    saveFailed: 'Не удалось сохранить {name}',
    fileDeleted: 'Файл удалён',
    messageDeleted: 'Сообщение удалено',
    deleteFailed: 'Не удалось удалить файл',
    downloadFailed: 'Не удалось скачать файл',
    createFailed: 'Не удалось создать диалог',
    noAccess: 'У вас нет доступа к этому диалогу',
    messageSent: 'Сообщение отправлено',
    messageFailed: 'Не удалось отправить сообщение',
    dialogRenamed: 'Диалог переименован',
    dialogExited: 'Диалог перемещён в архив',
    dialogLeft: 'Вы покинули диалог',
    dialogRestored: 'Диалог восстановлен',
    deviceNameUpdated: 'Имя устройства обновлено',
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
