import {Bot, InlineKeyboard} from "grammy";
import dotenv from "dotenv";
import {checkMr, getEveningMessage, getRandomElements, getRandomMessage, helpMessage, startMessage} from "./helpers.js";
import {manyMrPhrases} from "./constants.js";
import axiosInstance from "./axiosInstance.js";
import * as fs from "fs";
import path from "path";

dotenv.config();

const TOKEN = process.env.BOT_API_KEY; // Токен телеграмм-бота
const GITLAB_TOKEN = process.env.GITLAB_ACCESS_TOKEN; // GitLab Access Token
const ADMINS_IDS = process.env.ADMINS; // GitLab Access Token
const GITLAB_URL = process.env.GITLAB_URL; // GitLab main url

// Создаем бота
const bot = new Bot(TOKEN);

let userList = [];

// Глобальная переменная для хранения состояния сессий
const sessions = {};

// Глобальная переменная для хранения состояния логирования
let loggingEnabled = false;

// Список временно не активных разработчиков
const excludedUsers = [];

bot.api.setMyCommands([{command: 'start', description: 'Запуск бота'}, {
	command: 'help',
	description: 'WTF'
}], {scope: {type: 'all_private_chats'}});

const loadUserList = async () => {
	try {
		const data = await fs.readFileSync(path.resolve('userList.json'));
		userList = JSON.parse(data);
		console.log('loadUserList userList')
	} catch (error) {
		console.error('Ошибка при загрузке userList:', error);
	}
};

// Сохранение userList в JSON файл
const saveUserList = () => {
	try {
		fs.writeFileSync(path.resolve('userList.json'), JSON.stringify(userList, null, 2));
	} catch (error) {
		console.error('Ошибка при сохранении userList:', error);
	}
};

loadUserList()

// Обработка команды /start
bot.command('start', async (ctx) => {
	await startBot(ctx);
});

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
	if (ADMINS_IDS.includes(userId)) {
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

const simpleChooseReviewers = async (ctx, message, authorNick, error) => {
	// Выбор двух случайных ревьюверов
	const availableReviewers = userList.filter(user => user.messengerNick !== authorNick).filter(user => !excludedUsers.includes(user.messengerNick));
	const reviewers = getRandomElements(availableReviewers, 2);
	const reviewerMentions = reviewers.map(reviewer => reviewer.messengerNick).join(' и ');
	
	await ctx.reply(getEveningMessage(`Назначены ревьюверы(${error})(: ${reviewerMentions}`), {
		reply_to_message_id: ctx.message.message_id, parse_mode: "HTML", disable_web_page_preview: true
	});
}

const checkMergeRequestByGitlab = async (ctx, message, authorNick) => {
	const mrLinks = message.match(new RegExp(`https?:\/\/${GITLAB_URL}\/[\\w\\d\\-\\._~:\\/?#\\[\\]@!$&'()*+,;=]+`, 'g'));
	if (!mrLinks || !mrLinks.length) {
		return false; // Возвращаем false, если нет ссылок MR
	}
	
	console.log('Обработка MR:', mrLinks, authorNick);
	let allAnswers = '';
	let error = '';
	let success = false; // Флаг успешного выполнения
	if (mrLinks.length > 4) {
		console.log('message mrLinks.length > 4')
		await ctx.reply(getRandomMessage(manyMrPhrases));
	}
	
	for (const mrUrl of mrLinks) {
		try {
			const response = await axiosInstance.get(mrUrl);
			
			if (response.status === 200) {
				const projectName = mrUrl.match(/\/([^\/]+)\/-\/merge_requests\//)?.[1];
				const mrId = mrUrl.match(/\/merge_requests\/(\d+)$/)?.[1];
				
				const projectSearchUrl = `https://gitlab.dpr.norbit.ru/api/v4/projects?search=${projectName}`;
				const {data: projectSearchUrlData, status: projectSearchUrlStatus} = await axiosInstance.get(projectSearchUrl);
				
				if (projectSearchUrlStatus !== 200) {
					error = 'не получены данные gitlab'
					return false;
				}
				console.log('projectName', projectName)
				let reallyProject = null;
				for (const project of projectSearchUrlData) {
					if (project?.path_with_namespace?.toLowerCase()?.includes('andrey.singaevskiy') || project?.path_with_namespace?.toLowerCase()?.includes('bpmsoft')) {
						continue;
					}
					reallyProject = project;
					break;
				}
				
				const projectId = reallyProject?.id;
				console.log('projectId reallyProject', projectId)
				const mrStatusUrl = `https://${GITLAB_URL}/api/v4/projects/${projectId}/merge_requests/${mrId}`;
				const {data: mrStatusResponse, status: mrStatusStatus} = await axiosInstance.get(mrStatusUrl);
				
				if (mrStatusStatus !== 200 || mrStatusStatus === 404) {
					error = 'не получен статус МРа в gitlab'
					return false;
				}
				
				const mergeRequestTitle = mrStatusResponse.title;
				const mergeRequestState = mrStatusResponse.state;
				console.log('mergeRequestTitle', mergeRequestTitle)
				
				// if (mergeRequestTitle?.toLowerCase()?.startsWith('draft:')) {
				// 	allAnswers += `\n${mrUrl}\nМР в драфте! Перепроверь, пожалуйста😉\n🚨Апруверы не назначаются на MRы в статусе 'Draft'🚨\n`;
				// 	console.log('allAnswers', allAnswers)
				// 	success = true;
				// 	continue;
				// }
				
				if (mergeRequestState?.toLowerCase() === "merged") {
					allAnswers += `\n${mrUrl}\nMR уже влит.\n`;
					success = true;
					continue;
				}
				
				if (mergeRequestState?.toLowerCase() === "closed") {
					allAnswers += `\n${mrUrl}\nMR закрыт.\n`;
					success = true;
					continue;
				}
				console.log('projectId', projectId)
				const approvalRulesUrl = `https://${GITLAB_URL}/api/v4/projects/${projectId}/merge_requests/${mrId}/approval_rules`;
				const {data: approvalRulesUrlResponse, status: approvalRulesUrlStatus} = await axiosInstance.get(approvalRulesUrl);
				console.log('approvalRulesUrlResponse', approvalRulesUrlResponse)
				if (approvalRulesUrlStatus !== 200) {
					error = 'не получены апруверы в gitlab'
					return false;
				}
				
				let leadApprovers = [];
				let simpleApprovers = [];
				let leadRequired = false;
				
				for (const rule of approvalRulesUrlResponse) {
					if (!rule.name || !rule.approvals_required || !rule.eligible_approvers) {
						continue;
					}
					
					if (rule?.name?.toLowerCase() === 'lead') {
						leadRequired = rule.approvals_required > 0;
						leadApprovers = rule.eligible_approvers.filter(approver =>
							userList.some(user => user.gitlabName === approver.username && user.messengerNick !== authorNick && !excludedUsers.includes(user.messengerNick))
						);
					} else if (rule.name.startsWith("Check MR")) {
						simpleApprovers = rule.eligible_approvers.filter(approver =>
							userList.some(user => user.gitlabName === approver.username && user.messengerNick !== authorNick && !excludedUsers.includes(user.messengerNick))
						);
					}
				}
				console.log('fpersdru')
				if (leadApprovers.length === 0 && simpleApprovers.length === 0) {
					allAnswers += `\n${mrUrl}\nНет доступных ревьюверов на основе данных gitlab.\n🚨Никто не работает из ревьюверов или может ты скинул его не в тот чатик?🤔😉🚨`;
					continue;
				}
				
				let selectedLeadNick = null;
				let selectedCheckMrNick = null;
				let leadUnavailableMessage = "";
				
				if (leadRequired && leadApprovers.length > 0) {
					const selectedLead = leadApprovers[Math.floor(Math.random() * leadApprovers.length)];
					selectedLeadNick = userList.find(user => user.gitlabName === selectedLead.username).messengerNick;
				} else if (leadRequired && leadApprovers.length === 0) {
					leadUnavailableMessage = "\nВ данный МР требуется ревьювер из команды Lead, но эти разработчики сегодня не работают.😔";
					if (simpleApprovers.length > 0) {
						const selectedLead = simpleApprovers[Math.floor(Math.random() * simpleApprovers.length)];
						selectedLeadNick = userList.find(user => user.gitlabName === selectedLead.username).messengerNick;
					}
				}
				
				if (simpleApprovers.length > 0) {
					let remainingApprovers = simpleApprovers.filter(user => user.gitlabName !== selectedLeadNick);
					if (remainingApprovers.length > 0) {
						const selectedCheckMr = remainingApprovers[Math.floor(Math.random() * remainingApprovers.length)];
						selectedCheckMrNick = userList.find(user => user.gitlabName === selectedCheckMr.username).messengerNick;
					} else {
						selectedCheckMrNick = selectedLeadNick; // если только один доступный ревьювер, он будет и в Lead и в Check MR
					}
				}
				
				if (!selectedLeadNick) {
					selectedLeadNick = selectedCheckMrNick;
					let remainingApprovers = simpleApprovers.filter(user => user.gitlabName !== selectedCheckMrNick);
					if (remainingApprovers.length > 0) {
						const selectedCheckMr = remainingApprovers[Math.floor(Math.random() * remainingApprovers.length)];
						selectedCheckMrNick = userList.find(user => user.gitlabName === selectedCheckMr.username).messengerNick;
					}
				}
				
				allAnswers += `\n${mrUrl}\nНазначены ревьюверы (на основе данных gitlab): ${selectedLeadNick} и ${selectedCheckMrNick}${leadUnavailableMessage}\n`;
				success = true; // Устанавливаем флаг успешного выполнения
			}
		} catch (errors) {
			error = 'не получены апруверы в gitlab'
			return false; // Если произошла ошибка, возвращаем false
		}
	}
	
	if (success) {
		await ctx.reply(getEveningMessage(allAnswers), {
			reply_to_message_id: ctx.message.message_id,
			parse_mode: "HTML",
			disable_web_page_preview: true
		});
		return {
			status: true, // Возвращаем true, если удалось успешно выполнить назначение ревьюверов
			error: null
		};
	} else {
		return {
			status: false, // Возвращаем false, если не удалось выполнить назначение ревьюверов
			error // кидаем ошибку
		};
	}
}

const assignReviewers = async (ctx, message, authorNick) => {
	
	const availableReviewers = userList.filter(user => user.messengerNick !== authorNick).filter(user => !excludedUsers.includes(user.messengerNick));
	
	if (availableReviewers.length === 0) {
		await ctx.reply(getEveningMessage(`Нет активных ревьюверов.🥴`), {
			reply_to_message_id: ctx.message.message_id,
			disable_web_page_preview: true
		});
		return;
	}
	
	if (availableReviewers.length === 1) {
		const reviewer = getRandomElements(availableReviewers, 1);
		await ctx.reply(getEveningMessage(`Назначен единственный доступный ревьювер: ${reviewer[0].messengerNick}. Требуется еще 1 апрувер.😳`), {
			reply_to_message_id: ctx.message.message_id,
			disable_web_page_preview: true
		});
		return;
	}
	
	// Пробуем получить ревьюверов через GitLab
	const {error, status} = await checkMergeRequestByGitlab(ctx, message, authorNick);
	
	if (status) {
		return; // Если удалось получить ревьюверов через GitLab, прерываем выполнение функции
	}
	
	// Если нет соединения с GitLab, используем резервный метод
	await simpleChooseReviewers(ctx, message, authorNick, error);
};


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
		saveUserList(); // Сохранение изменений в файл
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
					saveUserList(); // Сохранение изменений в файл
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
	const helpText = ("/start - Запустить бота\n" + "/help - Показать это сообщение\n\n" + "<b><i>Добавить разработчика</i></b> - Добавить разработчика в список сотрудников\n\n" + "<b><i>Удалить разработчика</i></b> - Удалить разработчика из списка сотрудников (например, удалить уволенного сотрудника)\n\n" + "<b><i>Исключить разработчика</i></b> - Сделать разработчика временно неактивным (например, разработчик в отпуске или на больничном)\n\n" + "<b><i>Включить разработчика</i></b> - Вернуть временно неактивного разработчика в список сотрудников\n\n" + "<b><i>Показать разработчиков</i></b> - Отобразить текущий список всех разработчиков, в том числе и неактивных разработчиков. Апруверы выбираются только из списка активных сотрудников\n\n" + "<b><i>Включить логирование</i></b> - Доступно только если писать боту в личку. Включает отображение логов подключения к гитлабу(для тестирования).");
	
	await ctx.reply(helpText, {parse_mode: 'HTML'});
	await showMenu(ctx);
}

// Запуск бота
bot.start();
