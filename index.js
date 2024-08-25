import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import { checkMr, getEveningMessage, getRandomElements, getRandomMessage } from './helpers.js';
import { manyMrPhrases } from './constants.js';
import axiosInstance from './axiosInstance.js';
import * as fs from 'fs';
import path from 'path';

dotenv.config();

const TOKEN = process.env.BOT_API_KEY; // Токен телеграмм-бота
const ADMINS_IDS = process.env.ADMINS; // GitLab Access Token
const GITLAB_URL = process.env.GITLAB_URL; // GitLab main url
const SERVICE_CHAT_ID = process.env.SERVICE_CHAT_ID; // Чат для отладки бота

// Создаем бота
const bot = new Bot(TOKEN);

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

bot.api.setMyCommands(
  [
    { command: 'start', description: 'Запуск бота' },
    { command: 'help', description: 'WTF' },
    { command: 'chatid', description: 'Получить ID чата' },
  ],
  { scope: { type: 'all_private_chats' } },
);

const sendServiceMessage = async (message, userId = null, username = null, ignoreLogging = false) => {
  try {
    if (!userId && !username) return await bot.api.sendMessage(SERVICE_CHAT_ID, message);

    if (ignoreLogging || loggingEnabled) {
      // Формируем сообщение с добавлением информации о пользователе, который инициировал действие
      const fullMessage = `${message}\nИнициатор: ${username ? '@' + username : `ID: ${userId}`}`;

      // Отправляем сообщение в сервисный чат
      await bot.api.sendMessage(SERVICE_CHAT_ID, fullMessage, {
        disable_web_page_preview: true,
      });
    }
  } catch (error) {
    await sendServiceMessage('Ошибка отправки сервисного сообщения в чат');
  }
};

const loadUserList = async () => {
  try {
    const data = await fs.readFileSync(path.resolve('userList.json'));
    userList = JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке userList:', error);
    await sendServiceMessage('Ошибка чтения всех разработчиков из файла');
  }
};

const loadExcludedUsers = async () => {
  try {
    const data = await fs.readFileSync(path.resolve('excludedUsers.json'));
    excludedUsers = JSON.parse(data);
  } catch (error) {
    await sendServiceMessage('Ошибка при чтении исключенных разработчиков из файла');
  }
};

// Сохранение userList в JSON файл
const saveUserList = async () => {
  try {
    fs.writeFileSync(path.resolve('userList.json'), JSON.stringify(userList, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении разработчика в файл');
  }
};

// Сохранение excludedUsers в JSON файл
const saveExcludedUsers = async () => {
  try {
    fs.writeFileSync(path.resolve('excludedUsers.json'), JSON.stringify(excludedUsers, null, 2));
  } catch (error) {
    await sendServiceMessage('Ошибка при сохранении исключенного разработчика в файл');
  }
};

const loadSuggestions = async () => {
  try {
    const data = fs.readFileSync(path.resolve('suggestions.json'));
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

loadUserList();
loadExcludedUsers();
loadSuggestions();

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
  }

  if ((ctx.chat.id.toString() === SERVICE_CHAT_ID.toString() || ctx.chat.type === 'private') && (await isAdmin(ctx))) {
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

const simpleChooseReviewers = async (ctx, message, authorNick) => {
  // Выбор двух случайных ревьюверов
  const availableReviewers = userList
    .filter((user) => user.messengerNick !== authorNick)
    .filter((user) => !excludedUsers.includes(user.messengerNick));
  const reviewers = getRandomElements(availableReviewers, 2);
  const reviewerMentions = reviewers.map((reviewer) => reviewer.messengerNick).join(' и ');

  await ctx.reply(getEveningMessage(`Назначены ревьюверы: ${reviewerMentions}`), {
    reply_to_message_id: ctx.message.message_id,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
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
    await ctx.reply(getRandomMessage(manyMrPhrases), { reply_to_message_id: ctx.message.message_id });
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
          allAnswers += '\n🚨В данном Мре упал pipeline. Посмотри в чем проблема, пожалуйста!🚨\n';
        }

        if (mergeRequestTitle?.toLowerCase()?.startsWith('draft:')) {
          allAnswers += `\n${mrUrl}\nМР в драфте! Перепроверь, пожалуйста😉\n🚨Ревьюверы не назначаются на MRы в статусе 'Draft'🚨\n`;
          success = true;
          continue;
        }

        if (mergeRequestState?.toLowerCase() === 'merged') {
          allAnswers += `\n${mrUrl}\nЭтот МР уже влит) Может ссылка не та?🤔\n`;
          success = true;
          continue;
        }

        if (mergeRequestState?.toLowerCase() === 'closed') {
          allAnswers += `\n${mrUrl}\nЭтот МР закрыт) Может ссылка не та?🤔\n`;
          success = true;
          continue;
        }
        const approvalRulesUrl = `https://${GITLAB_URL}/api/v4/projects/${projectId}/merge_requests/${mrId}/approval_rules`;
        const { data: approvalRulesUrlResponse, status: approvalRulesUrlStatus } =
          await axiosInstance.get(approvalRulesUrl);
        if (approvalRulesUrlStatus !== 200) {
          error += `МР: ${mrUrl}.\nОшибка: Не смог получить ревьюверов в API Gitlab`;
          return false;
        }

        let leadApprovers = [];
        let simpleApprovers = [];
        let leadRequired = false;
        const activeUsers = userList.filter((user) => !excludedUsers.includes(user.messengerNick));

        for (const rule of approvalRulesUrlResponse) {
          if (!rule.name || !rule.approvals_required || !rule.eligible_approvers) {
            continue;
          }

          if (rule?.name?.toLowerCase() === 'lead') {
            leadRequired = rule.approvals_required > 0;
            leadApprovers = rule.eligible_approvers.filter((approver) =>
              activeUsers.some((user) => user.gitlabName === approver.username && user.messengerNick !== authorNick),
            );
          } else if (rule.name.startsWith('Check MR')) {
            simpleApprovers = rule.eligible_approvers.filter((approver) =>
              activeUsers.some((user) => user.gitlabName === approver.username && user.messengerNick !== authorNick),
            );
          }
        }

        if (leadApprovers.length === 0 && simpleApprovers.length === 0) {
          allAnswers += `\n${mrUrl}\n🚨Никто не работает из ревьюверов или может ты скинул его не в тот чатик?🤔😉🚨\n`;
          error += `МР: ${mrUrl}.\nОшибка: Нет доступных ревьюверов на основе данных API Gitlab`;
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

        allAnswers += `\n${mrUrl}\nНазначены ревьюверы: ${messengerNickLead} и ${messengerNickSimpleReviewer}${leadUnavailableMessage}\n`;
        success = true; // Устанавливаем флаг успешного выполнения
      }
    } catch (errors) {
      await sendServiceMessage(`МР: ${mrUrl}.\nПроизошла ошибка при подключении к API Gitlab`);
      return false; // Если произошла ошибка, возвращаем false
    }
  }

  if (success) {
    await ctx.reply(getEveningMessage(allAnswers), {
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
    .filter((user) => !excludedUsers.includes(user.messengerNick));

  if (availableReviewers.length === 0) {
    await ctx.reply(getEveningMessage(`Нет активных ревьюверов.🥴\nСейчас разберемся!`), {
      reply_to_message_id: ctx.message.message_id,
      disable_web_page_preview: true,
    });
    await sendServiceMessage(`${message}.\n\nПочему-то нет ревьюверов. Просьба проверить😊`);
    return;
  }

  if (availableReviewers.length === 1) {
    const reviewer = getRandomElements(availableReviewers, 1);
    await ctx.reply(
      getEveningMessage(
        `Назначен единственный доступный ревьювер: ${reviewer[0].messengerNick}. Требуется еще 1 ревьювер.😳`,
      ),
      {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      },
    );
    await sendServiceMessage(`${message}.\n\nПочему-то только один ревьювер доступен. Просьба проверить😊`);
    return;
  }

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
  await simpleChooseReviewers(ctx, message, authorNick);
};

const excludeUser = async (ctx, username) => {
  if (!excludedUsers.includes(username)) {
    excludedUsers.push(username);
    if (loggingEnabled) {
      await sendServiceMessage(`Временно исключен: ${username}❌`, ctx.from.id, ctx.from.username);
    }
    await saveExcludedUsers();
  }
};

const includeUser = async (ctx, username) => {
  const index = excludedUsers.indexOf(username);
  if (index !== -1) {
    excludedUsers.splice(index, 1);
    if (loggingEnabled) {
      await sendServiceMessage(`Разработчик ${username} активен✅`, ctx.from.id, ctx.from.username);
    }
    await saveExcludedUsers();
  }
};

// Функция для отображения списка пользователей
const listUsers = async (ctx) => {
  const activeUsers = userList.filter((user) => !excludedUsers.includes(user.messengerNick));
  const allUsers = userList.map((user) => `${user.messengerNick} - ${user.gitlabName}`).join('\n');
  const excluded = userList
    .filter((user) => excludedUsers.includes(user.messengerNick))
    .map((user) => `${user.messengerNick} - ${user.gitlabName}`)
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
    users = userList.filter((user) => !excludedUsers.includes(user.messengerNick));
  } else if (action === 'include_user') {
    users = userList.filter((user) => excludedUsers.includes(user.messengerNick));
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
  const helpText =
    '/start - Запустить бота\n' +
    '/help - Показать это сообщение\n\n' +
    '<b><i>Добавить разработчика</i></b> - Добавить разработчика в список сотрудников\n\n' +
    '<b><i>Удалить разработчика</i></b> - Удалить разработчика из списка сотрудников (например, удалить уволенного сотрудника)\n\n' +
    '<b><i>Исключить разработчика</i></b> - Сделать разработчика временно неактивным (например, разработчик в отпуске или на больничном)\n\n' +
    '<b><i>Включить разработчика</i></b> - Вернуть временно неактивного разработчика в список сотрудников\n\n' +
    '<b><i>Показать разработчиков</i></b> - Отобразить текущий список всех разработчиков, в том числе и неактивных разработчиков. Ревьюверы выбираются только из списка активных сотрудников\n\n' +
    '<b><i>Включить логирование</i></b> - Доступно только если писать боту в личку. Включает отображение логов подключения к гитлабу(для тестирования).';

  await ctx.reply(helpText, { parse_mode: 'HTML' });
  await showMenu(ctx);
};

// Обработка команды /start
bot.command('start', async (ctx) => {
  await startBot(ctx);
});

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

bot.on(':voice', async (ctx) => {
  await ctx.reply('Ай нехорошо голосовые в чат отправлять!🥴', { reply_to_message_id: ctx.message.message_id });
});

// Обработка сообщений с MR
bot.on('::url').filter(checkMr, async (ctx) => {
  const match = ctx.message?.text?.toLowerCase()?.includes('mr:');
  if (match) {
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
  }
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

    fs.writeFileSync(path.resolve('suggestions.json'), JSON.stringify(suggestions, null, 2));

    await ctx.reply('Спасибо! Ваши пожелания переданы!😘');
    session.awaitingSuggestionsInput = false;
    await showMenu(ctx);
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
          if (excludedUsers.includes(username)) {
            await includeUser(ctx, username);
          }
          responseMessage = `Разработчик ${username} удален из списка.`;
          break;
        case 'exclude_user':
          if (!excludedUsers.includes(username)) {
            await excludeUser(ctx, username);
            responseMessage = `Разработчик ${username} временно не активен.`;
          }
          break;
        case 'include_user':
          if (excludedUsers.includes(username)) {
            await includeUser(ctx, username);
            responseMessage = `Разработчик ${username} возвращен в список.`;
          }
          break;
      }

      // Проверка на изменение сообщения перед его редактированием
      if (responseMessage) {
        await ctx.editMessageText(responseMessage);
      }
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
      await ctx.reply('Напишите Ваши пожелания по доработке. Я их передам хозяину. 😈', {
        reply_markup: cancelSuggestionsKeyboard,
      });
      break;
    case 'cancel_suggestions':
      session.awaitingSuggestionsInput = false;
      await ctx.reply('Действие отменено.');
      await showMenu(ctx);
      break;
  }
});

// Запуск бота
bot.start();
