import {Bot, InlineKeyboard} from "grammy";
import dotenv from "dotenv";
import {checkMr, getEveningMessage, getRandomElements, helpMessage, startMessage} from "./helpers.js";
import {adminIds, userList} from "./constants.js";

dotenv.config();

const TOKEN = process.env.BOT_API_KEY; // Токен телеграмм-бота
const GITLAB_TOKEN = process.env.GITLAB_ACCESS_TOKEN; // GitLab Access Token

// Создаем бота
const bot = new Bot(TOKEN);

// Глобальная переменная для хранения состояния сессий
const sessions = {};

// Глобальная переменная для хранения состояния логирования
let loggingEnabled = false;

// Список временно не активных разработчиков
const excludedUsers = [];

bot.api.setMyCommands([
	{command: 'start', description: 'Запуск бота'},
	{command: 'help', description: 'WTF'}
], {scope: {type: 'all_private_chats'}});

// Обработка команды /start
bot.command('start', async (ctx) => await startBot(ctx));

// Функция для управления сессиями
const getSession = chatId => {
	if (!sessions[chatId]) {
		sessions[chatId] = {};
	}
	return sessions[chatId];
};

// Проверка, является ли пользователь администратором
const isAdmin = async ctx => {
	const userId = ctx.from.id;
	
	// Проверка, есть ли пользователь в списке adminIds (личные сообщения)
	if (adminIds.includes(userId)) {
		return true;
	}
	
	// Проверка, является ли пользователь администратором группы
	try {
		const chatMember = await ctx.getChatMember(userId);
		return chatMember.status === 'administrator' || chatMember.status === 'creator';
	} catch (e) {
		console.error("Ошибка при проверке прав администратора:", e);
		return false;
	}
};

// Функция для отображения меню
const showMenu = async ctx => {
	const keyboard = new InlineKeyboard()
		.text("✅ Добавить разработчика", "add_user")
		.row()
		.text("❌ Удалить разработчика", "remove_user")
		.row()
		.text("🔴 Исключить разработчика", "exclude_user")
		.row()
		.text("🟢 Включить разработчика", "include_user")
		.row()
		.text("🌟 Показать разработчиков", "list_users")
		.row()
		.text("ℹ️ HELP", "help");
	
	if (ctx.chat.type === 'private') {
		if (loggingEnabled) {
			keyboard.row().text("🔕 Выключить логирование", "disable_logging");
		} else {
			keyboard.row().text("🔔 Включить логирование", "enable_logging");
		}
	}
	
	await ctx.reply('Выберите действие:', {
		reply_markup: keyboard
	});
};

const startBot = async (ctx) => {
	if (await isAdmin(ctx)) {
		await showMenu(ctx);
	} else {
		await ctx.reply('У Вас нет прав для управления этим ботом.');
	}
}

// Функция для назначения ревьюверов
async function assignReviewers(ctx, message, authorNick) {
	// Здесь нужно добавить логику назначения ревьюверов на основе MR URL.
	// Например, выбрать двух ревьюверов из userList, которые не находятся в excludedUsers.
	const availableReviewers = userList.filter(user => user.messengerNick !== authorNick).filter(user => !excludedUsers.includes(user.messengerNick));
	console.log('availableReviewers', availableReviewers);
	
	if (availableReviewers.length === 0) {
		await ctx.reply(getEveningMessage(`Нет активных ревьюверов.🥴`), {
			reply_to_message_id: ctx.message.message_id,
			disable_web_page_preview: true
		});
		return;
	}
	
	if (availableReviewers.length === 1) {
		const reviewer = getRandomElements(availableReviewers, 1);
		console.log('reviewer', reviewer);
		await ctx.reply(getEveningMessage(`Назначен единственный доступный ревьювер: ${reviewer[0].messengerNick}. Требуется еще 1 апрувер.😳`), {
			reply_to_message_id: ctx.message.message_id,
			disable_web_page_preview: true
		});
		return;
	}
	
	// Выбор двух случайных ревьюверов
	const reviewers = getRandomElements(availableReviewers, 2);
	const reviewerMentions = reviewers.map(reviewer => reviewer.messengerNick).join(' и ');
	
	await ctx.reply(getEveningMessage(`Назначены ревьюверы для MR: ${reviewerMentions}`), {
		reply_to_message_id: ctx.message.message_id,
		parse_mode: "HTML",
		disable_web_page_preview: true
	});
}

bot.on('msg:text').filter(startMessage, async (ctx) => await startBot(ctx))
bot.on('msg:text').filter(helpMessage, async (ctx) => await helpCommand(ctx))

bot.on(':voice', async ctx => {
	await ctx.reply('Ай нехорошо голосовые в чат отправлять!🥴', {reply_to_message_id: ctx.message.message_id})
})

// Обработка сообщений с MR
bot.on('::url').filter(checkMr, async (ctx) => {
	const message = ctx.message.text.toLowerCase();
	console.log('Обработка сообщений с MR', message);
	const match = message.includes('mr:');
	if (match) {
		// Автор сообщения
		const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
		// Назначаем ревьюверов на основе найденного MR
		await assignReviewers(ctx, message, username);
	}
})

// Обработка добавления пользователя
bot.on('msg:text', async (ctx) => {
	const session = getSession(ctx.chat.id);
	// если не нажата кнопка добавления пользователя
	if (!session.awaitingUserInput) return
	console.log('Обработка добавления пользователя', session);
	
	const [telegramNick, gitlabNick] = ctx.message.text.split(' ');
	
	if (!telegramNick || !gitlabNick || ctx.message.text.split(' ').length !== 2) {
		await ctx.reply('Неверный формат. Введите ник разработчика в формате: "@TelegramNick GitLabNick", например @ivanov Ivan.Ivanov');
		return;
	}
	
	const exists = userList.find(user => user.messengerNick === telegramNick);
	
	if (!exists) {
		userList.push({messengerNick: telegramNick, gitlabName: gitlabNick});
		await ctx.reply(`Разработчик ${telegramNick} добавлен в список с GitLab ником ${gitlabNick}.`);
	} else {
		await ctx.reply(`Разработчик ${telegramNick} уже в списке.`);
	}
	
	session.awaitingUserInput = false;
	await listUsers(ctx);
});


// Функция для отображения списка пользователей
const listUsers = async ctx => {
	const activeUsers = userList.filter(user => !excludedUsers.includes(user.messengerNick));
	const allUsers = userList.map(user => `${user.messengerNick} - ${user.gitlabName}`).join('\n');
	const excluded = userList.filter(user => excludedUsers.includes(user.messengerNick)).map(user => `${user.messengerNick} - ${user.gitlabName}`).join('\n');
	const active = activeUsers.map(user => `${user.messengerNick} - ${user.gitlabName}`).join('\n');
	
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
		users = userList.filter(user => !excludedUsers.includes(user.messengerNick));
	} else if (action === 'include_user') {
		users = userList.filter(user => excludedUsers.includes(user.messengerNick));
	}
	
	if (!users || users.length === 0) {
		await ctx.reply('Нет доступных разработчиков для этого действия.');
		await showMenu(ctx);
		return;
	}
	
	const keyboard = new InlineKeyboard();
	users.forEach(user => {
		keyboard.row().text(`${user.messengerNick} - ${user.gitlabName}`, `${action}:${user.messengerNick}`);
	});
	
	await ctx.reply('Выберите разработчика:', {
		reply_markup: keyboard
	});
};

// Обработка выбранного действия над пользователем
bot.callbackQuery(/(remove_user|exclude_user|include_user):(.+)/, async (ctx) => {
	console.log('callbackQuery', ctx)
	try {
		const [action, username] = ctx.callbackQuery.data.split(':');
		console.log('Parsed action:', action);
		console.log('Parsed username:', username);
		
		const userIndex = userList.findIndex(user => user.messengerNick === username);
		console.log('User index:', userIndex);
		
		if (userIndex !== -1) {
			const user = userList[userIndex];
			console.log('Found user:', user);
			
			switch (action) {
				case 'remove_user':
					userList.splice(userIndex, 1);
					if (excludedUsers.includes(username)) {
						excludedUsers.splice(excludedUsers.indexOf(username), 1);
					}
					await ctx.editMessageText(`Разработчик ${username} удален из списка.`);
					break;
				case 'exclude_user':
					if (!excludedUsers.includes(username)) {
						excludedUsers.push(username);
						await ctx.editMessageText(`Разработчик ${username} временно не активен.`);
					}
					break;
				case 'include_user':
					if (excludedUsers.includes(username)) {
						excludedUsers.splice(excludedUsers.indexOf(username), 1);
						await ctx.editMessageText(`Разработчик ${username} возвращен в список.`);
					}
					break;
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
	
	console.log('bot.callbackQuery(/.', action);
	
	// Если не админ
	if (!(await isAdmin(ctx))) {
		await ctx.answerCallbackQuery({text: 'У вас нет прав для управления этим ботом.', show_alert: true});
		return;
	}
	
	switch (action) {
		case 'list_users':
			await listUsers(ctx);
			break;
		case 'add_user':
			session.awaitingUserInput = true;
			const cancelKeyboard = new InlineKeyboard().text("Отмена", "cancel");
			await ctx.reply('Введите ник разработчика в формате:\n "@TelegramNick GitLabNick"\n например @Ivanov Ivan.Ivanov', {
				reply_markup: cancelKeyboard
			});
			break;
		case 'remove_user':
		case 'exclude_user':
		case 'include_user':
			await showUserList(ctx, action);
			break;
		case 'enable_logging':
			loggingEnabled = true;
			await ctx.reply('Логирование включено.');
			await showMenu(ctx);
			break;
		case 'disable_logging':
			loggingEnabled = false;
			await ctx.reply('Логирование выключено.');
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
	}
});

// Обработка команды /help
async function helpCommand(ctx) {
	const helpText = (
		"/start - Запустить бота\n" +
		"/help - Показать это сообщение\n\n" +
		"<b><i>Добавить разработчика</i></b> - Добавить разработчика в список сотрудников\n\n" +
		"<b><i>Удалить разработчика</i></b> - Удалить разработчика из списка сотрудников (например, удалить уволенного сотрудника)\n\n" +
		"<b><i>Исключить разработчика</i></b> - Сделать разработчика временно неактивным (например, разработчик в отпуске или на больничном)\n\n" +
		"<b><i>Включить разработчика</i></b> - Вернуть временно неактивного разработчика в список сотрудников\n\n" +
		"<b><i>Показать разработчиков</i></b> - Отобразить текущий список всех разработчиков, в том числе и неактивных разработчиков. Апруверы выбираются только из списка активных сотрудников\n\n" +
		"<b><i>Включить логирование</i></b> - Доступно только если писать боту в личку. Включает отображение логов подключения к гитлабу(для тестирования)."
	);
	
	await ctx.reply(helpText, {parse_mode: 'HTML'});
	await showMenu(ctx);
}

// Запуск бота
bot.start();
