import moment from 'moment-timezone';
moment.locale('ru'); // Устанавливаем локаль на русский
import { funnyPhrases } from './constants.js';
import fs from 'fs';
import path from 'path';
export const timeZone = 'Europe/Moscow';

export const checkMr = (ctx) => ctx.message?.text?.toLowerCase()?.includes('merge_requests');

// Функция для случайного выбора N элементов из массива
export const getRandomElements = (array, n) => {
  const result = [];
  const taken = new Array(array.length);

  while (result.length < n) {
    const randomIndex = Math.floor(Math.random() * array.length);
    if (!taken[randomIndex]) {
      result.push(array[randomIndex]);
      taken[randomIndex] = true;
    }
  }
  return result;
};

export const getRandomMessage = (funnyPhrases, message = '', startMessage = '') => {
  const randomIndex = Math.floor(Math.random() * funnyPhrases.length);
  return startMessage + funnyPhrases[randomIndex] + '\n' + message;
};

export const getEveningMessage = (message, startMessage) => {
  // Получаем текущее время по Москве
  const moscowTime = moment().tz('Europe/Moscow');
  // Получаем часы по Москве
  const currentHour = moscowTime.hour();
  // Проверяем, находится ли время в интервале с 20 до 0 часов
  if (currentHour >= 20 || currentHour === 0 || currentHour === 1 || currentHour === 2) {
    return getRandomMessage(funnyPhrases, message, startMessage);
  }
  return message;
};

export const getRandomPhraseWithCounter = (phrazes, mrCounter, startMessage = '') => {
  const phraseTemplate = getRandomMessage(phrazes);
  return startMessage + phraseTemplate.replace(/\${mrCounter}/g, mrCounter);
};

// Функция для определения текущего времени у пользователя
export const getUserCurrentTime = (ctx) => {
  // Время отправки сообщения в Unix формате (в секундах)
  const messageTimeUnix = ctx.message.date;

  // Текущее время на сервере в Unix формате (в секундах)
  const serverTimeUnix = Math.floor(Date.now() / 1000);

  // Разница во времени между сервером и пользователем в секундах
  const timeDifferenceInSeconds = serverTimeUnix - messageTimeUnix;

  // Предполагаемое текущее время у пользователя
  const userCurrentTime = moment().subtract(timeDifferenceInSeconds, 'seconds');

  return userCurrentTime;
};

// Функция для определения времени суток и возвращения соответствующего сообщения
export const getUserTimeMessage = (ctx) => {
  const userCurrentTime = getUserCurrentTime(ctx);
  const hour = parseInt(userCurrentTime.format('HH'), 10);

  let timeOfDayMessage;

  if (hour === 0) {
    timeOfDayMessage = 'У тебя полночь';
  } else if (hour >= 1 && hour <= 4) {
    timeOfDayMessage = `У тебя ${hour} ${hour === 1 ? 'час' : 'часа'} ночи`;
  } else if (hour >= 5 && hour < 12) {
    timeOfDayMessage = `У тебя ${hour} часов ночи`;
  } else if (hour >= 12 && hour < 18) {
    timeOfDayMessage = `У тебя ${hour} часов дня`;
  } else if (hour >= 18 && hour < 23) {
    timeOfDayMessage = `У тебя ${hour} ${hour === 1 ? 'час' : hour >= 2 && hour <= 4 ? 'часа' : 'часов'} вечера`;
  } else if (hour === 23) {
    timeOfDayMessage = 'У тебя 23 часа вечера';
  }

  return timeOfDayMessage + '. ';
};

export const formatDate = (dateText) => moment(dateText).format('DD MMMM YYYY');

export const formatDateTime = (date) => {
  return moment(date).tz(timeZone).format('DD MMMM YYYY в HH:mm');
};

export const isChatNotTeam = (ctx, teamChatId) => {
  return ctx.chat.id.toString() !== teamChatId.toString();
};
