const BOT_TOKEN = '7533251643:AAG4zsHpFz4OTIRFjESFDUvPLjPJ7Up3xL0'
const { Telegraf } = require('telegraf');
const fs = require('fs');
const bot = new Telegraf(BOT_TOKEN);
let tryCheck = 0
let subscribers = [];
let sentItems = {}; // Объект для хранения отправленных данных

// Загрузка данных из файла при запуске бота
const loadState = () => {
    try {
        const data = fs.readFileSync('bot_state.json', 'utf8');
        const state = JSON.parse(data);
        subscribers = state.subscribers || [];
        sentItems = state.sentItems || {};
        console.log('Данные успешно загружены.');
        sentItems = {};
    } catch (err) {
        console.log('Нет данных для загрузки, начнем с чистого листа.');
    }
};

// Сохранение данных в файл при остановке бота
const saveState = () => {
    const state = {
        subscribers,
        sentItems
    };
    fs.writeFileSync('bot_state.json', JSON.stringify(state, null, 2));
    console.log('Данные успешно сохранены.');
};

bot.start((ctx) => ctx.reply('Добро пожаловать! Используйте /subscribe для подписки на уведомления и /unsubscribe для отписки.'));
let token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjQwODE5djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc0MDc4MDA0NCwiaWQiOiJkODM3NzkyNS05NmExLTQxODYtODgyNS04MjAyNDRkN2UzMmIiLCJpaWQiOjUxODk0ODAyLCJvaWQiOjE5MDEzNSwicyI6MTAyNCwic2lkIjoiM2IyM2RjOWYtYmM4MS00ZjFlLThjYTItNjg2YzMwNjYyYzAzIiwidCI6ZmFsc2UsInVpZCI6NTE4OTQ4MDJ9.gQHWu7JjD-wQRuBrInNbTgnNgIs8FzpBKlgdGSQcsYqCbdzyjPzHXm5qBOJ4DfAeDhUYpxmHIFtU48F1kVWQ9A';

async function checkCargoes() {
    if (tryCheck % 2 === 0) {
        token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjQwODE5djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc0MDc3OTk4MiwiaWQiOiIxNTY2YzA3ZC1mYWU0LTRlN2YtOTM5MC00ZjhhOWExMGQxMGQiLCJpaWQiOjg1MzU5MzQ3LCJvaWQiOjgxNDg3MywicyI6MTAyNCwic2lkIjoiNzJlYzk0NDQtZWY2Ny00NGE3LTllMjgtNTgwMmRkMjg2OTU5IiwidCI6ZmFsc2UsInVpZCI6ODUzNTkzNDd9.MkYPUATVRTBGb6vq7zeUzQlgn2Alz0jsPZOv8LzNNEXwZ1miqY52V3ZaWKqRVM0RPJ8J3OCKRX6BN8Ko7VdCWw'
    } else {
        token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjQwODE5djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc0MDc4MDA0NCwiaWQiOiJkODM3NzkyNS05NmExLTQxODYtODgyNS04MjAyNDRkN2UzMmIiLCJpaWQiOjUxODk0ODAyLCJvaWQiOjE5MDEzNSwicyI6MTAyNCwic2lkIjoiM2IyM2RjOWYtYmM4MS00ZjFlLThjYTItNjg2YzMwNjYyYzAzIiwidCI6ZmFsc2UsInVpZCI6NTE4OTQ4MDJ9.gQHWu7JjD-wQRuBrInNbTgnNgIs8FzpBKlgdGSQcsYqCbdzyjPzHXm5qBOJ4DfAeDhUYpxmHIFtU48F1kVWQ9A'
    }
    tryCheck++
    try {
        const fetch = await import('node-fetch').then(module => module.default);

        const response = await fetch('https://supplies-api.wildberries.ru/api/v1/acceptance/coefficients', {
            method: "GET",
            headers: {
                Authorization: token,
            },
        });

        if (!response.ok) {
            console.log("Ошибка HTTP: " + response.status);
            return;
        }

        let items = await response.json();

        // Фильтрация и обработка данных
        let filteredItems = items.filter(element => 
            element.coefficient >= 0 && element.coefficient <= 5 &&
            element.boxTypeName === 'Короба' &&
            ['Коледино', 'Казань', 'Электросталь', 'Краснодар', 'Тула'].includes(element.warehouseName)
        );

        // Отправка новых данных подписанным пользователям
        subscribers.forEach(chatId => {
            if (!sentItems[chatId]) {
                sentItems[chatId] = [];
            }

            // Фильтрация новых элементов, которые еще не отправлялись
            let newItems = filteredItems.filter(item => 
                !sentItems[chatId].some(sentItem => sentItem.date === item.date && sentItem.warehouseID === item.warehouseID)
            );

            if (newItems.length > 0) {
                newItems.forEach(item => {
                     let message = `Дата: ${formatDate(dateString)} \nКоэффициент: ${item.coefficient} \nСклад: ${item.warehouseName} \nТип коробки: ${item.boxTypeName}`;
                                        bot.telegram.sendMessage(chatId, message);
                    console.log(message)
                });

                // Добавляем новые элементы в список отправленных
                sentItems[chatId].push(...newItems);
            }
        });
        console.log(tryCheck)
    } catch (error) {
        console.error("Ошибка при получении данных:", error);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    // Получаем день и месяц
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    // Формируем строку в формате 30.08
    return `${day}.${month}`;
}
function startDailyCheck() {
    const now = new Date();
    
    // Устанавливаем следующее выполнение на 8:30 утра по Москве (UTC+3)
    const nextCheck = new Date();
    nextCheck.setHours(8, 30, 0, 0); // 8:30:00 по местному времени
    // Если текущее время уже позже 8:30, назначаем выполнение на следующий день
    if (now > nextCheck) {
        nextCheck.setDate(nextCheck.getDate() + 1);
    }
    const timeToNextCheck = nextCheck - now;
    // Запускаем checkCargoes в 8:30
    setTimeout(() => {
        console.log('Проверка отправлений запущена в 8:30 по Москве');
        checkCargoes();
        // Устанавливаем повторный запуск через 24 часа (86400000 миллисекунд)
        setInterval(checkCargoes, 24 * 60 * 60 * 1000);
    }, timeToNextCheck); // Устанавливаем таймер до следующего запуска
}
startDailyCheck();
bot.command('subscribe', (ctx) => {
    const chatId = ctx.chat.id;
    if (!subscribers.includes(chatId)) {
        subscribers.push(chatId);
        sentItems[chatId] = [];
        ctx.reply('Вы успешно подписались на уведомления.');
    } else {
        ctx.reply('Вы уже подписаны.');
    }
});

bot.command('unsubscribe', (ctx) => {
    const chatId = ctx.chat.id;
    subscribers = subscribers.filter(id => id !== chatId);
    delete sentItems[chatId];
    ctx.reply('Вы отписались от уведомлений.');
});

loadState();

setInterval(checkCargoes, 5500);

bot.launch();

// Сохраняем состояние при остановке
process.once('SIGINT', () => {
    saveState();
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    saveState();
    bot.stop('SIGTERM');
});

// Краснодар, Коледино, Электросталь!, Казань!, Тула!.
// boxTypeName: 'Короба',
