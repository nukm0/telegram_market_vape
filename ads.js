// Система объявлений
let ads = [];
let myAds = [];
let currentFilters = { category: 'all' };
let unsubscribeAds = null;

// Инициализация системы объявлений
async function initializeAds() {
    if (!currentUser) {
        console.error('Пользователь не авторизован');
        return;
    }

    // Загружаем объявления
    await loadAds();
    
    // Подписываемся на изменения
    subscribeToAds();
    
    // Инициализируем обработчики
    initializeAdHandlers();
}

// Загрузка объявлений
async function loadAds() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const noAds = document.getElementById('no-ads');
    const adsContainer = document.getElementById('ads-container');
    
    loadingSpinner.style.display = 'flex';
    adsContainer.innerHTML = '';
    
    try {
        const snapshot = await db.ref('ads').once('value');
        const adsData = snapshot.val();
        
        if (!adsData) {
            loadingSpinner.style.display = 'none';
            noAds.style.display = 'block';
            return;
        }
        
        // Конвертируем в массив и фильтруем
        ads = Object.entries(adsData).map(([id, ad]) => ({
            id,
            ...ad
        })).filter(ad => !ad.blocked); // Не показываем заблокированные
        
        // Применяем фильтры
        applyFilters();
        
        loadingSpinner.style.display = 'none';
        noAds.style.display = ads.length === 0 ? 'block' : 'none';
        
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
        loadingSpinner.style.display = 'none';
        showNotification('Ошибка загрузки объявлений', 'error');
    }
}

// Подписка на изменения объявлений
function subscribeToAds() {
    if (unsubscribeAds) {
        unsubscribeAds();
    }
    
    unsubscribeAds = listenToData('ads', (adsData) => {
        if (adsData) {
            ads = Object.entries(adsData).map(([id, ad]) => ({
                id,
                ...ad
            })).filter(ad => !ad.blocked);
            
            applyFilters();
            
            // Обновляем список моих объявлений если нужно
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadMyAds();
            }
        }
    });
}

// Применение фильтров
function applyFilters() {
    let filteredAds = [...ads];
    
    // Фильтр по категории
    if (currentFilters.category !== 'all') {
        filteredAds = filteredAds.filter(ad => ad.category === currentFilters.category);
    }
    
    // Сортировка по дате (новые сверху)
    filteredAds.sort((a, b) => b.createdAt - a.createdAt);
    
    // Отображаем
    renderAds(filteredAds);
}

// Отображение объявлений
function renderAds(adsToRender) {
    const adsContainer = document.getElementById('ads-container');
    
    if (adsToRender.length === 0) {
        adsContainer.innerHTML = `
            <div class="no-ads">
                <i class="fas fa-search"></i>
                <h3>Объявлений не найдено</h3>
                <p>Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
    
    adsContainer.innerHTML = adsToRender.map(ad => createAdCard(ad)).join('');
    
    // Добавляем обработчики для кнопок оценок
    adsToRender.forEach(ad => {
        const likeBtn = document.getElementById(`like-btn-${ad.id}`);
        const dislikeBtn = document.getElementById(`dislike-btn-${ad.id}`);
        
        if (likeBtn && dislikeBtn && currentUser) {
            // Проверяем текущую оценку пользователя
            checkUserRating(ad.id).then(rating => {
                if (rating === 'like') {
                    likeBtn.classList.add('liked');
                    dislikeBtn.classList.remove('active');
                } else if (rating === 'dislike') {
                    dislikeBtn.classList.add('active');
                    likeBtn.classList.remove('liked');
                }
            });
            
            likeBtn.addEventListener('click', () => rateAd(ad.id, 'like'));
            dislikeBtn.addEventListener('click', () => rateAd(ad.id, 'dislike'));
        }
        
        // Обработчик кнопки жалобы
        const complaintBtn = document.getElementById(`complaint-btn-${ad.id}`);
        if (complaintBtn) {
            complaintBtn.addEventListener('click', () => openComplaintModal(ad.id));
        }
        
        // Обработчик кнопки "Написать продавцу"
        const contactBtn = document.getElementById(`contact-btn-${ad.id}`);
        if (contactBtn) {
            contactBtn.addEventListener('click', () => contactSeller(ad));
        }
    });
}

// Создание карточки объявления
function createAdCard(ad) {
    const isMyAd = ad.sellerId === getUserId();
    const contactBtnDisabled = isMyAd ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    const complaintBtnDisabled = isMyAd ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    
    const firstPhoto = ad.photoUrls && ad.photoUrls.length > 0 
        ? ad.photoUrls[0] 
        : 'https://via.placeholder.com/400x200/8a2be2/ffffff?text=Vape+Market';
    
    const rating = appConfig.ratingFormula(ad.likes || 0, ad.dislikes || 0);
    
    return `
        <div class="ad-card" data-id="${ad.id}">
            <img src="${firstPhoto}" alt="${ad.title}" class="ad-image" 
                 onclick="showAdGallery('${ad.id}')">
            <div class="ad-info">
                <div class="ad-title">${escapeHtml(ad.title)}</div>
                <div class="ad-price">${ad.price} ₽</div>
                <span class="ad-category">${ad.category}</span>
                <div class="ad-description">${escapeHtml(ad.description)}</div>
                <div class="ad-footer">
                    <div class="seller-info">
                        ${ad.sellerPhoto ? 
                            `<img src="${ad.sellerPhoto}" alt="${ad.sellerName}" class="seller-avatar">` : 
                            `<div class="seller-avatar"><i class="fas fa-user"></i></div>`
                        }
                        <div>
                            <div class="seller-name">${escapeHtml(ad.sellerName)}</div>
                            <div class="rating">
                                <i class="fas fa-star"></i>
                                ${rating.toFixed(1)}
                            </div>
                        </div>
                    </div>
                    <div class="ad-actions">
                        <button class="action-btn" id="like-btn-${ad.id}" title="Лайк">
                            <i class="fas fa-thumbs-up"></i> ${ad.likes || 0}
                        </button>
                        <button class="action-btn" id="dislike-btn-${ad.id}" title="Дизлайк">
                            <i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}
                        </button>
                        <button class="action-btn" id="complaint-btn-${ad.id}" ${complaintBtnDisabled} title="Пожаловаться">
                            <i class="fas fa-flag"></i>
                        </button>
                        <button class="action-btn" id="contact-btn-${ad.id}" ${contactBtnDisabled} title="Написать продавцу">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Система оценок (лайки/дизлайки)
async function checkUserRating(adId) {
    try {
        const snapshot = await db.ref(`ratings/${adId}/${getUserId()}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Ошибка проверки оценки:', error);
        return null;
    }
}

async function rateAd(adId, rating) {
    if (!currentUser) {
        showNotification('Авторизуйтесь для оценки', 'warning');
        return;
    }
    
    const ad = ads.find(a => a.id === adId);
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    // Нельзя оценивать свои объявления
    if (ad.sellerId === getUserId()) {
        showNotification('Нельзя оценивать свои объявления', 'warning');
        return;
    }
    
    // Проверяем текущую оценку
    const currentRating = await checkUserRating(adId);
    
    // Если оценка уже есть и она такая же - отменяем
    if (currentRating === rating) {
        showNotification('Вы уже поставили эту оценку', 'info');
        return;
    }
    
    try {
        // Обновляем оценку пользователя
        await setData(`ratings/${adId}/${getUserId()}`, rating);
        
        // Обновляем счетчики в объявлении
        const updates = {};
        
        if (currentRating === 'like') {
            // Меняем лайк на дизлайк
            updates['ads/' + adId + '/likes'] = (ad.likes || 1) - 1;
            updates['ads/' + adId + '/dislikes'] = (ad.dislikes || 0) + 1;
            
            // Обновляем счетчики пользователя
            await updateCounter(`users/${ad.sellerId}/likesCount`, -1);
            await updateCounter(`users/${ad.sellerId}/dislikesCount`, 1);
            
        } else if (currentRating === 'dislike') {
            // Меняем дизлайк на лайк
            updates['ads/' + adId + '/dislikes'] = (ad.dislikes || 1) - 1;
            updates['ads/' + adId + '/likes'] = (ad.likes || 0) + 1;
            
            // Обновляем счетчики пользователя
            await updateCounter(`users/${ad.sellerId}/dislikesCount`, -1);
            await updateCounter(`users/${ad.sellerId}/likesCount`, 1);
            
        } else {
            // Новая оценка
            if (rating === 'like') {
                updates['ads/' + adId + '/likes'] = (ad.likes || 0) + 1;
                await updateCounter(`users/${ad.sellerId}/likesCount`, 1);
            } else {
                updates['ads/' + adId + '/dislikes'] = (ad.dislikes || 0) + 1;
                await updateCounter(`users/${ad.sellerId}/dislikesCount`, 1);
            }
        }
        
        // Обновляем рейтинг продавца
        const seller = await getData(`users/${ad.sellerId}`);
        if (seller) {
            const newRating = appConfig.ratingFormula(
                seller.likesCount || 0,
                seller.dislikesCount || 0
            );
            await updateData(`users/${ad.sellerId}/rating`, newRating);
        }
        
        // Применяем все обновления
        await updateData('/', updates);
        
        showNotification('Оценка сохранена', 'success');
        
    } catch (error) {
        console.error('Ошибка оценки:', error);
        showNotification('Ошибка сохранения оценки', 'error');
    }
}

// Создание объявления
async function createAd(adData) {
    if (!currentUser) {
        showNotification('Авторизуйтесь для создания объявления', 'error');
        return false;
    }
    
    const adId = generateId();
    const ad = {
        id: adId,
        sellerId: getUserId(),
        sellerName: currentUser.firstName + (currentUser.lastName ? ' ' + currentUser.lastName : ''),
        sellerUsername: currentUser.username,
        sellerPhoto: currentUser.photoUrl,
        title: adData.title.trim(),
        category: adData.category,
        price: parseInt(adData.price),
        description: adData.description.trim(),
        contact: adData.contact.trim(),
        photoUrls: adData.photos || [],
        likes: 0,
        dislikes: 0,
        complaints: 0,
        verified: false,
        blocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    try {
        // Сохраняем объявление
        await setData(`ads/${adId}`, ad);
        
        // Обновляем счетчик объявлений пользователя
        await updateCounter(`users/${getUserId()}/adsCount`, 1);
        
        // Обновляем текущего пользователя
        currentUser.adsCount = (currentUser.adsCount || 0) + 1;
        
        showNotification('Объявление успешно создано!', 'success');
        return true;
        
    } catch (error) {
        console.error('Ошибка создания объявления:', error);
        showNotification('Ошибка создания объявления', 'error');
        return false;
    }
}

// Загрузка моих объявлений
async function loadMyAds() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.ref('ads').once('value');
        const adsData = snapshot.val();
        
        if (!adsData) {
            myAds = [];
            return;
        }
        
        // Фильтруем объявления текущего пользователя
        myAds = Object.entries(adsData)
            .filter(([id, ad]) => ad.sellerId === getUserId())
            .map(([id, ad]) => ({
                id,
                ...ad
            }))
            .sort((a, b) => b.createdAt - a.createdAt);
        
        renderMyAds();
        
    } catch (error) {
        console.error('Ошибка загрузки моих объявлений:', error);
    }
}

// Отображение моих объявлений
function renderMyAds() {
    const container = document.getElementById('my-ads-list');
    
    if (!container) return;
    
    if (myAds.length === 0) {
        container.innerHTML = `
            <div class="no-ads">
                <i class="fas fa-box-open"></i>
                <h3>У вас нет объявлений</h3>
                <p>Создайте первое объявление!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = myAds.map(ad => `
        <div class="my-ad-item">
            <div class="my-ad-preview">
                <img src="${ad.photoUrls && ad.photoUrls.length > 0 ? ad.photoUrls[0] : 'https://via.placeholder.com/100x100/8a2be2/ffffff?text=Vape'}" 
                     alt="${ad.title}">
                <div class="my-ad-info">
                    <h4>${escapeHtml(ad.title)}</h4>
                    <div class="my-ad-price">${ad.price} ₽</div>
                    <div class="my-ad-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${ad.likes || 0}</span>
                        <span><i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}</span>
                        <span><i class="fas fa-flag"></i> ${ad.complaints || 0}</span>
                    </div>
                </div>
            </div>
            <div class="my-ad-actions">
                <button class="btn-secondary" onclick="editAd('${ad.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-danger" onclick="deleteAd('${ad.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Контакт с продавцом
function contactSeller(ad) {
    if (ad.sellerId === getUserId()) {
        showNotification('Это ваше объявление', 'info');
        return;
    }
    
    const message = `Здравствуйте! Я пишу по поводу вашего объявления "${ad.title}" на Vape Market`;
    const username = ad.sellerUsername.startsWith('@') ? ad.sellerUsername : `@${ad.sellerUsername}`;
    
    const url = `https://t.me/${username.replace('@', '')}?text=${encodeURIComponent(message)}`;
    
    // Открываем в новом окне или если в Telegram WebApp, используем их метод
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

// Инициализация обработчиков
function initializeAdHandlers() {
    // Фильтры
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            applyFilters();
        });
    }
    
    // Сортировка
    const sortBtn = document.getElementById('sort-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            ads.sort((a, b) => b.createdAt - a.createdAt);
            applyFilters();
        });
    }
    
    // Создание объявления
    const createAdBtn = document.getElementById('create-ad-btn');
    const createAdModal = document.getElementById('create-ad-modal');
    const createAdForm = document.getElementById('create-ad-form');
    
    if (createAdBtn && createAdModal) {
        createAdBtn.addEventListener('click', () => {
            createAdModal.classList.add('active');
            resetCreateAdForm();
        });
    }
    
    if (createAdForm) {
        createAdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('ad-title').value;
            const category = document.getElementById('ad-category').value;
            const price = document.getElementById('ad-price').value;
            const description = document.getElementById('ad-description').value;
            const contact = document.getElementById('ad-contact').value;
            
            // Валидация
            if (!title || !category || !price || !description || !contact) {
                showNotification('Заполните все обязательные поля', 'error');
                return;
            }
            
            if (parseInt(price) <= 0) {
                showNotification('Цена должна быть больше 0', 'error');
                return;
            }
            
            // Получаем загруженные фото
            const photoInput = document.getElementById('photo-input');
            const photos = [];
            
            if (photoInput.files.length > 0) {
                // В реальном приложении здесь была бы загрузка в Firebase Storage
                // Для демо используем заглушки
                for (let i = 0; i < Math.min(photoInput.files.length, appConfig.maxPhotos); i++) {
                    photos.push(URL.createObjectURL(photoInput.files[i]));
                }
            }
            
            // Создаем объявление
            const adData = {
                title,
                category,
                price,
                description,
                contact,
                photos
            };
            
            const success = await createAd(adData);
            
            if (success) {
                createAdModal.classList.remove('active');
                createAdForm.reset();
                document.getElementById('photo-preview').innerHTML = '';
            }
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Загрузка фото
    const photoUploadBtn = document.getElementById('photo-upload-btn');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    
    if (photoUploadBtn && photoInput) {
        photoUploadBtn.addEventListener('click', () => {
            photoInput.click();
        });
        
        photoInput.addEventListener('change', function() {
            const files = Array.from(this.files).slice(0, appConfig.maxPhotos);
            photoPreview.innerHTML = '';
            
            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-photo';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.onclick = function() {
                        img.remove();
                        // Удаляем файл из input
                        const dt = new DataTransfer();
                        const remainingFiles = Array.from(photoInput.files)
                            .filter((_, i) => i !== index);
                        remainingFiles.forEach(file => dt.items.add(file));
                        photoInput.files = dt.files;
                    };
                    
                    img.appendChild(removeBtn);
                    photoPreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }
}

// Вспомогательные функции
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetCreateAdForm() {
    document.getElementById('create-ad-form').reset();
    document.getElementById('photo-preview').innerHTML = '';
}
