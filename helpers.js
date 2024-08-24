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

export const checkMr = (ctx) => ctx.message.text.toLowerCase().includes('mr:')
export const startMessage = (ctx) => ctx.message.text.toLowerCase().includes('start')
export const helpMessage = (ctx) => ctx.message.text.toLowerCase().includes('help')