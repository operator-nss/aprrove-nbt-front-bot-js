# Telegram Approve Bot

**Описание**

Этот Telegram бот предназначен для управления списком разработчиков, назначением ревьюверов на Merge Requests (MR) и обработки предложений по улучшению бота. Бот поддерживает несколько команд, работает в приватных чатах и группах, и включает различные функции для администраторов.

Функциональные возможности
Основные команды

Показывает меню с доступными действиями.
/help - Вывод справочного сообщения.

Отображает список доступных команд и их описание.
/chatid - Получение ID текущего чата. Полезно для идентификации чата.

Отображает количество сделанных МР за сутки.
/mrcount

Посмотреть запланированные уведомления
/jobs

Посмотреть не влитые МРчики
/mrinfo

Тегает всех активных разработчиков + "сообщение"
/all "сообщение"

Функции для администраторов
**Добавление разработчика**

Позволяет добавить нового разработчика в список. После выбора действия, бот ожидает ввод в формате: @TelegramNick GitLabNick.

**Удаление разработчика**

Удаляет разработчика из списка. Доступно только администраторам.

**Исключение разработчика**

Временно делает разработчика неактивным (например, если разработчик в отпуске). Такие разработчики не будут назначаться ревьюверами. В интерфейсе бота реализован календарь, с помощью которого можно выбрать дату, когда разработчик будет автоматически активирован. В назначенное время бот уведомит соответствующие чаты о возвращении разработчика в активный список.

**Включение разработчика**

Возвращает разработчика в активный список, если он был временно исключен.

**Просмотр списка разработчиков**

Отображает текущий список всех разработчиков, включая активных и неактивных.

**Включение/выключение логирования**

Логирование может быть включено или выключено в зависимости от необходимости.

**Включение/выключение режима разработчика**

Логирование только в сервисную группу разработчика.

# Обработка Merge Requests

Бот автоматически анализирует ссылки на MR, отправленные в чат, и назначает ревьюверов на основе доступных данных из GitLab.
Бот подключается к Jira и если видит у родительской задачи ошибку приоритета "блокер" или "крит" - уведомляет об этом в сообщении, когда назначает ревьюверов

**Предложения по доработке**

Админы могут отправлять свои предложения по улучшению бота. Бот сохраняет эти предложения в файл и уведомляет администратора.

**Обработка сообщений**

Бот обрабатывает текстовые сообщения, содержащие ссылки на MR, и автоматически назначает ревьюверов.
Бот также может обрабатывать предложения пользователей, если активировано соответствующее действие.
Бот считает количество МРов за сутки. Можно посмотреть сколько их сделано админами. На следующие сутки счетчик обнуляется. Счетчик срабатывает только если писать МР в группе команды. В личные сообщения и в другие любые группы счетчик остается неизменным.
При достижении порогов счетчика МРов в каждые 10 сообщений, бот пишет воодушевляющее сообщение для команды.

**Взаимодействие с GitLab**

Бот интегрирован с GitLab API для получения информации о Merge Requests и автоматического назначения ревьюверов.
Проверяет статус MR (черновик, влит, закрыт) и соответствующие правила одобрения.
Видит, если упал pipeline и предупреждает.

**Пример использования**

Используйте меню для выбора нужного действия:
Добавление, удаление или управление статусом разработчиков.
Просмотр списка разработчиков.
Включение или выключение логирования.
Предложение доработок.
Если вы администратор, у вас будут дополнительные права и доступ к расширенному функционалу.

**Файловая структура**

userList.json - Список всех разработчиков.
excludedUsers.json - Список временно исключенных разработчиков.
suggestions.json - Сохраненные предложения пользователей.
mrCounter.json - хранится дата сброса и количество МРов.
developmentMode.json - хранится включен ли режим разработчика.
mergeRequests.json - хранятся все не влитые МРчики
scheduledJobs.json - хранятся запланированные уведомления

**Настройка и запуск**
Клонируйте репозиторий.
Установите зависимости с помощью npm install.
Создайте .env файл с необходимыми переменными:

ADMINS - список ID администраторов в виде массива.

BOT_API_KEY - токен вашего Telegram бота.
GITLAB_ACCESS_TOKEN - токен доступа к гитлабу
GITLAB_URL - URL GitLab API.
JIRA_URL - URL Jira API
JIRA_TOKEN - токен доступа к jira

SERVICE_CHAT_ID - ID чата для отладки.
DEV_CHAT_ID - ID чата для отладки разработчика чата.
TG_TEAM_CHAT_ID - ID чата команды.

OWNER_ID - ID хозяина(разработчика)

MR_MOTIVATION_MESSAGE_COUNT - порог количества сообщений, при котором бот пишет мотивационное сообщение
MR_CHANGES_COUNT - порог количества изменений в файлах МРа, при котором бот пишет смешное сообщение

Запустите бота с помощью npm start.

**Зависимости**

grammy - Основной пакет для работы с Telegram Bot API.
dotenv - Загрузка переменных окружения из файла .env.
axios - HTTP-клиент для взаимодействия с API GitLab.
fs и path - Для работы с файловой системой и путями.
node-schedule - планировщик
telegraf-calendar-telegram - календарь
uuid - генератор уникальных ID

**Лицензия**
Этот проект распространяется под лицензией MIT.
