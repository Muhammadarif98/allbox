// Motivational dialog names related to file sharing theme

export const dialogNames = {
  en: [
    // Collaboration & Sharing
    "Share Freely",
    "Open Exchange",
    "Quick Share",
    "Easy Transfer",
    "Fast Link",
    "Seamless Flow",
    "Smooth Sync",
    "Team Space",
    "Group Hub",
    "Unity Box",
    
    // Trust & Security
    "Safe Haven",
    "Trust Zone",
    "Secure Drop",
    "Private Path",
    "Hidden Gem",
    "Secret Vault",
    "Guard Box",
    "Shield Space",
    
    // Speed & Efficiency  
    "Swift Send",
    "Rapid Route",
    "Flash Drive",
    "Instant Move",
    "Speed Link",
    "Quick Drop",
    "Fast Track",
    "Turbo Share",
    
    // Connection & Unity
    "Bridge Point",
    "Link Hub",
    "Connect Flow",
    "Bond Space",
    "Sync Point",
    "Join Force",
    "Unite Now",
    "Merge Path",
    
    // Creativity & Freedom
    "Free Flow",
    "Open Sky",
    "Clear Path",
    "Bright Link",
    "New Wave",
    "Fresh Start",
    "Bold Move",
    "Next Step",
  ],
  ru: [
    // Сотрудничество
    "Общий Путь",
    "Связь Друзей",
    "Быстрый Обмен",
    "Лёгкая Передача",
    "Простой Путь",
    "Плавный Поток",
    "Синхро Точка",
    "Командный Дух",
    "Групповой Хаб",
    "Единый Центр",
    
    // Доверие и безопасность
    "Тихая Гавань",
    "Зона Доверия",
    "Безопасный Сейф",
    "Тайный Путь",
    "Скрытое Сокровище",
    "Секретный Бокс",
    "Надёжный Щит",
    "Охранная Зона",
    
    // Скорость
    "Быстрый Старт",
    "Молния Связь",
    "Мгновенный Путь",
    "Скоростной Канал",
    "Турбо Обмен",
    "Флеш Доставка",
    "Ракетный Путь",
    "Экспресс Линк",
    
    // Связь и единство
    "Мост Связи",
    "Точка Встречи",
    "Поток Данных",
    "Узел Связи",
    "Синхронный Мир",
    "Сила Вместе",
    "Общий Импульс",
    "Путь Вперёд",
    
    // Свобода
    "Свободный Поток",
    "Открытый Мир",
    "Ясный Путь",
    "Яркая Связь",
    "Новая Волна",
    "Чистый Старт",
    "Смелый Шаг",
    "Новый Горизонт",
  ],
};

export function getRandomDialogName(lang: 'en' | 'ru' = 'en'): string {
  const names = dialogNames[lang];
  return names[Math.floor(Math.random() * names.length)];
}
