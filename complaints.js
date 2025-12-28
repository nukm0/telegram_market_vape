// Система жалоб
let currentComplaintAdId = null;
let complaintPhoto = null;

// Открытие модального окна жалобы
function openComplaintModal(adId) {
    const ad = ads.find(a => a.id === adId);
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    // Нельзя жаловаться на свои объявления
    if (ad.sellerId === getUserId()) {
        showNotification('Нельзя жаловаться на свои объявления', 'warning');
        return;
    }
    
    currentComplaintAdId = adId;
    complaintPhoto = null;
    
    // Сбрасываем форму
    document.getElementById('complaint-form').reset();
    document.getElementById('complaint-photo-preview').innerHTML = '';
    document.getElementById('complaint-ad-id').value = adId;
    
    // Показываем модальное окно
    document.getElementById('complaint-modal').classList.add('active');
}

// Инициализация системы жалоб
function initializeComplaints() {
    // Загрузка фото для жалобы
    const complaintPhotoBtn = document.getElementById('complaint-photo-btn');
    const complaintPhotoInput = document.getElementById('complaint-photo-input');
    const complaintPhotoPreview = document.getElementById('complaint-photo-preview');
    
    if (complaintPhotoBtn && complaintPhotoInput) {
        complaintPhotoBtn.addEventListener('click', () => {
            complaintPhotoInput.click();
        });
        
        complaintPhotoInput.addEventListener('change', function() {
            if (this.files.length === 0) return;
            
            const file = this.files[0];
            complaintPhoto = file;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                complaintPhotoPreview.innerHTML = `
                    <div class="photo-preview-item">
                        <img src="${e.target.result}" class="preview-image">
                        <button class="remove-photo" onclick="removeComplaintPhoto()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Форма жалобы
    const complaintForm = document.getElementById('complaint-form');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const type = document.getElementById('complaint-type').value;
            const description = document.getElementById('complaint-description').value.trim();
            
            // Валидация
            if (!type || !description) {
                showNotification('Заполните все обязательные поля', 'error');
                return;
            }
            
            if (description.length < 10) {
                showNotification('Опишите проблему подробнее (минимум 10 символов)', 'error');
                return;
            }
            
            await submitComplaint(type, description);
        });
    }
}

// Удаление фото из жалобы
function removeComplaintPhoto() {
    complaintPhoto = null;
    document.getElementById('complaint-photo-preview').innerHTML = '';
    document.getElementById('complaint-photo-input').value = '';
}

// Отправка жалобы
async function submitComplaint(type, description) {
    if (!currentUser || !currentComplaintAdId) {
        showNotification('Ошибка отправки жалобы', 'error');
        return;
    }
    
    const ad = ads.find(a => a.id === currentComplaintAdId);
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    try {
        const complaintId = generateId().replace('ad_', 'complaint_');
        const complaint = {
            id: complaintId,
            reporterId: getUserId(),
            reporterName: currentUser.firstName + (currentUser.lastName ? ' ' + currentUser.lastName : ''),
            reporterUsername: currentUser.username,
            targetAdId: currentComplaintAdId,
            targetUserId: ad.sellerId,
            targetUserName: ad.sellerName,
            targetUserUsername: ad.sellerUsername,
            adTitle: ad.title,
            adPrice: ad.price,
            type: type,
            description: description,
            photoUrl: null, // В реальном приложении здесь будет URL загруженного фото
            status: 'new',
            createdAt: Date.now(),
            resolvedAt: null,
            resolvedBy: null
        };
        
        // Сохраняем жалобу
        await setData(`complaints/${complaintId}`, complaint);
        
        // Обновляем счетчик жалоб на объявление
        await updateCounter(`ads/${currentComplaintAdId}/complaints`, 1);
        
        // Обновляем счетчик жалоб на пользователя
        await updateCounter(`users/${ad.sellerId}/complaintsCount`, 1);
        
        // Отправляем уведомление администраторам
        await notifyAdminsAboutComplaint(complaint);
        
        // Закрываем модальное окно
        document.getElementById('complaint-modal').classList.remove('active');
        
        showNotification('Жалоба отправлена администраторам', 'success');
        currentComplaintAdId = null;
        complaintPhoto = null;
        
    } catch (error) {
        console.error('Ошибка отправки жалобы:', error);
        showNotification('Ошибка отправки жалобы', 'error');
    }
}

// Уведомление администраторов о жалобе
async function notifyAdminsAboutComplaint(complaint) {
    // В реальном приложении здесь можно отправлять сообщения в Telegram
    // или делать запись в специальный канал уведомлений
    
    // Создаем запись в истории для админов
    const notificationId = generateId().replace('ad_', 'notif_');
    const notification = {
        id: notificationId,
        type: 'new_complaint',
        complaintId: complaint.id,
        adId: complaint.targetAdId,
        userId: complaint.targetUserId,
        reporterId: complaint.reporterId,
        priority: 'high',
        createdAt: Date.now(),
        readBy: []
    };
    
    await setData(`adminNotifications/${notificationId}`, notification);
}

// Получение жалоб для админа
async function getComplaintsForAdmin() {
    try {
        const snapshot = await db.ref('complaints').once('value');
        const complaintsData = snapshot.val();
        
        if (!complaintsData) return [];
        
        return Object.entries(complaintsData).map(([id, complaint]) => ({
            id,
            ...complaint
        })).sort((a, b) => b.createdAt - a.createdAt);
        
    } catch (error) {
        console.error('Ошибка получения жалоб:', error);
        return [];
    }
}

// Решение жалобы
async function resolveComplaint(complaintId, resolution, adminId) {
    try {
        const updates = {};
        updates[`complaints/${complaintId}/status`] = 'resolved';
        updates[`complaints/${complaintId}/resolvedAt`] = Date.now();
        updates[`complaints/${complaintId}/resolvedBy`] = adminId;
        updates[`complaints/${complaintId}/resolution`] = resolution;
        
        await updateData('/', updates);
        
        // Добавляем запись в историю модерации
        await addModerationHistory({
            adminId: adminId,
            action: 'resolve_complaint',
            targetType: 'complaint',
            targetId: complaintId,
            details: resolution,
            timestamp: Date.now()
        });
        
        return true;
        
    } catch (error) {
        console.error('Ошибка решения жалобы:', error);
        return false;
    }
}

// Отклонение жалобы
async function rejectComplaint(complaintId, reason, adminId) {
    try {
        const updates = {};
        updates[`complaints/${complaintId}/status`] = 'rejected';
        updates[`complaints/${complaintId}/resolvedAt`] = Date.now();
        updates[`complaints/${complaintId}/resolvedBy`] = adminId;
        updates[`complaints/${complaintId}/rejectionReason`] = reason;
        
        await updateData('/', updates);
        
        // Добавляем запись в историю модерации
        await addModerationHistory({
            adminId: adminId,
            action: 'reject_complaint',
            targetType: 'complaint',
            targetId: complaintId,
            details: reason,
            timestamp: Date.now()
        });
        
        return true;
        
    } catch (error) {
        console.error('Ошибка отклонения жалобы:', error);
        return false;
    }
}
