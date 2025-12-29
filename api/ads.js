// ==================== VAPE MARKET API ====================
// Серверное хранилище объявлений
// Внимание: данные сбросятся при перезапуске сервера Vercel

let advertisements = [];
let userRatings = {};

export default function handler(req, res) {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Предварительный запрос OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ==================== GET: Получить все объявления ====================
    if (req.method === 'GET') {
        const { action, userId } = req.query;

        // GET /api/ads - все объявления
        if (!action) {
            console.log(`GET /api/ads - возвращаем ${advertisements.length} объявлений`);
            return res.status(200).json({
                success: true,
                ads: advertisements,
                total: advertisements.length
            });
        }

        // GET /api/ads?action=user&userId=123 - объявления пользователя
        if (action === 'user' && userId) {
            const userAds = advertisements.filter(ad => ad.sellerId === userId);
            console.log(`GET /api/ads?action=user - возвращаем ${userAds.length} объявлений пользователя ${userId}`);
            return res.status(200).json({
                success: true,
                ads
