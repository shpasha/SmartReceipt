import type { Locale } from "./locale";

export type Dict = {
  meta: { title: string; description: string };
  switcher: { ru: string; en: string; aria: string };
  common: { home: string; enter: string; back: string; close: string; cancel: string; ok: string };
  home: {
    heroPrefix: string;
    heroAccent: string;
    heroSubtitle: string;
    parsing: string;
    dropTitle: string;
    dropFormats: string;
    chooseFile: string;
    haveCode: string;
    codePlaceholder: string;
    parseError: string;
    error: string;
    errNotReceipt: string;
    errParseFailed: string;
    errTransient: string;
    errUnknown: string;
    step1Title: string;
    step1Text: string;
    step2Title: string;
    step2Text: string;
    step3Title: string;
    step3Text: string;
    recent: string;
    forgetRoom: string;
  };
  edit: {
    parsedChip: string;
    titleEdit: string;
    titleCheck: string;
    roomNameLabel: string;
    colName: string;
    colQty: string;
    colPrice: string;
    colSum: string;
    noItems: string;
    addItem: string;
    newItemName: string;
    service: string;
    tax: string;
    total: string;
    comment: string;
    commentPh: string;
    save: string;
    createRoomTitle: string;
    createRoomDesc: string;
    roomNamePh: string;
    yourName: string;
    create: string;
    itemNamePh: string;
    versionConflict: string;
    aria: { remove: string; qty: string; price: string };
  };
  room: {
    notFound: string;
    notFoundHint: string;
    roomLabel: string;
    joinNew: string;
    joinNewHint: string;
    namePh: string;
    nameTakenInline: string;
    joinErrorTaken: string;
    joinErrorGeneric: string;
    rejoinNameTaken: string;
    continueAs: string;
    leave: string;
    leaveTitle: string;
    editReceipt: string;
    editReceiptTitle: string;
    calc: string;
    nobodyYet: string;
    you: string;
    incl: string;
    serviceShort: string;
    taxShort: string;
    comment: string;
    service: string;
    specify: string;
    less: string;
    more: string;
    pickQty: string;
    pickQtyTitle: string;
    qtyOf: string;
    peopleOf: string;
    enterManual: string;
    manualHelp: string;
    manualPh: string;
    remove: string;
    overTooltip: string;
    fullTooltip: string;
    overNote: string;
    remaining: string;
    over: string;
  };
};

const ru: Dict = {
  meta: {
    title: "SmartReceipt — раздели счёт умно",
    description: "Сфоткал чек — раскидал по компании за минуту",
  },
  switcher: { ru: "Рус", en: "Eng", aria: "Сменить язык" },
  common: {
    home: "На главную",
    enter: "Войти",
    back: "Назад",
    close: "Закрыть",
    cancel: "Отмена",
    ok: "ОК",
  },
  home: {
    heroPrefix: "Раздели счёт",
    heroAccent: "по-умному",
    heroSubtitle:
      "Загрузи чек из ресторана — мы распознаем позиции. Создай комнату, друзья выберут что ели — и каждый увидит свою долю.",
    parsing: "Расшифровываю позиции…",
    dropTitle: "Загрузи фото чека",
    dropFormats: "JPG / PNG / HEIC · перетащи сюда или нажми кнопку",
    chooseFile: "Выбрать файл",
    haveCode: "уже есть код?",
    codePlaceholder: "ABCDE",
    parseError: "Не удалось распознать чек",
    error: "Ошибка",
    errNotReceipt: "На фото не похоже на чек — попробуй ещё раз",
    errParseFailed: "Не удалось распознать чек. Попробуй сделать фото ярче и без бликов",
    errTransient: "Сервис распознавания временно недоступен. Попробуй ещё раз через минуту",
    errUnknown: "Что-то пошло не так. Попробуй ещё раз",
    step1Title: "Загрузи фото чека",
    step1Text: "Распознаем позиции и цены за тебя.",
    step2Title: "Позови друзей",
    step2Text: "Отправь код — каждый зайдёт со своего телефона.",
    step3Title: "Отметьте, кто что ел",
    step3Text: "Каждый выбирает своё — сумму посчитаем сами.",
    recent: "Недавние комнаты",
    forgetRoom: "Убрать из списка",
  },
  edit: {
    parsedChip: "Чек распознан",
    titleEdit: "Внести правки",
    titleCheck: "Проверь позиции",
    roomNameLabel: "Название комнаты",
    colName: "Название",
    colQty: "Кол-во",
    colPrice: "Цена",
    colSum: "Сумма",
    noItems: "Нет позиций. Добавь вручную.",
    addItem: "Позиция",
    newItemName: "Новая позиция",
    service: "Сервис",
    tax: "Налог",
    total: "Итого",
    comment: "Комментарий",
    commentPh: "Реквизиты для перевода, кто оплатил, любые заметки…",
    save: "Сохранить",
    createRoomTitle: "Создать комнату",
    createRoomDesc: "Друзья подключатся по коду и выберут что ели.",
    roomNamePh: "Название (например, «Вечер четверга в Saperavi»)",
    yourName: "Твоё имя",
    create: "Создать",
    itemNamePh: "Название позиции",
    versionConflict: "Чек уже изменили — подгрузил свежую версию. Внеси правки заново и сохрани.",
    aria: { remove: "Удалить позицию", qty: "Количество", price: "Цена за единицу" },
  },
  room: {
    notFound: "Комната не найдена",
    notFoundHint: "Проверь код и попробуй ещё раз.",
    roomLabel: "Комната {code}",
    joinNew: "Зайти новым человеком",
    joinNewHint: "Введи имя — друзья увидят его в комнате.",
    namePh: "Имя",
    nameTakenInline: "Имя «{name}» уже занято — выбери себя ниже или введи другое.",
    joinErrorTaken: "Это имя уже занято — выбери себя из списка или введи другое.",
    joinErrorGeneric: "Не получилось войти. Попробуй ещё раз.",
    rejoinNameTaken: "Твоё имя уже занято — выбери себя из списка или введи другое.",
    continueAs: "или продолжить как",
    leave: "Выйти",
    leaveTitle: "Выйти из роли «{name}»",
    editReceipt: "Внести правки",
    editReceiptTitle: "Внести правки в чек",
    calc: "Расчёт",
    nobodyYet: "Никто ещё ничего не выбрал",
    you: "(ты)",
    incl: "вкл.",
    serviceShort: "сервис",
    taxShort: "налог",
    comment: "Комментарий",
    service: "Сервис",
    specify: "указать",
    less: "Меньше",
    more: "Больше",
    pickQty: "Выбрать количество",
    pickQtyTitle: "Выбрать долю — {value}",
    qtyOf: "Количество позиций",
    peopleOf: "На количество человек",
    enterManual: "Ввести вручную",
    manualHelp: "Сколько позиций ты взял. Дробное — твоя доля от одной (например, 0.5 — половина, 1.5 — полторы).",
    manualPh: "например, 0.33",
    remove: "Убрать",
    overTooltip: "Разобрано больше чем в чеке",
    fullTooltip: "Позиция полностью разобрана",
    overNote: "разобрано {claimed} — больше чем в чеке ({total})",
    remaining: "осталось {amount}",
    over: "перебор {amount}",
  },
};

const en: Dict = {
  meta: {
    title: "SmartReceipt — split the bill smartly",
    description: "Snap the receipt — split with friends in a minute",
  },
  switcher: { ru: "Рус", en: "Eng", aria: "Change language" },
  common: {
    home: "Home",
    enter: "Join",
    back: "Back",
    close: "Close",
    cancel: "Cancel",
    ok: "OK",
  },
  home: {
    heroPrefix: "Split the bill",
    heroAccent: "the smart way",
    heroSubtitle:
      "Upload a restaurant receipt — we'll read the items. Create a room, friends pick what they had — everyone sees their share.",
    parsing: "Reading the items…",
    dropTitle: "Upload a photo of the receipt",
    dropFormats: "JPG / PNG / HEIC · drag here or click the button",
    chooseFile: "Choose file",
    haveCode: "already have a code?",
    codePlaceholder: "ABCDE",
    parseError: "Couldn't read the receipt",
    error: "Error",
    errNotReceipt: "This doesn't look like a receipt — try another photo",
    errParseFailed: "Couldn't read the receipt. Try a brighter photo without glare",
    errTransient: "The recognition service is temporarily unavailable. Try again in a minute",
    errUnknown: "Something went wrong. Please try again",
    step1Title: "Upload a receipt photo",
    step1Text: "We read the items and prices for you.",
    step2Title: "Invite your friends",
    step2Text: "Share the code — everyone joins from their phone.",
    step3Title: "Mark what each had",
    step3Text: "Everyone picks their own — we do the math.",
    recent: "Recent rooms",
    forgetRoom: "Remove from list",
  },
  edit: {
    parsedChip: "Receipt parsed",
    titleEdit: "Edit",
    titleCheck: "Check the items",
    roomNameLabel: "Room name",
    colName: "Name",
    colQty: "Qty",
    colPrice: "Price",
    colSum: "Sum",
    noItems: "No items. Add one manually.",
    addItem: "Item",
    newItemName: "New item",
    service: "Service",
    tax: "Tax",
    total: "Total",
    comment: "Comment",
    commentPh: "Payment details, who paid, any notes…",
    save: "Save",
    createRoomTitle: "Create a room",
    createRoomDesc: "Friends join by code and pick what they had.",
    roomNamePh: "Name (e.g. \"Thursday night at Saperavi\")",
    yourName: "Your name",
    create: "Create",
    itemNamePh: "Item name",
    versionConflict: "Receipt was just edited — loaded the fresh version. Re-apply your changes and save again.",
    aria: { remove: "Remove item", qty: "Quantity", price: "Unit price" },
  },
  room: {
    notFound: "Room not found",
    notFoundHint: "Check the code and try again.",
    roomLabel: "Room {code}",
    joinNew: "Join as a new person",
    joinNewHint: "Type your name — friends will see it in the room.",
    namePh: "Name",
    nameTakenInline: "The name \"{name}\" is taken — pick yourself below or use another.",
    joinErrorTaken: "That name is taken — pick yourself from the list or use another.",
    joinErrorGeneric: "Couldn't join. Please try again.",
    rejoinNameTaken: "Your name is taken — pick yourself from the list or use another.",
    continueAs: "or continue as",
    leave: "Leave",
    leaveTitle: "Leave \"{name}\"",
    editReceipt: "Edit",
    editReceiptTitle: "Edit the receipt",
    calc: "Totals",
    nobodyYet: "Nobody has picked anything yet",
    you: "(you)",
    incl: "incl.",
    serviceShort: "service",
    taxShort: "tax",
    comment: "Comment",
    service: "Service",
    specify: "set",
    less: "Less",
    more: "More",
    pickQty: "Pick amount",
    pickQtyTitle: "Pick share — {value}",
    qtyOf: "Number of portions",
    peopleOf: "Split between people",
    enterManual: "Enter manually",
    manualHelp: "How many portions you had. A fraction is your share of one (e.g. 0.5 — half, 1.5 — one and a half).",
    manualPh: "e.g. 0.33",
    remove: "Remove",
    overTooltip: "Claimed more than on the receipt",
    fullTooltip: "Fully claimed",
    overNote: "claimed {claimed} — more than on the receipt ({total})",
    remaining: "{amount} left",
    over: "{amount} over",
  },
};

export const dict: Record<Locale, Dict> = { ru, en };
