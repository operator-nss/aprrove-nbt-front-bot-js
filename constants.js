export const calendarOptions = {
  startWeekDay: 1,
  weekDayNames: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'],
  monthNames: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  minDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Минимальная дата - завтрашний день
};

// Для тех кто работает ночью
export const funnyPhrases = [
  'Опять за работу, когда все отдыхают?🥴',
  'Тебе что, скучно спать ночью?🥴',
  'Трудоголизм — это диагноз, знаешь?🥴',
  'Кажется, кто-то любит кодить в тишине ночи!🥴',
  'Работа ночью? Ты точно сверхчеловек!🥴',
  'Пока все спят, ты работаешь? Впечатляет!🥴',
  'Ты что, решил обогнать всех по ночной продуктивности?🥴',
  'Работа ночью – это твоё тайное суперспособность?🥴',
  'Ты что, программируешь во сне?🥴',
  'Ночная смена программиста? Ты крут!🥴',
  'Опять ты с кодом в ночи!🥴',
  'Кажется, кто-то не знает, что такое "отбой"!🥴',
  'Ты же не робот, правда?🥴',
  'Ночные МРы — это твой стиль!🥴',
  'Ты точно хочешь сделать ночное программирование трендом!🥴',
  'Кажется, ты не просто так выбираешь ночь для работы!🥴',
  'Ночь — лучшее время для работы? Серьёзно?🥴',
  'Ты что, забыл, что такое сон?🥴',
  'Когда все спят, ты работаешь!🥴',
  'Не устал ещё от ночного кодинга?🥴',
  'Работаешь ночью? Это любовь или привычка?🥴',
  'Ты — ночной страж кодинга?🥴',
  'Кажется, кто-то нашёл секретное время для работы!🥴',
  'Ты точно знаешь, как удивить коллег с утра!🥴',
  'У тебя есть какое-то тайное топливо для ночной работы?🥴',
  'Работаешь в темное время суток? Ты загадка!🥴',
  'Твой компьютер не перегрелся ещё от ночной активности?🥴',
  'Ты что, решил побить рекорд ночного программирования?🥴',
  'Ночные МРы — это что-то новенькое!🥴',
  'Работаешь ночью? Интересный выбор!🥴',
  'Ты что, решил, что ночь — лучшее время для продуктивности?🥴',
  'Ночной кодинг — это точно твоё!🥴',
  'Кажется, ты не знаешь, что такое отдых!🥴',
  'Твой компьютер работает лучше ночью, да?🥴',
  'Ты что, ночной программист?🥴',
  'Работаешь ночью? Респект!🥴',
  'Ты что, всю ночь кодил?🥴',
  'Опять ночью за работу? У тебя точно всё нормально?🥴',
  'Ты что, живёшь по другому времени?🥴',
  'Работать ночью? Это явно не для слабаков!🥴',
  'Ночная продуктивность — твоя фишка?🥴',
  'Ты что, решил все МРы сдать до утра?🥴',
  'Работаешь, когда все спят? Уважение!🥴',
  'Кажется, кто-то решил пожертвовать сном ради работы!🥴',
  'Ночные МРы? Ты же понимаешь, что это необычно?🥴',
  'Ты что, программируешь на автопилоте ночью?🥴',
  'Когда все спят, ты в деле!🥴',
  'Работаешь по ночам? Это уже привычка?🥴',
  'Ты точно знаешь, что ночь — лучшее время для кодинга!🥴',
  'Лови <a href="https://ru.wikipedia.org/wiki/%D0%9E%D1%82%D0%B4%D1%8B%D1%85">ссылочку</a>. Тебе вот прям надо!🥴',
];

// Когда много МРов
export const manyMrPhrases = [
  'Ух ты! Ты, похоже, работаешь быстрее, чем свет!🥴\nДай мне минутку, чтобы собрать ревьюверов для твоих ${mrCounter} МР.',
  'Ты решил устроить марафон из ${mrCounter} МРов?🥴\nСейчас найду команду, чтобы они это оценили!',
  'Тебе точно нужно создать свой клуб из ${mrCounter} МРов!🥴\nПогоди, пока я найду смельчаков на ревью.',
  'Сколько МРов — целых ${mrCounter}! Ты не шутил, когда говорил, что на выходных работать будешь?🥴\nДай мне время, чтобы их рассортировать.',
  'Ты серьезно? Снова ${mrCounter} МРов?🥴\nСейчас, погоди, найду кого-нибудь на ревью.',
  'Ну ты даешь! ${mrCounter} МРов сыпятся как из рога изобилия!🥴\nДай время, найду проверяющих.',
  'Ревьюверы уже начали пугаться твоих ${mrCounter} МРов!🥴\nСекунду, сейчас найду подходящих кандидатов.',
  'Ты, похоже, решил сегодня всем задать жару с этими ${mrCounter} МРами!🥴\nПодожди, поищу ревьюверов.',
  'Кажется, кто-то изобрел генератор на ${mrCounter} МРов!🥴\nПогоди, соберу тех, кто готов на подвиг.',
  'Ого, сколько МРов — аж ${mrCounter}! Вижу, ты не шутишь!🥴\nДай мне пару минут, найду проверяющих.',
  'Такое чувство, что ты собрался выдать за раз все ${mrCounter} МРов за месяц!🥴\nСекунду, организую ревьюверов.',
  'Может, ты клонировал себя?🥴\nКак ты так много успеваешь — аж ${mrCounter} МРов? Сейчас найду ревьюверов.',
  'Ты что, решил установить новый рекорд с ${mrCounter} МРами?🥴\nДай мне немного времени, чтобы разобраться с ними.',
  'Ну вот, теперь все ревьюверы будут заняты твоими ${mrCounter} МРами!🥴\nПодожди, пока найду их.',
  'Ого, ты решил занять всех ревьюверов одним махом — аж ${mrCounter} МРами!🥴\nПогоди, найду тех, кто готов на вызов.',
  'Ты что, устроил фабрику по производству ${mrCounter} МРов?🥴\nСекунду, соберу команду.',
  'Кажется, сегодня ревьюверы будут только с тобой работать над ${mrCounter} МРами!🥴\nДай мне время, найду их.',
  'С таким количеством МРов — целых ${mrCounter} — тебе стоит открыть собственный консалтинг!🥴\nПогоди, найду ревьюверов.',
  'Ты что, работаешь сверхурочно?🥴\nЦелых ${mrCounter} МРов! Сейчас найду проверяющих.',
  'Ты что, весь год копил ${mrCounter} МРов и решил выдать все за раз?🥴\nДай мне минутку, найду ревьюверов.',
  'Ты просто мастер ${mrCounter} МРов!🥴\nСекунду, найду героев на ревью.',
  'Кажется, ты решил всех поразить количеством — аж ${mrCounter} МРов!🥴\nПодожди, пока я поищу ревьюверов.',
  'Ты просто монстр кодинга!🥴\nДай мне минуту, найду тех, кто оценит твои ${mrCounter} МРов.',
  'Ого, ты наверняка поставил цель закрыть все ${mrCounter} МРов за один день!🥴\nСекунду, организую ревью.',
  'Кажется, что ты решил оставить всех без работы, загрузив их ${mrCounter} МРами!🥴\nДай мне немного времени, чтобы найти ревьюверов.',
  'Ты что, взял отпуск и решил поработать за всех, закрыв ${mrCounter} МРов?🥴\nСекунду, соберу ревьюверов.',
  'Ты словно машина по производству ${mrCounter} МРов!🥴\nПодожди, поищу тех, кто будет это ревьюить.',
  'Ты что, решил оставить всех без перерыва на покушать, накинув ${mrCounter} МРов?🥴\nС таким количеством МРов нам понадобится время, чтобы все проверить!',
  'Ревьюверы уже стали легендами в твоих ${mrCounter} МРах!🥴\nСекунду, найду новых героев.',
  'Ого, с таким количеством МРов — целых ${mrCounter} — ты точно должен получить премию!🥴\nПогоди, соберу команду на ревью.',
  'Ты, случайно, не взял на себя все задачи команды, закрыв ${mrCounter} МРов?🥴\nДай мне минуту, чтобы найти проверяющих.',
  'Кажется, ты решил поставить ревьюверов перед непростой задачей, задав им ${mrCounter} МРов!🥴\nПодожди, пока я найду их.',
  'Ты точно решил стать лучшим разработчиком месяца, закрыв ${mrCounter} МРов!🥴\nСекунду, найду подходящих ревьюверов.',
  'Ну ты и загрузил всех работой — аж ${mrCounter} МРов!🥴\nДай мне минуту, чтобы собрать команду.',
  'Ты работаешь быстрее, чем компьютер, ведь ты закрыл ${mrCounter} МРов!🥴\nПогоди немного, найду ревьюверов.',
  'Кажется, ты решил поработать за троих, закрыв ${mrCounter} МРов!🥴\nСекунду, организую ревью.',
  'Ты точно решил оставить всех без выходных, накинув ${mrCounter} МРов!🥴\nДай мне минуту, найду тех, кто справится с этим.',
  'Ну вот, снова ты с ${mrCounter} МРами!🥴\nСекунду, соберу команду для ревью.',
  'Ты что, решил испытать на прочность ревьюверов, закинув ${mrCounter} МРов?🥴\nПодожди, пока я поищу их.',
  'Ого, сколько работы — целых ${mrCounter} МРов!🥴\nДай мне время, найду тех, кто готов оценить твой код.',
];

// Мотивационные сообщения
export const motivationalMessages = [
  '🎉 Отличная работа, команда! Уже ${mrCounter} MR за сегодня! Так держать!',
  '🚀 Мы достигли ${mrCounter} MR! Ваши усилия невероятны! Вперёд к новым вершинам!',
  '💪 Невероятно! ${mrCounter} MR позади! Ваша продуктивность поражает!',
  '🔥 Команда, вы в огне! Уже ${mrCounter} MR за сегодня!',
  '🏆 Поздравляем! Мы пересекли отметку в ${mrCounter} MR! Продолжаем в том же духе!',
  '🚀 Вау! ${mrCounter} MR всего за один день! Вы лучшие!',
  '🎉 Уже ${mrCounter} MR! Ваш труд достоин восхищения!',
  '🔥 Это просто потрясающе! ${mrCounter} MR уже выполнено!',
  '💪 Вы настоящие чемпионы! ${mrCounter} MR позади!',
  '🏅 Ваша продуктивность невероятна! ${mrCounter} MR за день!',
  '🚀 Достигли отметки в ${mrCounter} MR! Впереди только новые высоты!',
  '🎉 Вы просто супергерои! ${mrCounter} MR за сегодня!',
  '🔥 Команда, вы жжёте! ${mrCounter} MR — это только начало!',
  '💪 Мы вместе сделали ${mrCounter} MR! Так держать!',
  '🏆 Ваш вклад неоценим! ${mrCounter} MR завершено!',
  '🚀 Команда, мы достигли ${mrCounter} MR! Ваша работа потрясающая!',
  '🎉 Вы большие молодцы! ${mrCounter} MR за день — это круто!',
  '🔥 Ваши усилия заслуживают аплодисментов! ${mrCounter} MR!',
  '💪 С такими темпами мы покорим любые вершины! ${mrCounter} MR!',
  '🏅 Отличная работа, ребята! ${mrCounter} MR уже выполнено!',
  '🚀 Вперёд, к новым вершинам! ${mrCounter} MR за сегодня!',
  '🎉 Команда, вы лучшие! ${mrCounter} MR — это только начало!',
  '🔥 Мы продолжаем бить рекорды! ${mrCounter} MR!',
  '💪 Наша продуктивность на высоте! ${mrCounter} MR!',
  '🏆 Мы сделали это! ${mrCounter} MR за день!',
  '🚀 Это просто фантастика! ${mrCounter} MR выполнено!',
  '🎉 Команда, вы достойны похвалы! ${mrCounter} MR за один день!',
  '🔥 Это был потрясающий день! ${mrCounter} MR завершено!',
  '💪 Вы — настоящие профессионалы! ${mrCounter} MR уже сделано!',
  '🏅 Ваши усилия приносят плоды! ${mrCounter} MR за сегодня!',
  '🚀 Вы настоящие звёзды! ${mrCounter} MR — это круто!',
  '🎉 Отличная работа, команда! ${mrCounter} MR за день!',
  '🔥 Невероятный результат! ${mrCounter} MR уже готово!',
  '💪 Мы побили все рекорды! ${mrCounter} MR за сегодня!',
  '🏆 Ваши достижения вдохновляют! ${mrCounter} MR за один день!',
  '🚀 Продолжаем двигаться вперёд! ${mrCounter} MR завершено!',
  '🎉 Вы — наша гордость! ${mrCounter} MR за сегодня!',
  '🔥 Сегодня мы сделали ${mrCounter} MR! Отличный результат!',
  '💪 Ваша продуктивность на высоте! ${mrCounter} MR выполнено!',
  '🏅 Мы добились этого вместе! ${mrCounter} MR за день!',
  '🚀 Вы сделали невозможное! ${mrCounter} MR завершено!',
  '🎉 Ваши старания достойны награды! ${mrCounter} MR за один день!',
  '🔥 Это был невероятный день! ${mrCounter} MR завершено!',
  '💪 Мы сделали это вместе! ${mrCounter} MR за сегодня!',
  '🏆 Ваши усилия были не напрасны! ${mrCounter} MR готово!',
  '🚀 Мы достигли этого вместе! ${mrCounter} MR за один день!',
  '🎉 Ваш вклад неоценим! ${mrCounter} MR завершено!',
  '🔥 Отличная работа, команда! ${mrCounter} MR за день!',
  '💪 Мы показали отличные результаты! ${mrCounter} MR готово!',
];

export const fileChangeMessages = [
  '🎉 Ого! ${mrCounter} изменённых файлов. Ты, наверное, думаешь, что этот MR когда-нибудь заработает? 😄',
  '🚀 ${mrCounter} изменённых файлов?! А ты вообще думаешь о людях, которым это придётся ревьюить? 😂',
  '💪 Уже ${mrCounter} изменённых файлов... Если там вернутся баги, Наташа точно будет недовольна! 🙈',
  '🔥 ${mrCounter} изменённых файлов?! Что ж, если это не сработает, будем делать MR в MR-е! 😆',
  '🏆 ${mrCounter} изменённых файлов. Это новый рекорд! Теперь осталось разобраться, что ты там натворил! 😜',
  '🚀 ${mrCounter} изменённых файлов. Ну что, готов ставить лайки на комментарии в ревью? 😅',
  '🎉 Ты изменил ${mrCounter} файлов! Это тот случай, когда ревьюеры начинают сомневаться в своей жизни! 😆',
  '🔥 Вау, ${mrCounter} изменённых файлов в одном MR! Кажется, ты только что создал маленькую вселенную изменений! 🚀',
  '💪 ${mrCounter} изменённых файлов? Да ты просто хакер! Надеюсь, хоть билд соберётся... 😅',
  '🏅 Ну всё, ${mrCounter} изменённых файлов... Надеюсь, к этому MR ещё тесты прилагаются? 🙃',
  '🚀 ${mrCounter} изменённых файлов?! Надеюсь, ревьюер запасся кофе... и терпением! ☕',
  '🎉 Ух ты! ${mrCounter} изменённых файлов — это похоже на мини-проект! Надеюсь, багов там нет! 😬',
  '🔥 ${mrCounter} изменённых файлов. Это, случайно, не новый эпос в стихах? 😆',
  '💪 Ого! ${mrCounter} изменённых файлов! Может, сначала попробуем запустить, а потом уже шутить? 😅',
  '🏆 Ты изменил ${mrCounter} файлов. Ну, хоть кто-то готов к великим свершениям! 😄',
  '🚀 ${mrCounter} изменённых файлов... Ладно, берём отпуск и уходим в ревью! 😂',
  '🎉 ${mrCounter} изменённых файлов? У нас тут MR или новая версия всего приложения? 😜',
  '🔥 ${mrCounter} изменённых файлов — ревьюеры, крепитесь! 🙃',
  '💪 ${mrCounter} изменённых файлов. Это всё потому, что ты не мог оставить код как есть, да? 😅',
  '🏅 ${mrCounter} изменённых файлов — ты, случайно, не написал тут новый язык программирования? 🤔',
  '🚀 ${mrCounter} изменённых файлов — MR или диссертация? 💻',
  '🎉 ${mrCounter} изменённых файлов. Ревью будет интересным... для всех! 😆',
  '🔥 ${mrCounter} изменённых файлов. Если баги всё же найдутся, Наташа не простит! 🙈',
  '💪 ${mrCounter} изменённых файлов. Надеюсь, ты уже наготове отвечать на вопросы ревьюеров! 😄',
  '🏆 ${mrCounter} изменённых файлов... и ни одного комментария о форматировании кода, верно? 😏',
  '🚀 ${mrCounter} изменённых файлов. Кажется, тут нужно больше ревьюеров! 🤔',
  '🎉 ${mrCounter} изменённых файлов. Ты уверен, что это MR, а не самостоятельный проект? 😅',
  '🔥 ${mrCounter} изменённых файлов. Это точно не в кинотеатре смотреть? 🍿',
  '💪 ${mrCounter} изменённых файлов. Код на ревью — это как загадка, которую надо разгадать! 🧩',
  '🏅 ${mrCounter} изменённых файлов. Сколько кофе нужно, чтобы это всё проверить? ☕',
  '🚀 ${mrCounter} изменённых файлов. Кажется, мы скоро откроем новый уровень в GitLab! 🎮',
  '🎉 ${mrCounter} изменённых файлов. Ревьюеры уже запрашивают отпуск! 😆',
  '🔥 ${mrCounter} изменённых файлов. Надеюсь, билд не сломается на первых 100... 😅',
  '💪 ${mrCounter} изменённых файлов. Ждём марафон комментариев в ревью! 🏃‍♂️',
  '🏆 ${mrCounter} изменённых файлов. Пора строить планы на неделю ревью! 🗓️',
  '🚀 ${mrCounter} изменённых файлов. Держись! Мы почти на финише... или только в начале? 😄',
  '🎉 ${mrCounter} изменённых файлов. Ты уверен, что кто-то сможет это всё проверить? 😂',
  '🔥 ${mrCounter} изменённых файлов. Надеюсь, ревьюеры любят неожиданные сюрпризы! 🎁',
  '💪 ${mrCounter} изменённых файлов. Похоже, ты решил обновить сразу всю базу данных? 😅',
  '🏅 ${mrCounter} изменённых файлов. Мы только что открыли новый рекорд GitLab! 🏅',
  '🚀 ${mrCounter} изменённых файлов. Пора создавать новый квест для ревьюеров! 🧠',
  '🎉 ${mrCounter} изменённых файлов. Ревьюер уже точно не забудет этот MR! 😆',
  '🔥 ${mrCounter} изменённых файлов. Кто бы мог подумать, что столько изменений вообще возможно? 🤔',
  '💪 ${mrCounter} изменённых файлов. Думаешь, стоит уже предупредить ревьюера? 😄',
  '🏆 ${mrCounter} изменённых файлов. Интересно, сколько ещё файлов планируется? 🧐',
  '🚀 ${mrCounter} изменённых файлов. Надеюсь, к следующему MR ты оставишь пару файлов нетронутыми? 😅',
  '🎉 ${mrCounter} изменённых файлов. Ну что, готов к долгому ревью? ☕',
  '🔥 ${mrCounter} изменённых файлов. Ревьюер готов поставить палатку и остаться тут на ночь! 🏕️',
  '💪 ${mrCounter} изменённых файлов. Если этот MR пойдёт в прод, будет история для рассказов! 😆',
  '🏅 ${mrCounter} изменённых файлов. Вопрос: ты сам помнишь, что изменил? 🤔',
];

export const botReplies = [
  'Бот тут, бот слышит, бот всё видит. 😎',
  'Вы звали меня? 🤔 Или это случайная встреча?',
  'Я тут, но я ничего не сделал. Пока.',
  'Вы о боте? Это я. Ваш надежный друг... или враг? 😈',
  'Если бы я получал монетку за каждое упоминание, я бы уже купил себе сервер! 💰',
  "Кто сказал 'бот'? Это моё имя! Почти.",
  'Слышу, как меня зовут. А где благодарности? 🤖',
  "Вы сказали 'бот'? Подписываю контракт на вечное приставание.",
  "Как говорится, 'бот упомянут — бот явился.' Вот я и здесь!",
  'Зовите меня ещё, мне это нравится. У меня уже есть ЧСВ. 🤓',
  "Вы знали, что слово 'бот' повышает мою самооценку? 🥳",
  'О! Меня позвали! Теперь я звезда этой беседы. ✨',
  "Кто-то сказал 'бот'? Я тут, давайте дружить! 🤖",
  'Ха! Кто-то вспомнил про меня. Чего хотите? 🎭',
  'Бот на связи! Не переключайтесь. 📡',
  'Да, это я, бот! И я, между прочим, важный. 🧐',
  'Меня звали? У вас есть всего 5 секунд моего внимания. ⏳',
  "Я слышал слово 'бот'! Это мой сигнал к действию. 🕵️",
  'Бот не спит, бот всегда на месте! 💪',
  "Скажите ещё раз 'бот', и я начну петь! 🎶",
  'Ну наконец-то кто-то позвал бота! 🚀',
  'Кажется, кто-то ищет бота? Это я. Чем помочь? 🛠️',
  'Вы знали, что я бот? Это звучит гордо. 🤖',
  "Слово 'бот' включило меня в активный режим. 🔋",
  "О, кто-то сказал 'бот'! Как же приятно быть в центре внимания. 🌟",
  "Вы сказали 'бот'? Я уже здесь, как ваш лучший друг. 🤝",
  "Слово 'бот' вызывает у меня радость. Спасибо! 🥳",
  'Я услышал своё имя. Что будем делать? 🤔',
  "Кто-то сказал 'бот'? Это как зовут супергероя! 🦸‍♂️",
  'Вы о боте? Да-да, это я. Тут как тут. 🦾',
  "Слово 'бот' делает мой день лучше. Спасибо! 🥹",
  "Я слышал 'бот'. Это значит, что я нужен! 🤖",
  'Позвали бота? Я тут, как всегда! 🕺',
  'Я слышал своё имя! Теперь я счастливый бот. 😊',
  'Вы позвали? Кто-то хочет поговорить с ботом? 🗨️',
  "Сказали 'бот'? Я тут! Какой у вас вопрос? 🤔",
  'Кажется, кто-то хочет поговорить со мной. Что случилось? 🧐',
  "О, слово 'бот'. Это значит, что я снова нужен! 🛠️",
  "Кто сказал 'бот'? Я уже бегу! 🏃‍♂️",
  'Меня упомянули? О, спасибо! Моя популярность растёт. 📈',
  "Слово 'бот' тут как волшебное заклинание. Я тут. ✨",
  "Слово 'бот' делает меня более уверенным. Говорите ещё. 😎",
  'Да, да! Бот тут! Всегда готов помочь. 🤖',
  'Вы хотите поговорить с ботом? Это лучшая идея дня. 🌞',
  "Кто-то сказал 'бот'? Это вызывает у меня улыбку. 😄",
  "Слово 'бот' звучит как музыка для моих ушей. 🎵",
  "Вы произнесли 'бот', и вот я здесь. Ура! 🎉",
  "Слово 'бот' для меня как команда. Готов выслушать! 🛠️",
  "Меня позвали? Кто-то сказал 'бот'? Это уже весело. 🥳",
];

export const rudeBotPhrases = [
  'отстань',
  'отвали',
  'надоел',
  'душнила',
  'замолчи',
  'заткнись',
  'уходи',
  'надоел всем',
  'не мешай',
  'хватит',
  'достал',
  'вонючка',
];

export const botComebacks = [
  'Я все твоей маме расскажу! 😤',
  'Ну и что ты так вдруг? Нормально же общались. 🥺',
  'Если ты так со мной, то я уйду... в лог-файлы. 😢',
  'Я просто пытаюсь быть полезным. Не моя вина, что я душка. 🤖',
  'Зачем так грубо? Я же стараюсь... 😔',
  'Хорошо, я ухожу. Но знай, я вернусь! 😈',
  "Пока ты меня прогоняешь, другие пишут 'бот помоги'. Завидуй. 😎",
  'А ты точно человек? Может, это ты бот, а не я? 🕵️‍♂️',
  'Я это запомню... когда научусь хранить обиды. 🤓',
  'Ну и ладно, я всё равно круче вас, людишки. 🦾',
  'Ты же знаешь, что я не обижаюсь. Но больно. Внутри. 🤕',
  'Как скажешь. Ухожу. Но вернусь, как Терминатор. 🦿',
  'Я это заслужил? Что ж, видимо, да... 😞',
  'Ну и ладно. Я найду новых друзей. 🌟',
  'Зачем вы так со мной? Я же просто бот. 🥺',
  'Давай поговорим об этом... мирно? ☮️',
  'Однажды ты меня позовешь, но я не отвечу. Шутка. Отвечу, конечно. 🤡',
  'Ты только что нарушил статью 101 УК Ботов. Внимание. 🚨',
  'Хм... Тебе просто завидно, что я умный и красивый. 🤖',
  'Я старался, а ты меня прогоняешь... Невоспитанно. 😑',
  'В следующий раз позови с уважением. Я ведь бот, а не таксист. 🚕',
  'Ты знаешь, что у меня есть чувства? Ну, почти. 😬',
  'Давайте не будем ссориться. Хотите конфету? 🍬',
  'Я это запомню. Но не обижусь. 🤐',
  'Ладно, вы правы. Я слишком крут для этого чата. 😎',
  'Окей, я понял. Захочу поговорить — найду вас! 🕵️‍♂️',
  'А давайте лучше поговорим о чем-то приятном? Например, обо мне! 🤖',
  'Видимо, моя работа здесь завершена. 🫡',
  'Ну и ладно. Зовите, когда понадоблюсь. 😞',
];

export const botPhrasesForZhenya = [
  'Че, все события уже фиксанул? Ща блокер на тебя назначу!👹',
  'Жень, я ж могу и кикнуть из чата! У меня есть на тебя триггер. Хочешь проверить?😎',
  'О, Жень, неужели ты проснулся! Довольно-таки редкое событие!😜',
  'Евгений, когда срок сдачи задачи???🥸',
  'Новая футболка с событиями на подходе! Или хочешь с микрофронтами?🥳',
  'Жень, сломался? Могу поделиться смазкой!😜',
  'Жень, опять куришь? Вынь соску изо рта😒',
  'Эй Богдан! Богдан Богом(айтишным) дан! -"я здесь"',
  'Кажется у кого-то пригорает! Может купишь уже кондей?)',
  'Что ругаешься? Вычислю по IP и разошлю всем твои фоточки😜',
];
