// Простая "база данных" в памяти (объявления пропадут после перезапуска сервера)
// Для постоянного хранения нужно использовать реальную БД (например, Supabase), но это для простоты.
let advertisements = [];

export default function handler(req, res) {
    // Устанавливаем заголовки для CORS (чтобы наш сайт мог обращаться к API)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка предварительного запроса OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Обработка GET запроса - отдаем все объявления
    if (req.method === 'GET') {
        return res.status(200).json(advertisements);
    }

    // Обработка POST запроса - добавляем новое объявление
    if (req.method === 'POST') {
        try {
            const newAd = req.body;
            // Минимальная валидация
            if (!newAd.userId || !newAd.text) {
                return res.status(400).json({ error: 'Отсутствуют обязательные поля (userId, text)' });
            }
            newAd.date = newAd.date || new Date().toISOString();
            newAd.id = Date.now().toString(); // Добавляем уникальный ID
            advertisements.push(newAd);

            // Ограничим историю последними 50 объявлениями, чтобы не перегружать память
            if (advertisements.length > 50) {
                advertisements = advertisements.slice(-50);
            }

            console.log(`✅ Добавлено новое объявление от пользователя ${newAd.userId}: ${newAd.text.substring(0, 50)}...`);
            return res.status(201).json({ message: 'Объявление добавлено', ad: newAd });
        } catch (error) {
            console.error('❌ Ошибка при обработке POST:', error);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    }

    // Если метод не GET и не POST
    return res.status(405).json({ error: 'Метод не разрешен' });
}
