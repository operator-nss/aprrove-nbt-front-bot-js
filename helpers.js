import moment from "moment-timezone";
import {funnyPhrases} from "./constants.js";

export const checkMr = (ctx) => ctx.message.text.toLowerCase().includes('mr:')
export const startMessage = (ctx) => ctx.message.text.toLowerCase().includes('start')
export const helpMessage = (ctx) => ctx.message.text.toLowerCase().includes('help')

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

export const getEveningMessage = (message) => {
	// Получаем текущее время по Москве
	const moscowTime = moment().tz('Europe/Moscow');
	// Получаем часы по Москве
	const currentHour = moscowTime.hour();
	console.log('currentHour', currentHour)
	// Проверяем, находится ли время в интервале с 20 до 0 часов
	if (currentHour >= 20 || currentHour === 0) {
		const randomIndex = Math.floor(Math.random() * funnyPhrases.length);
		return funnyPhrases[randomIndex] + '\n' + message;
	}
	return message
}