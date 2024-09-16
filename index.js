import { Bot, InlineKeyboard, session } from 'grammy';
import moment from 'moment-timezone';
import Calendar from 'telegraf-calendar-telegram';
import schedule from 'node-schedule';
import dotenv from 'dotenv';
import {
  checkMr,
  formatDate,
  formatDateTime,
  getEveningMessage,
  getRandomElements,
  getRandomPhraseWithCounter,
  getUserTimeMessage,
  timeZone,
} from './helpers.js';
import { calendarOptions, manyMrPhrases, motivationalMessages } from './constants.js';
import axiosInstance from './axiosInstance.js';
import * as fs from 'fs';
import path from 'path';

dotenv.config();

const TOKEN = process.env.BOT_API_KEY; // Токен телеграмм-бота
const ADMINS_IDS = process.env.ADMINS; // GitLab Access Token
const GITLAB_URL = process.env.GITLAB_URL; // GitLab main url
const SERVICE_CHAT_ID = process.env.SERVICE_CHAT_ID; // Чат для отладки бота
const TG_TEAM_CHAT_ID = process.env.TG_TEAM_CHAT_ID; // ID чата команды в телеграмме
const OWNER_ID = process.env.OWNER_ID; // ID разработчика бота
const DEV_CHAT_ID = process.env.DEV_CHAT_ID; // ID чата разработчика в Телеграм

// Создаем бота
const bot = new Bot(TOKEN);
// Настраиваем сессии
bot.use(
  session({
    initial: () => ({
      calendarData: {},
    }),
  }),
);

const calendar = new Calendar(bot, calendarOptions);

// Все разработчики
let userList = [];

// Список временно не активных разработчиков
let excludedUsers = [];

// Глобальная переменная для хранения состояния сессий
const sessions = {};

// Глобальная переменная для хранения предложений по боту от лидов
let suggestions = [];

// Глобальная переменная для хранения состояния логирования
let loggingEnabled = true;

// Счетчик МРов
let mrCounter;

// Список мров
let mergeRequests;

// Переменная для хранения состояния режима разработки
let isDevelopmentMode = false;

let calendarData = {
  isOpen: false,
  userName: '',
};

bot.api.setMyCommands(
  [
    { command: 'start', description: 'Запуск бота' },
    { command: 'help', description: 'WTF' },
    { command: 'chatid', description: 'Получить ID чата' },
    { command: 'mrcount', description: 'Узнать сколько Мров сделали за этот день' },
    { command: 'jobs', description: 'Показать запланированные уведомления' },
    { command: 'mrinfo', description: 'Показать невлитые МРы' },
  ],
  { scope: { type: 'all_chat_administrators' } }, // all_private_chats
);

const sendServiceMessage = async (message, userId = null, username = null, ignoreLogging = false) => {
  try {
    // Определяем целевой чат в зависимости от режима разработки
    const targetChatId = isDevelopmentMode ? DEV_CHAT_ID : SERVICE_CHAT_ID;
    if (!userId && !username)
      return await sendMessageToChat(targetChatId, `${message}\n${isDevelopmentMode ? 'Чат: разработчика' : ''}`);

    if (ignoreLogging || loggingEnabled) {
      // Формируем сообщение с добавлением информации о пользователе, который инициировал действие
      const fullMessage = `${message}\nИнициатор: ${username ? '@' + username : `ID: ${userId}`}, ${isDevelopmentMode ? 'Чат: разработчика' : ''}`;

      // Отправляем сообщение в сервисный чат
      await sendMessageToChat(targetChatId, fullMessage, {
        disable_web_page_preview: true,
      });
    }
  } catch (error) {
    await sendServiceMessage('Ошибка отправки сервисного сообщения в чат');
  }
};

const checkChatValidity = async () => {
  const chatIds = {
    DEV_CHAT_ID,
    SERVICE_CHAT_ID,
    TG_TEAM_CHAT_ID,
    OWNER_ID,
  };

  const results = []; // Сбор результатов проверки

  for (const [chatName, chatId] of Object.entries(chatIds)) {
    try {
      await bot.api.getChat(chatId);
      const message = `Чат ${chatName} (${chatId}) доступен.`;
      results.push(`✅ ${message}`); // Добавляем результат в массив
    } catch (error) {
      const errorMessage = `Ошибка доступа к чату ${chatName} (${chatId}): ${error.message}`;
      results.push(`❌ ${errorMessage}`); // Добавляем ошибку в массив
    }
  }

  // Сообщение для вывода
  const finalMessage = results.join('\n');

  if (isDevelopmentMode) {
    console.log('Результаты проверки чатов:\n', finalMessage);
  } else {
    await sendMessageToChat(OWNER_ID, `Результаты проверки чатов:\n${finalMessage}`);
  }
};

// Проверка валидности чатов при запуске бота
bot.start({
  onStart: async () => {
    await checkChatValidity();
  },
});

export const sendMessageToChat = async (chatId, message) => {
  try {
    await bot.api.sendMessage(chatId, message);
  } catch (error) {
    console.error(`Ошибка отправки сообщения в чат ${chatId}:`, error.message);

    // Уведомляем администратора об ошибке
    if (chatId !== OWNER_ID) {
      try {
        await sendMessageToChat(OWNER_ID, `Ошибка отправки сообщения в чат ${chatId}: ${error.message}`);
      } catch (adminError) {
        console.error(`Ошибка уведомления администратора:`, adminError.message);
      }
    }
  }
};

const saveMergeRequests = async (mergeRequests) => {
  try {
    fs.writeFileSync(path.resolve('bd/mergeRequests.json'), JSON.stringify(mergeRequests, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении МР в файл');
  }
};

const loadMergeRequests = async () => {
  try {
    const data = fs.readFileSync(path.resolve('bd/mergeRequests.json'));
    mergeRequests = JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке МР из файла:', error);
    await sendServiceMessage('Ошибка при загрузке МР из файла');
    return [];
  }
};

const saveScheduledJobs = async () => {
  const jobData = Object.values(schedule.scheduledJobs).map((job) => ({
    name: job.name,
    nextInvocation: job.nextInvocation() ? job.nextInvocation().toString() : null,
  }));
  try {
    fs.writeFileSync(path.resolve('bd/scheduledJobs.json'), JSON.stringify(jobData, null, 2));
  } catch (err) {
    await sendServiceMessage('Ошибка сохранения задач планировщика в файл');
  }
};

const loadScheduledJobs = async () => {
  try {
    const jobData = JSON.parse(fs.readFileSync(path.resolve('bd/scheduledJobs.json')));

    jobData.forEach(({ name, nextInvocation }) => {
      const [username, taskType] = name.split('_');
      const date = new Date(nextInvocation);

      if (taskType === 'notify') {
        if (name.includes('day_before')) {
          scheduleJob({
            username,
            includeDate: moment(date).add(1, 'days').format('YYYY-MM-DD'),
          });
        } else if (name.includes('day_of')) {
          scheduleJob({
            username,
            includeDate: moment(date).format('YYYY-MM-DD'),
          });
        }
      } else if (taskType === 'activate') {
        scheduleJob({
          username,
          includeDate: moment(date).add(1, 'days').format('YYYY-MM-DD'),
        });
      }
    });
  } catch (err) {
    await sendServiceMessage('Ошибка при загрузке задач из файла');
  }
};

// Обработка нажатий на кнопки календаря для смены месяца
bot.callbackQuery(/calendar-telegram-(prev|next)-.+/, async (ctx) => {
  // Извлекаем действие (prev или next) и данные из callback_query
  const action = ctx.match[1]; // prev или next
  const currentData = ctx.match.input.split('-').slice(2).join('-'); // Извлекаем дату из callback_query

  // Преобразуем дату в ISO формат
  const currentMoment = moment(currentData, 'YYYY-MM-DD'); // Преобразуем в формат 'YYYY-MM-DD'

  let newDate;
  if (action === 'prev') {
    newDate = currentMoment.subtract(1, 'month').toDate(); // Предыдущий месяц
  } else if (action === 'next') {
    newDate = currentMoment.add(1, 'month').toDate(); // Следующий месяц
  }

  // Обновляем календарь на новый месяц
  await ctx.editMessageReplyMarkup({
    reply_markup: calendar.getCalendar(newDate).reply_markup,
  });

  // Подтверждаем callback-запрос
  await ctx.answerCallbackQuery();
});

const scheduleJob = (job) => {
  const { username, includeDate } = job;
  const targetTeamChatId = isDevelopmentMode ? DEV_CHAT_ID : TG_TEAM_CHAT_ID;
  const targetServiceChatId = isDevelopmentMode ? DEV_CHAT_ID : SERVICE_CHAT_ID;

  // Уникальные имена задач для каждого события
  const notifyDayBefore = `${username}_notify_day_before`;
  const notifyDayOf = `${username}_notify_day_of`;
  const activateAtNight = `${username}_activate_at_night`;

  if (isDevelopmentMode) {
    // console.log('notifyDayBefore', moment.tz(includeDate, timeZone).subtract(1, 'days').set({ hour: 10, minute: 15 }).format());
    // console.log('notifyDayOf', moment.tz(includeDate, timeZone).set({ hour: 10, minute: 15 }).format());
    // console.log('activateAtNight', moment.tz(includeDate, timeZone).subtract(1, 'days').set({ hour: 21, minute: 0 }).format());
    // Если режим разработки, задачи запланированы через 1, 2 и 3 минуты от текущего времени
    const now = new Date();
    // const fiveSecondsLater = new Date(now.getTime() + 500 * 1000); // 5 секунд спустя

    const fiveSecondsLater = moment.tz(includeDate, timeZone).subtract(1, 'days').set({ hour: 21, minute: 0 }).toDate(); // 5 секунд спустя
    // const tenSecondsLater = new Date(now.getTime() + 1000 * 1000); // 10 секунд спустя
    const tenSecondsLater = moment.tz(includeDate, timeZone).set({ hour: 10, minute: 15 }).toDate(); // 10 секунд спустя
    // const fifteenSecondsLater = new Date(now.getTime() + 1500 * 1000); // 15 секунд спустя
    const fifteenSecondsLater = moment
      .tz(includeDate, timeZone)
      .subtract(1, 'days')
      .set({ hour: 21, minute: 0 })
      .toDate(); // 15 секунд спустя

    schedule.scheduleJob(notifyDayBefore, fiveSecondsLater, async () => {
      await sendMessageToChat(DEV_CHAT_ID, `Тестовое уведомление: Завтра выходит ${username}`);
      await saveScheduledJobs();
    });

    schedule.scheduleJob(notifyDayOf, tenSecondsLater, async () => {
      await includeUserByDate(username, false);
      await sendMessageToChat(OWNER_ID, `Тестовое уведомление: Разработчик ${username} активирован по планировщику!`);
      await sendMessageToChat(
        DEV_CHAT_ID,
        `Тестовое уведомление: Разработчик ${username} активирован по планировщику!`,
      );
      await saveScheduledJobs();
    });

    schedule.scheduleJob(activateAtNight, fifteenSecondsLater, async () => {
      await sendMessageToChat(
        DEV_CHAT_ID,
        `Тестовое уведомление: Всем привет! ${username} вышел на работу и может быть назначен ревьювером!`,
      );
      await saveScheduledJobs();
    });
  } else {
    // Запланировать уведомление за день до включения
    schedule.scheduleJob(
      notifyDayBefore,
      moment.tz(includeDate, timeZone).subtract(1, 'days').set({ hour: 10, minute: 15 }).toDate(),
      async () => {
        await sendMessageToChat(targetServiceChatId, `Завтра активируется ревьювер ${username}`);
        await saveScheduledJobs();
      },
    );

    // Запланировать уведомление в день включения в 10:15
    schedule.scheduleJob(
      notifyDayOf,
      moment.tz(includeDate, timeZone).set({ hour: 10, minute: 15 }).toDate(),
      async () => {
        await sendMessageToChat(targetTeamChatId, `Всем привет! ${username} вышел на работу! Поприветствуем его!`);
        await saveScheduledJobs();
      },
    );

    // Запланировать включение разработчика в 21:00 за день до includeDate
    schedule.scheduleJob(
      activateAtNight,
      moment.tz(includeDate, timeZone).subtract(1, 'days').set({ hour: 21, minute: 0 }).toDate(),
      async () => {
        await includeUserByDate(username, false);
        await sendMessageToChat(OWNER_ID, `Разработчик ${username} активирован по планировщику!`);
        await sendMessageToChat(targetServiceChatId, `Разработчик ${username} активирован по планировщику!`);
        await saveScheduledJobs();
      },
    );
  }
  saveScheduledJobs();
};

const showScheduledJobs = async (ctx) => {
  const jobs = Object.values(schedule.scheduledJobs);
  if (jobs.length === 0) {
    await ctx.reply('Нет запланированных задач в планировщике.');
    return;
  }

  let message = 'Запланированные задачи:\n';

  jobs.forEach((job) => {
    const jobName = job.name;
    const nextInvocation = job.nextInvocation(); // Получаем следующую дату выполнения
    const [username, taskType] = jobName.split('_');

    if (!nextInvocation) return; // Пропускаем задачи без запланированного времени выполнения

    // Преобразуем nextInvocation в объект Date
    const nextInvocationDate = new Date(nextInvocation.toString());

    switch (taskType) {
      case 'activate':
        message += `- Активация ревьювера с ником ${username} ${formatDateTime(nextInvocationDate)}.\n`;
        break;
      case 'notify':
        if (jobName.includes('day_before')) {
          message += `- Уведомление на день раньше в сервисную группу ${formatDateTime(nextInvocationDate)} о том, что ревьювер ${username} будет активирован завтра.\n`;
        } else if (jobName.includes('day_of')) {
          message += `- Уведомление команды ${formatDateTime(nextInvocationDate)} о том, что активирован ревьювер с ником ${username}.\n`;
        }
        break;
      default:
        message += `- Запланировано на ${formatDateTime(nextInvocationDate)}.\n`;
        break;
    }
  });

  await ctx.reply(message);
};

const loadDevelopmentMode = async () => {
  try {
    const data = await JSON.parse(fs.readFileSync(path.resolve('bd/developmentMode.json')));
    isDevelopmentMode = data.isDevelopmentMode || false;
  } catch (error) {
    await sendServiceMessage('Ошибка при загрузке состояния режима разработки');
  }
};

const saveDevelopmentMode = async () => {
  try {
    const data = {
      isDevelopmentMode,
    };
    fs.writeFileSync(path.resolve('bd/developmentMode.json'), JSON.stringify(data, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении состояния режима разработки');
  }
};

const loadMrCounter = async () => {
  try {
    const data = await JSON.parse(fs.readFileSync(path.resolve('bd/mrCounter.json')));
    mrCounter = data;
  } catch (error) {
    mrCounter = {
      daily: { count: 0, lastResetDate: moment().tz('Europe/Moscow').format('YYYY-MM-DD') },
      monthly: { count: 0, lastResetMonth: moment().tz('Europe/Moscow').format('YYYY-MM') },
      yearly: { count: 0, lastResetYear: moment().tz('Europe/Moscow').format('YYYY') },
    };
    await saveMrCounter();
    await sendServiceMessage('Ошибка при загрузке счетчика MR');
  }
};

const saveMrCounter = async () => {
  try {
    fs.writeFileSync(path.resolve('bd/mrCounter.json'), JSON.stringify(mrCounter, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении счетчика MR');
  }
};

const resetMrCounterIfNeeded = async () => {
  const currentDate = moment().tz('Europe/Moscow').format('YYYY-MM-DD');
  const currentMonth = moment().tz('Europe/Moscow').format('YYYY-MM');
  const currentYear = moment().tz('Europe/Moscow').format('YYYY');

  // Проверяем и инициализируем mrCounter, если он undefined
  if (!mrCounter || typeof mrCounter !== 'object') {
    mrCounter = {
      daily: { count: 0, lastResetDate: currentDate },
      monthly: { count: 0, lastResetMonth: currentMonth },
      yearly: { count: 0, lastResetYear: currentYear },
    };
  }

  // Инициализируем вложенные объекты, если они отсутствуют
  if (!mrCounter.daily || typeof mrCounter.daily !== 'object') {
    mrCounter.daily = { count: 0, lastResetDate: currentDate };
  }
  if (!mrCounter.monthly || typeof mrCounter.monthly !== 'object') {
    mrCounter.monthly = { count: 0, lastResetMonth: currentMonth };
  }
  if (!mrCounter.yearly || typeof mrCounter.yearly !== 'object') {
    mrCounter.yearly = { count: 0, lastResetYear: currentYear };
  }

  // Сброс счетчика за день
  if (mrCounter.daily.lastResetDate !== currentDate) {
    mrCounter.daily.count = 0;
    mrCounter.daily.lastResetDate = currentDate;
  }

  // Сброс счетчика за месяц
  if (mrCounter.monthly.lastResetMonth !== currentMonth) {
    mrCounter.monthly.count = 0;
    mrCounter.monthly.lastResetMonth = currentMonth;
  }

  // Сброс счетчика за год
  if (mrCounter.yearly.lastResetYear !== currentYear) {
    mrCounter.yearly.count = 0;
    mrCounter.yearly.lastResetYear = currentYear;
  }

  await saveMrCounter();
};

// Функция для планирования уведомлений о невлитых Merge Requests
const scheduleUnmergedMergeRequestsNotification = () => {
  if (isDevelopmentMode) {
    // Если режим разработки, задачи запланированы через 3 секунд от текущего времени
    const now = new Date();
    const sevenSecondsLater = new Date(now.getTime() + 3000); // 3 секунд спустя
    schedule.scheduleJob(sevenSecondsLater, async () => {
      await sendUnmergedMergeRequestsNotification(true);
    });
  } else {
    // Если обычный режим, задачи запланированы на 18:00 по московскому времени каждый день
    schedule.scheduleJob('0 18 * * *', async () => {
      await sendUnmergedMergeRequestsNotification();
    });

    // Запланировать уведомление о невлитых МРах на 10:00 утра по московскому времени каждый день
    schedule.scheduleJob('0 10 * * *', async () => {
      await sendUnmergedMergeRequestsNotification(true);
    });
  }
};

const incrementMrCounter = async (ctx, count = 1) => {
  // Работает только для ID чата команды
  if (ctx.chat.id.toString() !== TG_TEAM_CHAT_ID.toString()) return;

  await resetMrCounterIfNeeded();

  // Увеличиваем счетчики
  mrCounter.daily.count += count;
  mrCounter.monthly.count += count;
  mrCounter.yearly.count += count;

  await saveMrCounter();

  // Отправляем мотивационное сообщение при достижении порога
  if (mrCounter.daily.count % 10 === 0) {
    setTimeout(async () => {
      await sendMotivationalMessage(ctx);
    }, 30000);
  }
};

const sendMotivationalMessage = async (ctx) => {
  const message = getRandomPhraseWithCounter(motivationalMessages, mrCounter);
  await ctx.reply(message);
};

const loadUserList = async () => {
  try {
    const data = await fs.readFileSync(path.resolve('bd/userList.json'));
    userList = JSON.parse(data);
  } catch (error) {
    await sendServiceMessage('Ошибка чтения всех разработчиков из файла');
  }
};

const loadExcludedUsers = async () => {
  try {
    const data = await fs.readFileSync(path.resolve('bd/excludedUsers.json'));
    excludedUsers = JSON.parse(data);
    // Планируем задачи при загрузке
    excludedUsers.forEach((user) => {
      scheduleJob(user);
    });
  } catch (error) {
    await sendServiceMessage('Ошибка при чтении исключенных разработчиков из файла');
  }
};

// Сохранение userList в JSON файл
const saveUserList = async () => {
  try {
    fs.writeFileSync(path.resolve('bd/userList.json'), JSON.stringify(userList, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении разработчика в файл');
  }
};

// Сохранение excludedUsers в JSON файл
const saveExcludedUsers = async () => {
  try {
    fs.writeFileSync(path.resolve('bd/excludedUsers.json'), JSON.stringify(excludedUsers, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении исключенного разработчика в файл');
  }
};

const isUserExcluded = (username) => {
  return excludedUsers.some((user) => user.username === username);
};

const getUserExclusionIndex = (username) => {
  return excludedUsers.findIndex((user) => user.username === username);
};

// Загрузка предлодений из файла
const loadSuggestions = async () => {
  try {
    const data = fs.readFileSync(path.resolve('bd/suggestions.json'));
    suggestions = JSON.parse(data);
  } catch (error) {
    await sendServiceMessage('Ошибка чтения предложений из файла');
  }
};

const addUser = async (ctx, messengerNick, gitlabName) => {
  userList.push({ messengerNick, gitlabName });
  await saveUserList();
  await sendServiceMessage(
    `Разработчик ${messengerNick} - ${gitlabName} добавлен в список разработчиков✅😊`,
    ctx.from.id,
    ctx.from.username,
  );
};

const initializeBot = async () => {
  await loadDevelopmentMode(); // Загружаем режим разработки
  await loadUserList(); // Загружаем список пользователей
  await loadExcludedUsers(); // Загружаем исключенных пользователей
  await loadSuggestions(); // Загружаем предложения
  await loadMrCounter(); // Загружаем счетчик МР
  await resetMrCounterIfNeeded(); // Сбрасываем счетчики, если нужно
  await loadScheduledJobs(); // Загружаем задачи планировщика
  await loadMergeRequests(); // Загружаем Merge Requests
  scheduleUnmergedMergeRequestsNotification(); // Запланируем уведомления о невлитых МР
};

// Запуск инициализации
initializeBot();

// Функция для управления сессиями
const getSession = (chatId) => {
  if (!sessions[chatId]) {
    sessions[chatId] = {};
  }
  return sessions[chatId];
};

// Проверка, является ли пользователь администратором
const isAdmin = async (ctx) => {
  const userId = ctx.from.id;

  // Проверка, есть ли пользователь в списке adminIds (личные сообщения)
  if (ADMINS_IDS.includes(userId)) {
    return true;
  }

  // Проверка, является ли пользователь администратором группы
  try {
    const chatMember = await ctx.getChatMember(userId);
    return chatMember.status === 'administrator' || chatMember.status === 'creator';
  } catch (e) {
    console.error('Ошибка при проверке прав администратора:', e);
    return false;
  }
};

// Функция для отображения меню
const showMenu = async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('✅ Добавить разработчика', 'add_user')
    .row()
    .text('❌ Удалить разработчика', 'remove_user')
    .row()
    .text('🔴 Исключить разработчика', 'exclude_user')
    .row()
    .text('🟢 Включить разработчика', 'include_user')
    .row()
    .text('🌟 Показать разработчиков', 'list_users')
    .row()
    .text('ℹ️ HELP', 'help');

  if (ctx.chat.type === 'private') {
    if (loggingEnabled) {
      keyboard.row().text('🔕 Выключить логирование', 'disable_logging');
    } else {
      keyboard.row().text('🔔 Включить логирование', 'enable_logging');
    }

    if (ctx.from.id.toString() === OWNER_ID) {
      // Проверяем, что ID отправителя совпадает с OWNER_ID
      if (isDevelopmentMode) {
        keyboard.row().text('🚧 Выключить режим разработки', 'disable_dev_mode');
      } else {
        keyboard.row().text('🚧 Включить режим разработки', 'enable_dev_mode');
      }
    }
  }

  if (
    (ctx.chat.id.toString() === SERVICE_CHAT_ID.toString() ||
      ctx.chat.id.toString() === DEV_CHAT_ID.toString() ||
      ctx.chat.type === 'private') &&
    (await isAdmin(ctx))
  ) {
    keyboard.row().text('💡 Предложения по доработке', 'suggestions');
  }

  await ctx.reply('Выберите действие:', {
    reply_markup: keyboard,
  });
};

const startBot = async (ctx) => {
  if (await isAdmin(ctx)) {
    await showMenu(ctx);
  } else {
    await ctx.reply('У Вас нет прав для управления этим ботом.');
  }
};

const simpleChooseReviewers = async (ctx, message, authorNick, countMrs) => {
  // Выбор двух случайных ревьюверов
  const availableReviewers = userList
    .filter((user) => user.messengerNick !== authorNick)
    .filter((user) => !isUserExcluded(user.messengerNick));
  const reviewers = getRandomElements(availableReviewers, 2);
  const reviewerMentions = reviewers.map((reviewer) => reviewer.messengerNick).join(' и ');
  await incrementMrCounter(ctx, countMrs); // Одобавляем + countMrs к счетчику МРов
  const timeMessage = getUserTimeMessage(ctx);
  await ctx.reply(
    getEveningMessage(
      `Назначены ревьюверы:${isDevelopmentMode ? ' simpleChooseReviewers ' : ''} ${reviewerMentions}`,
      timeMessage,
    ),
    {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    },
  );
};

const sendUnmergedMergeRequestsInfo = async (ctx) => {
  await updateMergeRequestsStatus(); // Обновляем информацию о статусах

  const currentDate = moment().startOf('day'); // Начало текущего дня

  // Фильтруем невлитые МР, созданные до начала текущего дня
  const unmergedMRs = mergeRequests.filter((mr) => {
    const mrCreationDate = moment(mr.createdAt); // Дата создания МР
    return mr.approvalsLeft > 0 && mrCreationDate.isBefore(currentDate); // МР, созданные до начала текущего дня
  });

  if (unmergedMRs.length === 0) {
    await ctx.reply('Все Мрчики влиты😍');
    return;
  }

  const messageParts = unmergedMRs.map((mr) => `${mr.url} - осталось аппрувов: ${mr.approvalsLeft}`);
  const message = `Невлитые Merge Requests:\n\n${messageParts.join('\n')}`;

  await ctx.reply(message);
};

const updateMergeRequestsStatus = async () => {
  try {
    for (const mr of mergeRequests) {
      try {
        const mrStatusUrl = `https://${GITLAB_URL}/api/v4/projects/${mr.projectId}/merge_requests/${mr.mrId}/approvals`;
        const { data: mrStatusResponse, status: mrStatusStatus } = await axiosInstance.get(mrStatusUrl);
        if (mrStatusStatus === 200) {
          mr.approvalsLeft = mrStatusResponse.approvals_left || 0;
          mr.state = mrStatusResponse.state;
          if (mr.state === 'merged' || mr.state === 'closed' || mr.approvalsLeft <= 0) {
            mr.remove = true; // Помечаем для удаления
          }
        }
      } catch (err) {
        await sendServiceMessage(`Ошибка обновления статуса для МР: ${mr.url}:`);
      }
    }

    // Удаление устаревших МР
    mergeRequests = mergeRequests.filter((mr) => !mr.remove);
    await saveMergeRequests(mergeRequests);
  } catch (error) {
    await sendServiceMessage('Ошибка при обновлении статусов МР.');
  }
};

const sendUnmergedMergeRequestsNotification = async (isMorning = false) => {
  await updateMergeRequestsStatus(); // Обновляем информацию о статусах

  const currentDate = moment().startOf('day'); // Начало текущего дня

  // Фильтруем невлитые МР, созданные до начала текущего дня
  const unmergedMRs = mergeRequests.filter((mr) => {
    const mrCreationDate = moment(mr.createdAt); // Дата создания МР
    return mr.approvalsLeft > 0 && mrCreationDate.isBefore(currentDate); // МР, созданные до начала текущего дня
  });

  if (unmergedMRs.length === 0) {
    return; // Если нет невлитых МРов, не отправляем уведомление
  }

  const messageParts = unmergedMRs.map((mr) => `${mr.url} - осталось аппрувов: ${mr.approvalsLeft}`);
  const message = `Уважаемые товарищи👷🏼‍♀👷🏼‍♂\nРабочий день ${isMorning ? 'только начинается' : 'заканчивается'}, а у нас все еще есть невлитые ${isMorning ? 'с вчерашнего дня' : ''} МРчики:\n\n${messageParts.join(
    '\n',
  )}\n\nПросьба пройтись ${isMorning ? '' : ', чтобы авторы МРов могли отправиться домой с чистой совестью.'}`;

  const targetTeamChatId = isDevelopmentMode ? DEV_CHAT_ID : TG_TEAM_CHAT_ID;

  await sendMessageToChat(targetTeamChatId, message);
};

const checkMergeRequestByGitlab = async (ctx, message, authorNick) => {
  const mrLinks = message.match(new RegExp(`https?:\/\/${GITLAB_URL}\/[\\w\\d\\-\\._~:\\/?#\\[\\]@!$&'()*+,;=]+`, 'g'));

  if (!mrLinks || !mrLinks.length) {
    return false; // Возвращаем false, если нет ссылок MR
  }

  let allAnswers = ''; // Собираем все невалидные сообщения для всех МРов
  let error = ''; // Собираем ошибки
  let success = false; // Флаг успешного выполнения

  // если несколько МРов - добавил шутку, чтобы все знали что бот не завис,
  // так как нужно время чтобы прочекать все МРы
  if (mrLinks.length > 4) {
    await ctx.reply(getRandomPhraseWithCounter(manyMrPhrases, mrLinks.length), {
      reply_to_message_id: ctx.message.message_id,
    });
  }

  for (const mrUrl of mrLinks) {
    try {
      const response = await axiosInstance.get(mrUrl);

      if (response.status === 200) {
        const projectName = mrUrl.match(/\/([^\/]+)\/-\/merge_requests\//)?.[1];
        const mrId = mrUrl.match(/\/merge_requests\/(\d+)$/)?.[1];

        const projectSearchUrl = `https://gitlab.dpr.norbit.ru/api/v4/projects?search=${projectName}`;
        const { data: projectSearchUrlData, status: projectSearchUrlStatus } =
          await axiosInstance.get(projectSearchUrl);

        if (projectSearchUrlStatus !== 200) {
          error += `МР: ${mrUrl}.\nОшибка: Не смог подключиться к API Gitlab`;
          return false;
        }
        let reallyProject = null;
        for (const project of projectSearchUrlData) {
          if (
            project?.path_with_namespace?.toLowerCase()?.includes('andrey.singaevskiy') ||
            project?.path_with_namespace?.toLowerCase()?.includes('bpmsoft')
          ) {
            continue;
          }
          reallyProject = project;
          break;
        }

        const projectId = reallyProject?.id;
        const mrStatusUrl = `https://${GITLAB_URL}/api/v4/projects/${projectId}/merge_requests/${mrId}`;
        const { data: mrStatusResponse, status: mrStatusStatus } = await axiosInstance.get(mrStatusUrl);

        if (mrStatusStatus !== 200 || mrStatusStatus === 404) {
          error += `МР: ${mrUrl}.\nОшибка: Не смог получить статус МРа в API Gitlab`;
          return false;
        }

        const mergeRequestTitle = mrStatusResponse?.title;
        const mergeRequestState = mrStatusResponse?.state;
        const mergeRequestPipelineFailed = mrStatusResponse?.pipeline?.status === 'failed';

        if (!!mergeRequestPipelineFailed) {
          allAnswers += '\n🚨В данном Мре упал pipeline. Посмотри в чем проблема!🚨\n';
        }

        if (mergeRequestTitle?.toLowerCase()?.startsWith('draft:')) {
          allAnswers += `\n${mrUrl}\nМР в драфте! Перепроверь, пожалуйста😉\n🚨Ревьюверы не назначаются на MRы в статусе 'Draft'🚨\n`;
          success = true;
          continue;
        }

        if (mergeRequestState?.toLowerCase() === 'merged' && !isDevelopmentMode) {
          allAnswers += `\n${mrUrl}\nЭтот МР уже влит) Может ссылка не та?🤔\n`;
          success = true;
          continue;
        }

        if (mergeRequestState?.toLowerCase() === 'closed' && !isDevelopmentMode) {
          allAnswers += `\n${mrUrl}\nЭтот МР закрыт) Может ссылка не та?🤔\n`;
          success = true;
          continue;
        }
        const approvalRulesUrl = `https://${GITLAB_URL}/api/v4/projects/${projectId}/merge_requests/${mrId}/approval_rules`;
        const suggestedApprovalUrl = `https://${GITLAB_URL}/api/v4/projects/${projectId}/merge_requests/${mrId}/approvals`;

        // Получаем список разрешенных апруверов
        const { data: suggestedApprovalResponse, status: suggestedApprovalStatus } =
          await axiosInstance.get(suggestedApprovalUrl);

        // Получаем список всех групп апруверов
        const { data: approvalRulesUrlResponse, status: approvalRulesUrlStatus } =
          await axiosInstance.get(approvalRulesUrl);

        if (approvalRulesUrlStatus !== 200 || suggestedApprovalStatus !== 200) {
          error += `МР: ${mrUrl}.\nОшибка: Не смог получить ревьюверов в API Gitlab`;
          return false;
        }

        const suggestedApproval = suggestedApprovalResponse.suggested_approvers.map((approver) => approver.username);

        let leadApprovers = [];
        let simpleApprovers = [];
        let leadRequired = false;
        const activeUsers = userList.filter((user) => !isUserExcluded(user.messengerNick));

        for (const rule of approvalRulesUrlResponse) {
          if (!rule.name || !rule.approvals_required || !rule.eligible_approvers) {
            continue;
          }

          if (rule?.name?.toLowerCase() === 'lead') {
            leadRequired = rule.approvals_required > 0;
            leadApprovers = rule.eligible_approvers
              .filter((approver) =>
                activeUsers.some((user) => user.gitlabName === approver.username && user.messengerNick !== authorNick),
              )
              .filter((approver) => suggestedApproval.includes(approver.username));
          } else if (rule.name.startsWith('Check MR')) {
            simpleApprovers = rule.eligible_approvers
              .filter((approver) =>
                activeUsers.some((user) => user.gitlabName === approver.username && user.messengerNick !== authorNick),
              )
              .filter((approver) => suggestedApproval.includes(approver.username));
          }
        }

        if (leadApprovers.length === 0 && simpleApprovers.length === 0) {
          allAnswers += `\n${mrUrl}\n🚨Никто не работает из ревьюверов или может ты скинул его не в тот чатик?🤔😉🚨\n`;
          error += `МР: ${mrUrl}.\nОшибка: Нет доступных ревьюверов на основе данных API Gitlab(скорее всего потребуется обмен апрува на лайк)`;
          continue;
        }

        let selectedLeadNick = null;
        let selectedCheckMrNick = null;
        let leadUnavailableMessage = '';

        // проверяем нужен ли апрув лида
        if (leadRequired && leadApprovers.length > 0) {
          selectedLeadNick = leadApprovers[Math.floor(Math.random() * leadApprovers.length)].username;
        } else if (leadRequired && leadApprovers.length === 0) {
          leadUnavailableMessage =
            '\nВ данный МР требуется ревьювер из команды Lead, но эти разработчики сегодня не работают.😔';
          await sendServiceMessage(
            `МР: ${mrUrl}.\nОшибка: не хватает активных ревьюверов из команды Lead. Просьба проверить😊`,
          );
        }

        if (simpleApprovers.length > 0) {
          let remainingApprovers = simpleApprovers.filter((user) => user.username !== selectedLeadNick);
          if (remainingApprovers.length > 0) {
            selectedCheckMrNick = remainingApprovers[Math.floor(Math.random() * remainingApprovers.length)].username;
          }
        }

        if (!selectedLeadNick) {
          selectedLeadNick = selectedCheckMrNick;
          // Фильтруем оставшихся ревьюверов, исключая выбранного
          let remainingApprovers = simpleApprovers.filter(
            (user) =>
              activeUsers.find((activeUser) => activeUser.gitlabName === user.username).messengerNick !==
              selectedLeadNick,
          );

          if (remainingApprovers.length > 0) {
            const selectedCheckMr = remainingApprovers[Math.floor(Math.random() * remainingApprovers.length)];
            selectedCheckMrNick = activeUsers.find(
              (user) => user.gitlabName === selectedCheckMr.username,
            ).messengerNick;
          }
        }
        const messengerNickLead = activeUsers.find((lead) => lead.gitlabName === selectedLeadNick).messengerNick;
        const messengerNickSimpleReviewer = activeUsers.find(
          (lead) => lead.gitlabName === selectedCheckMrNick,
        ).messengerNick;

        allAnswers += `\n${mrUrl}\nНазначены ревьюверы:${isDevelopmentMode ? ' GITLAB ' : ''} ${messengerNickLead} и ${messengerNickSimpleReviewer}${leadUnavailableMessage}\n`;
        await incrementMrCounter(ctx); // Одобавляем + 1 к счетчику МРов

        mergeRequests.push({
          url: mrUrl,
          approvalsLeft: 2,
          author: authorNick,
          projectId,
          mrId,
          createdAt: mrStatusResponse.created_at,
        });
        await saveMergeRequests(mergeRequests); // Сохраняем МР

        success = true; // Устанавливаем флаг успешного выполнения
      }
    } catch (errors) {
      await sendServiceMessage(`МР: ${mrUrl}.\nПроизошла ошибка при подключении к API Gitlab`);
      return false; // Если произошла ошибка, возвращаем false
    }
  }

  if (success) {
    const timeMessage = getUserTimeMessage(ctx);
    await ctx.reply(getEveningMessage(allAnswers, timeMessage), {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    if (!!error) {
      await sendServiceMessage(`Ошибки при назначении ревьюверов:\n\n${error}`);
    }
    return true; // Возвращаем true, если удалось успешно выполнить назначение ревьюверов
  } else {
    await sendServiceMessage(`Ошибки при подключении к гитлабу:\n\n${error}`);
    return false;
  }
};

const assignReviewers = async (ctx, message, authorNick) => {
  const availableReviewers = userList
    .filter((user) => user.messengerNick !== authorNick)
    .filter((user) => !isUserExcluded(user.messengerNick));

  if (availableReviewers.length === 0) {
    const timeMessage = getUserTimeMessage(ctx);
    await ctx.reply(getEveningMessage(`Нет активных ревьюверов.🥴\nСейчас разберемся!`, timeMessage), {
      reply_to_message_id: ctx.message.message_id,
      disable_web_page_preview: true,
    });
    await sendServiceMessage(`${message}.\n\nПочему-то нет ревьюверов. Просьба проверить😊`);
    return;
  }

  if (availableReviewers.length === 1) {
    const reviewer = getRandomElements(availableReviewers, 1);
    const timeMessage = getUserTimeMessage(ctx);
    await ctx.reply(
      getEveningMessage(
        `Назначен единственный доступный ревьювер: ${reviewer[0].messengerNick}. Требуется еще 1 ревьювер.😳`,
        timeMessage,
      ),
      {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      },
    );
    await incrementMrCounter(ctx); // Одобавляем + 1 к счетчику МРов
    await sendServiceMessage(`${message}.\n\nПочему-то только один ревьювер доступен. Просьба проверить😊`);
    return;
  }

  // Проверяем что в сообщении именно МР а не левая ссылка
  const mrLinks = message.match(new RegExp(`https?:\/\/${GITLAB_URL}\/[\\w\\d\\-\\._~:\\/?#\\[\\]@!$&'()*+,;=]+`, 'g'));
  if (!mrLinks || !mrLinks.length) {
    return await sendServiceMessage(`${message}\n\nКакая-то проблема с сылкой на МР. Просьба посмотреть!😊`);
  }

  // Пробуем получить ревьюверов через GitLab
  const status = await checkMergeRequestByGitlab(ctx, message, authorNick);

  if (status) {
    return; // Если удалось получить ревьюверов через GitLab, прерываем выполнение функции
  }

  // Если нет соединения с GitLab, используем резервный метод
  await simpleChooseReviewers(ctx, message, authorNick, mrLinks.length);
};

// Показать календарь для выбора даты включения разработчика
const showCalendar = async (ctx, username) => {
  await ctx.reply(
    `Выберите дату автоматического включения разработчика ${username}:`,
    calendar.getCalendar(new Date()),
  );
  calendarData = {
    isOpen: true,
    userName: username,
  };
};

// Функция для обработки исключения с датой включения
const excludeUserWithDate = async (ctx, username, includeDate) => {
  if (!isUserExcluded(username)) {
    excludedUsers.push({ username, includeDate });
    await saveExcludedUsers();

    // Планируем задачу
    scheduleJob({ username, includeDate });
  }
};

// Функция для планирования включения разработчика
const scheduleUserInclusion = (username, includeDate) => {
  const now = new Date();
  const inclusionDate = new Date(includeDate);

  const delay = inclusionDate.getTime() - now.getTime();

  if (delay > 0) {
    setTimeout(async () => {
      await includeUserByDate(username);
    }, delay);
  }
};

const includeUserByDate = async (username, needSendServiceMessage = true) => {
  const index = getUserExclusionIndex(username);
  if (index !== -1) {
    excludedUsers.splice(index, 1);
    await saveExcludedUsers();

    // Удаляем задачи для этого пользователя
    removeScheduledJobs(username);

    if (needSendServiceMessage) {
      await sendServiceMessage(`Разработчик ${username} автоматически включен.✅`);
    }
  }
};

const includeUser = async (ctx, username) => {
  const index = getUserExclusionIndex(username);
  if (index !== -1) {
    excludedUsers.splice(index, 1);
    if (loggingEnabled) {
      await sendServiceMessage(`Разработчик ${username} активен✅`, ctx.from.id, ctx.from.username);
    }
    await saveExcludedUsers();

    // Удаляем задачи для этого пользователя
    removeScheduledJobs(username);
  }
};

const removeScheduledJobs = (username) => {
  // Удаляем все задачи для этого пользователя
  const jobsToCancel = [`${username}_notify_day_before`, `${username}_notify_day_of`, `${username}_activate_at_night`];

  jobsToCancel.forEach((jobName) => {
    const job = schedule.scheduledJobs[jobName];
    if (job) {
      job.cancel(); // Отменяем задачу
      delete schedule.scheduledJobs[jobName]; // Удаляем задачу из списка
    }
  });

  // Сохраняем изменения в файл
  saveScheduledJobs();
};

// Функция для отображения списка пользователей
const listUsers = async (ctx) => {
  const activeUsers = userList.filter((user) => !isUserExcluded(user.messengerNick));
  const allUsers = userList.map((user) => `${user.messengerNick} - ${user.gitlabName}`).join('\n');
  const excluded = userList
    .filter((user) => isUserExcluded(user.messengerNick))
    .map((user) => {
      const userObj = excludedUsers.find((exUser) => exUser.username === user.messengerNick);
      return `${user.messengerNick} - ${user.gitlabName}\n(автоматически активируется:\n${formatDate(userObj.includeDate)})`;
    })
    .join('\n');
  const active = activeUsers.map((user) => `${user.messengerNick} - ${user.gitlabName}`).join('\n');

  const response = `Все разработчики:\n${allUsers}\n\nАктивные разработчики:\n${active}\n\nВременно не активные разработчики:\n${excluded}`;
  await ctx.reply(response);
  await showMenu(ctx);
};

// Обработка отображения списка пользователей для действия
const showUserList = async (ctx, action) => {
  let users;
  if (action === 'remove_user') {
    users = userList; // Показываем всех пользователей, включая исключенных
  } else if (action === 'exclude_user') {
    users = userList.filter((user) => !isUserExcluded(user.messengerNick));
  } else if (action === 'include_user') {
    users = userList.filter((user) => isUserExcluded(user.messengerNick));
  }

  if (!users || users.length === 0) {
    await ctx.reply('Нет доступных разработчиков для этого действия.');
    await showMenu(ctx);
    return;
  }

  const keyboard = new InlineKeyboard();
  users.forEach((user) => {
    keyboard.row().text(`${user.messengerNick} - ${user.gitlabName}`, `${action}:${user.messengerNick}`);
  });

  await ctx.reply('Выберите разработчика:', {
    reply_markup: keyboard,
  });
};

// Обработка команды /help
const helpCommand = async (ctx) => {
  let helpText =
    '/start - Запустить бота\n' +
    '/help - Показать это сообщение\n\n' +
    '<b><i>Добавить разработчика</i></b> - Добавить разработчика в список сотрудников\n\n' +
    '<b><i>Удалить разработчика</i></b> - Удалить разработчика из списка сотрудников (например, удалить уволенного сотрудника)\n\n' +
    '<b><i>Исключить разработчика</i></b> - Сделать разработчика временно неактивным (например, разработчик в отпуске или на больничном)\n\n' +
    '<b><i>Включить разработчика</i></b> - Вернуть временно неактивного разработчика в список сотрудников\n\n' +
    '<b><i>Показать разработчиков</i></b> - Отобразить текущий список всех разработчиков, в том числе и неактивных разработчиков. Ревьюверы выбираются только из списка активных сотрудников\n\n' +
    '<b><i>Включить логирование</i></b> - Доступно только если писать боту в личку. Включает отображение логов подключения к гитлабу(для тестирования).';

  if (
    (ctx.chat.id.toString() === SERVICE_CHAT_ID.toString() ||
      ctx.chat.id.toString() === DEV_CHAT_ID.toString() ||
      ctx.chat.type === 'private') &&
    (await isAdmin(ctx))
  ) {
    helpText += '\n\n<b><i>Предложения по доработке</i></b> - Отправить разработчику текст с пожеланием доработки бота';
  }
  await ctx.reply(helpText, { parse_mode: 'HTML' });
  await showMenu(ctx);
};

bot.command('start', async (ctx) => await startBot(ctx));

bot.command('help', async (ctx) => {
  if (await isAdmin(ctx)) {
    await helpCommand(ctx);
  } else {
    await ctx.reply('У вас нет прав для управления этим ботом.');
  }
});

bot.command('chatid', async (ctx) => {
  if (await isAdmin(ctx)) {
    const chatId = ctx.chat.id;
    await ctx.reply(`Chat ID: ${chatId}`);
  } else {
    await ctx.reply('У вас нет прав для управления этим ботом.');
  }
});

bot.command('mrcount', async (ctx) => {
  if (await isAdmin(ctx)) {
    await resetMrCounterIfNeeded();
    const dailyCount = mrCounter.daily?.count || 0;
    const monthlyCount = mrCounter.monthly?.count || 0;
    const yearlyCount = mrCounter.yearly?.count || 0;

    await ctx.reply(
      `Количество MR:\nЗа текущие сутки: ${dailyCount}\nЗа текущий месяц: ${monthlyCount}\nЗа текущий год: ${yearlyCount}`,
    );
  } else {
    await ctx.reply('У вас нет прав для выполнения этой команды.');
  }
});

bot.command('jobs', async (ctx) => {
  if (await isAdmin(ctx)) {
    await showScheduledJobs(ctx);
  } else {
    await ctx.reply('У вас нет прав для выполнения этой команды.');
  }
});

bot.command('all', async (ctx) => {
  // Получаем текст сообщения после команды /all
  const messageText = ctx.message.text.split(' ').slice(1).join(' ');

  // Проверяем, есть ли текст после команды
  if (!messageText) {
    await ctx.reply('Пожалуйста, добавьте текст после команды /all.');
    return;
  }

  // Получаем список активных ревьюеров
  const activeReviewers = userList
    .filter((user) => !isUserExcluded(user.messengerNick))
    .map((user) => user.messengerNick)
    .join(' ');

  // Формируем сообщение
  const message = `${activeReviewers}\n\n${messageText}`;

  // Отправляем сообщение в чат с экранированием символов
  await ctx.reply(message);
});

bot.command('mrinfo', async (ctx) => {
  if (await isAdmin(ctx)) {
    // Проверяем, является ли пользователь администратором
    await sendUnmergedMergeRequestsInfo(ctx);
  } else {
    await ctx.reply('У вас нет прав для выполнения этой команды.');
  }
});

bot.on(':voice', async (ctx) => {
  await ctx.reply('Ай нехорошо голосовые в чат отправлять!🥴', { reply_to_message_id: ctx.message.message_id });
});

// Обработка сообщений с MR
bot.on('::url').filter(checkMr, async (ctx) => {
  const { text, entities } = ctx.message;

  // Массив для хранения всех ссылок
  let urls = '';

  // Проходим по всем entities и ищем ссылки(могут быть скрыты за richText)
  entities.forEach((entity) => {
    if (entity.type === 'url') {
      // Извлекаем ссылку из текста, используя offset и length
      const url = text.substring(entity.offset, entity.offset + entity.length);
      urls += ' ' + url;
    } else if (entity.type === 'text_link') {
      // Если это текстовая ссылка, берем её напрямую из entity
      urls += ' ' + entity.url;
    }
  });

  // Автор сообщения
  const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
  // Назначаем ревьюверов на основе найденного MR
  await assignReviewers(ctx, urls, username);
});

// Обработка добавления пользователя
bot.on('msg:text', async (ctx) => {
  const session = getSession(ctx.chat.id);

  if (session.awaitingSuggestionsInput) {
    const suggestion = ctx.message.text;

    // Сохраняем предложение в файл JSON
    suggestions.push({
      userId: ctx.from.id,
      username: ctx.from.username,
      suggestion,
      timestamp: new Date().toISOString(),
    });

    fs.writeFileSync(path.resolve('bd/suggestions.json'), JSON.stringify(suggestions, null, 2));

    await ctx.reply('Спасибо! Ваши пожелания переданы!😘');
    session.awaitingSuggestionsInput = false;
    await showMenu(ctx);
    // Отправка сообщения разработчику в личку
    await sendMessageToChat(
      OWNER_ID,
      `Новое предложение по боту от ${ctx.from.username || ctx.from.first_name}: ${suggestion}`,
    );
    return;
  }

  // если не нажата кнопка добавления пользователя
  if (!session.awaitingUserInput) return;

  const [telegramNick, gitlabNick] = ctx.message.text.split(' ');

  if (!telegramNick || !gitlabNick || ctx.message.text.split(' ').length !== 2) {
    await ctx.reply(
      'Неверный формат. Введите ник разработчика в формате: "@TelegramNick GitLabNick", например @ivanov Ivan.Ivanov',
    );
    return;
  }

  const exists = userList.find((user) => user.messengerNick === telegramNick);

  if (!exists) {
    await addUser(ctx, telegramNick, gitlabNick);
    await ctx.reply(`Разработчик ${telegramNick} добавлен в список с GitLab ником ${gitlabNick}.`);
  } else {
    await ctx.reply(`Разработчик ${telegramNick} уже в списке.`);
  }

  session.awaitingUserInput = false;
  await listUsers(ctx);
});

// Обработка выбранного действия над пользователем
bot.callbackQuery(/(remove_user|exclude_user|include_user):(.+)/, async (ctx) => {
  try {
    const [action, username] = ctx.callbackQuery.data.split(':');

    const userIndex = userList.findIndex((user) => user.messengerNick === username);

    if (userIndex !== -1) {
      let responseMessage = '';

      switch (action) {
        case 'remove_user':
          userList.splice(userIndex, 1);
          await saveUserList();
          if (loggingEnabled) {
            await sendServiceMessage(
              `Разработчик ${username} УДАЛЕН из списка разработчиков❌🚨🚨🚨`,
              ctx.from.id,
              ctx.from.username,
            );
          }
          if (isUserExcluded(username)) {
            await includeUser(ctx, username);
          }
          responseMessage = `Разработчик ${username} удален из списка.`;
          break;
        case 'exclude_user':
          if (!isUserExcluded(username)) {
            await showCalendar(ctx, username);
          }
          break;
        case 'include_user':
          if (isUserExcluded(username)) {
            await includeUser(ctx, username);
            responseMessage = `Разработчик ${username} возвращен в список.`;
          }
          break;
      }

      // Проверка на изменение сообщения перед его редактированием
      if (responseMessage) {
        await ctx.editMessageText(responseMessage);
      }

      if (calendarData.isOpen) return;
      await listUsers(ctx);
    } else {
      console.error('User not found:', username);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
  }
});

// Обработка нажатий на кнопки
bot.callbackQuery(/.*/, async (ctx) => {
  const action = ctx.callbackQuery.data;
  const session = getSession(ctx.chat.id);
  // Если не админ
  if (!(await isAdmin(ctx))) {
    await ctx.answerCallbackQuery({ text: 'У вас нет прав для управления этим ботом.', show_alert: true });
    return;
  }

  // Если бот ждет текст, но пользователь нажал другую кнопку, сбрасываем ожидание
  if (session.awaitingSuggestionsInput) {
    session.awaitingSuggestionsInput = false;
  }

  if (calendarData.isOpen && action.startsWith('calendar-telegram-date-')) {
    const dateText = action.split('-').slice(3).join('-'); // Извлекаем дату из данных
    const selectedDate = moment(dateText, 'YYYY-MM-DD'); // Преобразуем в формат 'YYYY-MM-DD'
    const minAllowedDate = moment().add(1, 'day').startOf('day'); // Завтрашний день без времени

    // Проверяем, что выбранная дата не раньше завтрашнего дня
    if (selectedDate.isBefore(minAllowedDate)) {
      await ctx.answerCallbackQuery({ text: 'Выберите дату в будущем.', show_alert: true });
      return; // Останавливаем выполнение, если выбрана дата в прошлом
    }

    await ctx.reply(`Вы выбрали дату активации разработчика:\n ${formatDate(dateText)}`);
    calendarData.isOpen = false;
    // Здесь вызываем функцию для сохранения даты включения и автоматического включения разработчика
    await excludeUserWithDate(ctx, calendarData.userName, dateText);
    // Обязательно подтверждаем callback-запрос
    await ctx.answerCallbackQuery();
    await listUsers(ctx);
    return;
  } else {
    calendarData.isOpen = false;
  }

  switch (action) {
    case 'list_users':
      await listUsers(ctx);
      break;
    case 'add_user':
      session.awaitingUserInput = true;
      const cancelKeyboard = new InlineKeyboard().text('Отмена', 'cancel');
      await ctx.reply(
        'Введите ник разработчика в формате:\n "@TelegramNick GitLabNick"\n например @Ivanov Ivan.Ivanov',
        {
          reply_markup: cancelKeyboard,
        },
      );
      break;
    case 'remove_user':
    case 'exclude_user':
    case 'include_user':
      await showUserList(ctx, action);
      break;
    case 'enable_logging':
      loggingEnabled = true;
      await ctx.reply('Логирование включено.');
      await sendServiceMessage(`Логирование в группу отладки включено✅`, ctx.from.id, ctx.from.username, true);
      await showMenu(ctx);
      break;
    case 'disable_logging':
      loggingEnabled = false;
      await ctx.reply('Логирование выключено.');
      await sendServiceMessage(`Логирование в группу отладки выключено❌`, ctx.from.id, ctx.from.username, true);
      await showMenu(ctx);
      break;
    case 'enable_dev_mode':
      isDevelopmentMode = true;
      await saveDevelopmentMode();
      await ctx.reply('Режим разработки включен.');
      await sendServiceMessage(`Режим разработки включен🚧`, ctx.from.id, ctx.from.username, true);
      await showMenu(ctx);
      break;
    case 'disable_dev_mode':
      await ctx.reply('Режим разработки выключен.');
      await sendServiceMessage(`Режим разработки выключен🚧`, ctx.from.id, ctx.from.username, true);
      isDevelopmentMode = false;
      await saveDevelopmentMode();
      await showMenu(ctx);
      break;
    case 'cancel':
      session.awaitingUserInput = false;
      await ctx.reply('Действие отменено.');
      await showMenu(ctx);
      break;
    case 'help':
      await helpCommand(ctx);
      break;
    case 'suggestions':
      session.awaitingSuggestionsInput = true;
      const cancelSuggestionsKeyboard = new InlineKeyboard().text('Отмена', 'cancel_suggestions');
      await ctx.reply('Напишите Ваши пожелания\nпо доработке. Я их передам\nхозяину. 😈', {
        reply_markup: cancelSuggestionsKeyboard,
      });
      break;
    case 'cancel_suggestions':
      session.awaitingSuggestionsInput = false;
      await ctx.reply('Действие отменено.');
      await showMenu(ctx);
      break;
    default:
      break;
  }
});

// Запуск бота
bot.start({
  onStart: async () => {
    await checkChatValidity();
  },
});
