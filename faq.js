// FAQ и статистика
function initializeFAQ() {
    loadFAQContent();
    loadStatistics();
}

// Загрузка контента FAQ
function loadFAQContent() {
    const faqContainer = document.querySelector('.faq-container');
    if (!faqContainer) return;
    
    // Загружаем статистику
    loadStatistics();
}

// Загрузка статистики
async function loadStatistics() {
    const statsContainer = document.getElementById('stats-content');
    if (!statsContainer) return;
    
    try {
        // Получаем данные из Firebase
        const [usersSnapshot, adsSnapshot, complaintsSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('ads').once('value'),
            db.ref('complaints').once('value')
        ]);
        
        const users = usersSnapshot.val() || {};
        const ads = adsSnapshot.val() || {};
        const complaints = complaintsSnapshot.val() || {};
        
        // Рассчитываем статистику
        const totalUsers = Object.keys(users).length;
        const totalAds = Object.keys(ads).length;
        const totalComplaints = Object.keys(complaints).length;
        
        const activeAds = Object.values(ads).filter(ad => !ad.blocked).length;
        const verifiedAds = Object.values(ads).filter(ad => ad.verified).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAds = Object.values(ads).filter(ad => {
            const adDate = new Date(ad.createdAt);
            adDate.setHours(0, 0, 0, 0);
            return adDate.getTime() === today.getTime();
        }).length;
        
        // Форматируем статистику для отображения
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalUsers}</div>
                    <div class="stat-label">Пользователей</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalAds}</div>
                    <div class="stat-label">Объявлений</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${activeAds}</div>
                    <div class="stat-label">Активных объявлений</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${verifiedAds}</div>
                    <div class="stat-label">Верифицировано</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${todayAds}</div>
                    <div class="stat-label">Сегодня добавлено</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalComplaints}</div>
                    <div class="stat-label">Жалоб</div>
                </div>
            </div>
            
            <div class="server-info">
                <h4><i class="fas fa-server"></i> Информация о сервере</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Статус:</span>
                        <span class="info-value online"><i class="fas fa-circle"></i> Онлайн</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">База данных:</span>
                        <span class="info-value">Firebase Realtime</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Версия:</span>
                        <span class="info-value">1.2</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Обновлено:</span>
                        <span class="info-value">${new Date().toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
            </div>
            
            <div class="rules">
                <h4><i class="fas fa-gavel"></i> Правила платформы</h4>
                <ul class="rules-list">
                    <li><i class="fas fa-check-circle"></i> Запрещена продажа запрещенных веществ</li>
                    <li><i class="fas fa-check-circle"></i> Только товары для вейпинга</li>
                    <li><i class="fas fa-check-circle"></i> Реальные фотографии товаров</li>
                    <li><i class="fas fa-check-circle"></i> Корректное описание и цена</li>
                    <li><i class="fas fa-check-circle"></i> Уважительное общение</li>
                    <li><i class="fas fa-check-circle"></i> Мошенничество приведет к блокировке</li>
                </ul>
            </div>
            
            <div class="support-info">
                <h4><i class="fas fa-headset"></i> Поддержка</h4>
                <p>По вопросам работы платформы, блокировок или предложениям обращайтесь:</p>
                <div class="contact-info">
                    <a href="https://t.me/nukm0" target="_blank" class="support-link">
                        <i class="fab fa-telegram"></i> @nukm0
                    </a>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        statsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Не удалось загрузить статистику</p>
            </div>
        `;
    }
}
