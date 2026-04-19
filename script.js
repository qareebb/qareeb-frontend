// ==========================================
// Click Tracking System (Google Sheet)
// ==========================================

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRRm5VT_mr6z8SPQ_iuR0dvmUMx5mjW5W8oeKSkOW4EQndqOwJJ0ugwyLMcFffTXbEuQ/exec';

async function trackClick(craftsmanId, craftsmanName, action) {
    // تسجيل في console
    console.log(`📊 CLICK TRACKED | Time: ${new Date().toLocaleTimeString()} | ID: ${craftsmanId} | Name: ${craftsmanName} | Action: ${action} | Service: ${getServiceName(selectedService)}`);
    
    // إرسال إلى Google Sheet
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                craftsman_id: craftsmanId,
                craftsman_name: craftsmanName,
                service_type: getServiceName(selectedService),
                action: action
            })
        });
        console.log(`📤 Sent to Google Sheet`);
    } catch (error) {
        console.warn('Google Sheet error (non-critical):', error);
    }
    
    // نسخ احتياطي للصق اليدوي
    const logEntry = `${new Date().toLocaleString()}\t${craftsmanId}\t${craftsmanName}\t${getServiceName(selectedService)}\t${action}`;
    console.log(`📋 COPY TO SHEET (backup): ${logEntry}`);
}

function getServiceName(serviceId) {
    const serviceNames = { 
        '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
        '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
    };
    return serviceNames[serviceId] || 'غير محدد';
}

// ==========================================
// API Configuration
// ==========================================

const API_URL = 'https://qareeb-backend-ehvw.onrender.com/api';

// ==========================================
// Global State
// ==========================================

let selectedService = null;
let currentUser = null;
let currentCraftsmen = []; 
let userLocation = { lat: 34.7400, lng: 10.7600 };
let selectedRating = 0;
let currentResetPhone = '';

// ==========================================
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    checkUserLocation();
    setupEventListeners();
    checkAuthState();
    
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
    document.getElementById('verifyCodeForm')?.addEventListener('submit', handleVerifyCode);
    document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);
});

// ==========================================
// Setup Event Listeners
// ==========================================

function setupEventListeners() {
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => selectService(card.dataset.service, card));
    });

    document.getElementById('searchBtn').addEventListener('click', searchCraftsmen);
    document.getElementById('showLoginBtn').addEventListener('click', () => showScreen('login'));
    document.getElementById('showRegisterBtn').addEventListener('click', () => showScreen('register'));
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('backBtn').addEventListener('click', () => showScreen('home'));
}

// ==========================================
// Screen Navigation
// ==========================================

function showScreen(screenId) {
    if (screenId === 'home') {
        const returnTo = localStorage.getItem('returnTo');
        if (returnTo === 'dashboard' && currentUser && currentUser.role === 'craftsman') {
            localStorage.removeItem('returnTo');
            showDashboard();
            return;
        }
    }
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId + 'Screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// ==========================================
// Service Selection
// ==========================================

function selectService(serviceId, element) {
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    selectedService = serviceId;
    document.getElementById('searchBtn').disabled = false;
}

// ==========================================
// Get User Location
// ==========================================

function checkUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('locationText').textContent = '📍 موقعك الحالي';
            },
            () => {
                document.getElementById('locationText').textContent = '📍 صفاقس، المدينة';
            }
        );
    } else {
        document.getElementById('locationText').textContent = '📍 صفاقس، المدينة';
    }
}

// ==========================================
// Get Badge Display
// ==========================================

function getBadgeDisplay(badge, score) {
    const badges = {
        '💎 خبير': { icon: '💎', color: '#8B5CF6', bg: '#EDE9FE', label: 'خبير' },
        '👑 محترف': { icon: '👑', color: '#F59E0B', bg: '#FEF3C7', label: 'محترف' },
        '⭐ موثوق': { icon: '⭐', color: '#3B82F6', bg: '#DBEAFE', label: 'موثوق' },
        'عادي': { icon: '🆕', color: '#6B7280', bg: '#F3F4F6', label: 'عادي' }
    };
    
    const badgeInfo = badges[badge] || badges['عادي'];
    
    return `
        <span class="craftsman-badge" style="background: ${badgeInfo.bg}; color: ${badgeInfo.color}; padding: 4px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; margin-right: 8px; display: inline-block;">
            ${badgeInfo.icon} ${badgeInfo.label} • ${score || 0}
        </span>
    `;
}

// ==========================================
// Search Craftsmen
// ==========================================

async function searchCraftsmen() {
    if (!selectedService) return;

    showLoading(true);
    
    try {
        const url = `${API_URL}/craftsmen/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&service_id=${selectedService}&radius=10`;
        console.log('Searching:', url);
        
        const response = await fetch(url);
        const craftsmen = await response.json();

        currentCraftsmen = craftsmen;
        console.log('Found craftsmen:', craftsmen);
        
        displayCraftsmen(craftsmen, selectedService);
        showScreen('results');
        
    } catch (error) {
        console.error('Error:', error);
        alert('خطأ في البحث عن حرفيين. تأكد أن السيرفر شغال.');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Display Craftsmen
// ==========================================

function displayCraftsmen(craftsmen, serviceId) {
    const serviceNames = { 
        '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
        '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
    };
    document.getElementById('resultsTitle').textContent = `🔧 ${serviceNames[serviceId]} - الأقرب ليك`;
    
    const container = document.getElementById('craftsmenList');
    
    if (!craftsmen || craftsmen.length === 0) {
        container.innerHTML = '<div class="empty-state">😕 ما ثمش حرفي متوفر حالياً</div>';
        return;
    }
    
    container.innerHTML = craftsmen.map(c => `
        <div class="craftsman-card" onclick="showCraftsmanDetails(${c.id})" style="cursor: pointer;">
            <div class="craftsman-info">
                <h3>
                    ${c.name || 'اسم غير معروف'} 
                    ${c.is_verified ? '✅' : ''}
                </h3>
                <div style="margin: 5px 0;">
                    ${getBadgeDisplay(c.badge || 'عادي', c.score || 0)}
                </div>
                <p>
                    <span class="rating">⭐ ${c.rating || '0.0'}</span> · 
                    <span class="distance">📏 ${c.distance ? c.distance.toFixed(1) : '?'} كم</span>
                </p>
            </div>
            <div class="contact-buttons" onclick="event.stopPropagation()">
                <a href="https://wa.me/216${c.phone}" 
                   target="_blank" 
                   class="btn-whatsapp"
                   onclick="trackClick(${c.id}, '${c.name}', 'whatsapp_click')">💬 واتساب</a>
                <a href="tel:+216${c.phone}" 
                   class="btn-call"
                   onclick="trackClick(${c.id}, '${c.name}', 'call_click')">📞 اتصال</a>
            </div>
        </div>
    `).join('');
}

// ==========================================
// Handle Login
// ==========================================

async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('qareeb_token', data.token);
            localStorage.setItem('qareeb_user', JSON.stringify(data.user));
            
            updateUIAfterAuth();
            
            alert(`مرحباً ${data.user.name}!`);
            showScreen('home');
            document.getElementById('loginForm').reset();
        } else {
            alert(data.error || 'خطأ في تسجيل الدخول. تأكد من رقم الهاتف وكلمة المرور.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Handle Register
// ==========================================

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    
    console.log('Registering:', { name, phone, role });
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('qareeb_token', data.token);
            localStorage.setItem('qareeb_user', JSON.stringify(data.user));
            
            updateUIAfterAuth();
            
            alert(`تم إنشاء الحساب بنجاح! مرحباً ${data.user.name}`);
            showScreen('home');
            document.getElementById('registerForm').reset();
        } else {
            alert(data.error || 'خطأ في إنشاء الحساب. الرقم قد يكون مستخدم مسبقاً.');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Update UI After Auth
// ==========================================

function updateUIAfterAuth() {
    if (currentUser) {
        document.getElementById('showLoginBtn').style.display = 'none';
        document.getElementById('showRegisterBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        
        const myOrdersBtn = document.getElementById('myOrdersBtn');
        if (myOrdersBtn) {
            myOrdersBtn.style.display = 'inline-block';
        }
        
        if (currentUser.role === 'craftsman') {
            const dashboardLink = document.getElementById('dashboardLink');
            if (dashboardLink) {
                dashboardLink.style.display = 'block';
            }
        }
    }
}

// ==========================================
// Logout
// ==========================================

function logout() {
    localStorage.removeItem('qareeb_token');
    localStorage.removeItem('qareeb_user');
    currentUser = null;
    
    document.getElementById('showLoginBtn').style.display = 'inline-block';
    document.getElementById('showRegisterBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
    
    const profileLinks = document.getElementById('profileLinks');
    if (profileLinks) {
        profileLinks.style.display = 'none';
    }
    
    const myOrdersBtn = document.getElementById('myOrdersBtn');
    if (myOrdersBtn) {
        myOrdersBtn.style.display = 'none';
    }
    
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink) {
        dashboardLink.style.display = 'none';
    }
    
    showScreen('home');
}

// ==========================================
// Check Auth State
// ==========================================

function checkAuthState() {
    const token = localStorage.getItem('qareeb_token');
    const user = localStorage.getItem('qareeb_user');
    
    if (token && user) {
        try {
            currentUser = JSON.parse(user);
            updateUIAfterAuth();
        } catch (e) {
            console.error('Error parsing user:', e);
            localStorage.removeItem('qareeb_token');
            localStorage.removeItem('qareeb_user');
        }
    }
}

// ==========================================
// Show/Hide Loading
// ==========================================

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

// ==========================================
// Show Craftsman Details
// ==========================================

async function showCraftsmanDetails(craftsmanId) {
    const craftsman = currentCraftsmen.find(c => c.id === craftsmanId);
    if (!craftsman) {
        alert('الحرفي غير موجود');
        return;
    }
    
    const serviceNames = { 
        '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
        '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
    };
    
    let reviewsHtml = '<p>⭐ لا توجد تقييمات بعد</p>';
    try {
        const reviewsResponse = await fetch(`${API_URL}/orders/reviews/craftsman/${craftsmanId}`);
        if (reviewsResponse.ok) {
            const reviews = await reviewsResponse.json();
            if (reviews.length > 0) {
                reviewsHtml = reviews.slice(0, 5).map(r => `
                    <div class="review-item">
                        <p><strong>${r.user_name || 'مستخدم'}</strong> - ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</p>
                        <p>${r.comment || 'بدون تعليق'}</p>
                        <small>${new Date(r.created_at).toLocaleDateString('ar-TN')}</small>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
    
    const html = `
        <div class="craftsman-profile">
            <h2>${craftsman.name} ${craftsman.is_verified ? '✅' : ''}</h2>
            <div style="margin: 10px 0;">
                ${getBadgeDisplay(craftsman.badge || 'عادي', craftsman.score || 0)}
            </div>
            <p>📞 <a href="tel:+216${craftsman.phone}" onclick="trackClick(${craftsman.id}, '${craftsman.name}', 'call_click_details')">${craftsman.phone}</a></p>
            <p>⭐ ${craftsman.rating || '0.0'} (${craftsman.total_ratings || 0} تقييم)</p>
            <p>📏 ${craftsman.distance?.toFixed(1) || '?'} كم عنك</p>
            <p>🔧 الخدمة: ${serviceNames[selectedService] || 'غير محدد'}</p>
            
            <button class="btn btn-primary" onclick="requestService(${craftsman.id})">
                🛠️ طلب الخدمة
            </button>
            
            <div class="reviews-section">
                <h3>⭐ التقييمات الأخيرة</h3>
                ${reviewsHtml}
            </div>
            
            <button class="btn btn-secondary" onclick="showScreen('results')">
                ← رجوع للقائمة
            </button>
        </div>
    `;
    
    let detailsScreen = document.getElementById('detailsScreen');
    if (!detailsScreen) {
        detailsScreen = document.createElement('div');
        detailsScreen.id = 'detailsScreen';
        detailsScreen.className = 'screen';
        document.querySelector('.container').appendChild(detailsScreen);
    }
    
    let detailsContent = document.getElementById('detailsContent');
    if (!detailsContent) {
        detailsContent = document.createElement('div');
        detailsContent.id = 'detailsContent';
        detailsScreen.appendChild(detailsContent);
    }
    
    detailsContent.innerHTML = html;
    showScreen('details');
}

// ==========================================
// Request Service
// ==========================================

async function requestService(craftsmanId) {
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً لطلب الخدمة');
        showScreen('login');
        return;
    }
    
    if (!selectedService) {
        alert('الرجاء اختيار خدمة أولاً');
        return;
    }
    
    const craftsman = currentCraftsmen.find(c => c.id === craftsmanId);
    if (!craftsman) {
        alert('الحرفي غير موجود');
        return;
    }
    
    trackClick(craftsmanId, craftsman.name, 'service_requested');
    
    const description = prompt('📝 اكتب وصف المشكلة:\n(مثلاً: حنفية المطبخ تسرب ماء)');
    if (!description || description.trim() === '') {
        alert('يجب كتابة وصف للمشكلة');
        return;
    }
    
    showLoading(true);
    
    try {
        const orderResponse = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                service_id: selectedService,
                craftsman_id: craftsmanId,
                lat: userLocation.lat,
                lng: userLocation.lng,
                address_text: description
            })
        });
        
        const orderData = await orderResponse.json();
        
        if (!orderResponse.ok) {
            throw new Error(orderData.error || 'فشل إنشاء الطلب');
        }
        
        const serviceNames = { 
            '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
            '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
        };
        
        const message = `مرحباً ${craftsman.name}،\n\nعندي مشكلة في ${serviceNames[selectedService] || 'الخدمة'}:\n${description}\n\nرقمي: ${currentUser.phone}\nالاسم: ${currentUser.name}\n\nرقم الطلب: #${orderData.order.id}\n\nمن تطبيق قريب - Qareeb 🛠️`;
        
        const whatsappUrl = `https://wa.me/216${craftsman.phone}?text=${encodeURIComponent(message)}`;
        
        alert(`✅ تم إرسال طلبك إلى ${craftsman.name}!\n\nرقم الطلب: ${orderData.order.id}\nيمكنك متابعة حالة طلبك من صفحة "طلباتي".\nبعد إتمام الخدمة، ستتمكن من تقييم الحرفي.`);
        
        window.open(whatsappUrl, '_blank');
        showScreen('home');
        
    } catch (error) {
        console.error('Order error:', error);
        alert('❌ خطأ في إرسال الطلب: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Top Craftsmen Functions
// ==========================================

async function showTopCraftsmen() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/craftsmen/top?limit=10`);
        const topCraftsmen = await response.json();
        
        currentCraftsmen = topCraftsmen;
        
        let topScreen = document.getElementById('topScreen');
        if (!topScreen) {
            topScreen = document.createElement('div');
            topScreen.id = 'topScreen';
            topScreen.className = 'screen';
            document.querySelector('.container').appendChild(topScreen);
            
            const backBtn = document.createElement('button');
            backBtn.className = 'btn-back';
            backBtn.onclick = () => showScreen('home');
            backBtn.textContent = '← رجوع';
            topScreen.appendChild(backBtn);
            
            const title = document.createElement('h2');
            title.textContent = '🏆 أفضل الحرفيين';
            title.style.textAlign = 'center';
            title.style.marginBottom = '20px';
            topScreen.appendChild(title);
            
            const listDiv = document.createElement('div');
            listDiv.id = 'topCraftsmenList';
            listDiv.className = 'craftsmen-list';
            topScreen.appendChild(listDiv);
        }
        
        const container = document.getElementById('topCraftsmenList');
        
        if (!topCraftsmen || topCraftsmen.length === 0) {
            container.innerHTML = '<div class="empty-state">😕 لا يوجد حرفيين حالياً</div>';
        } else {
            container.innerHTML = topCraftsmen.map((c, index) => `
                <div class="craftsman-card" onclick="showTopCraftsmanDetails(${c.id})" style="cursor: pointer;">
                    <div class="craftsman-info">
                        <h3>
                            ${index + 1}. ${c.name || 'اسم غير معروف'} 
                            ${c.is_verified ? '✅' : ''}
                        </h3>
                        <div style="margin: 5px 0;">
                            ${getBadgeDisplay(c.badge || 'عادي', c.score || 0)}
                        </div>
                        <p>
                            <span class="rating">⭐ ${c.rating || '0.0'}</span> · 
                            <span>🏆 Score: ${c.score || 0}</span>
                        </p>
                    </div>
                    <div class="contact-buttons" onclick="event.stopPropagation()">
                        <a href="https://wa.me/216${c.phone}" target="_blank" class="btn-whatsapp" onclick="trackClick(${c.id}, '${c.name}', 'whatsapp_click')">💬 واتساب</a>
                        <a href="tel:+216${c.phone}" class="btn-call" onclick="trackClick(${c.id}, '${c.name}', 'call_click')">📞 اتصال</a>
                    </div>
                </div>
            `).join('');
        }
        
        showScreen('top');
        
    } catch (error) {
        console.error('Top craftsmen error:', error);
        alert('خطأ في تحميل أفضل الحرفيين');
    } finally {
        showLoading(false);
    }
}

async function showTopCraftsmanDetails(craftsmanId) {
    const craftsman = currentCraftsmen.find(c => c.id === craftsmanId);
    if (craftsman) {
        selectedService = craftsman.service_id || 1;
        showCraftsmanDetails(craftsmanId);
    }
}

// ==========================================
// My Orders Functions
// ==========================================

async function showMyOrders() {
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        showScreen('login');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/orders/user/${currentUser.id}`);
        const orders = await response.json();
        
        const serviceNames = { 
            '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
            '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
        };
        
        const statusNames = {
            'pending': '⏳ قيد الانتظار',
            'accepted': '✅ مقبول',
            'on_the_way': '🚗 في الطريق',
            'done': '✔️ منتهي',
            'cancelled': '❌ ملغي'
        };
        
        let myOrdersScreen = document.getElementById('myOrdersScreen');
        if (!myOrdersScreen) {
            myOrdersScreen = document.createElement('div');
            myOrdersScreen.id = 'myOrdersScreen';
            myOrdersScreen.className = 'screen';
            document.querySelector('.container').appendChild(myOrdersScreen);
            
            const backBtn = document.createElement('button');
            backBtn.className = 'btn-back';
            backBtn.onclick = () => showScreen('home');
            backBtn.textContent = '← رجوع';
            myOrdersScreen.appendChild(backBtn);
            
            const title = document.createElement('h2');
            title.textContent = '📋 طلباتي';
            myOrdersScreen.appendChild(title);
            
            const listDiv = document.createElement('div');
            listDiv.id = 'myOrdersList';
            myOrdersScreen.appendChild(listDiv);
        }
        
        const listContainer = document.getElementById('myOrdersList');
        
        const html = orders.length === 0 ? 
            '<p class="empty-state">😕 لا توجد طلبات حالياً</p>' :
            orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-status">${statusNames[order.status] || order.status}</span>
                        <span class="order-date">${new Date(order.created_at).toLocaleDateString('ar-TN')}</span>
                    </div>
                    <p><strong>🔧 الخدمة:</strong> ${serviceNames[order.service_id] || 'غير محدد'}</p>
                    <p><strong>👷 الحرفي:</strong> ${order.craftsman_name || 'لم يتم التعيين بعد'}</p>
                    <p><strong>📝 المشكلة:</strong> ${order.address_text}</p>
                    <p><strong>📅 رقم الطلب:</strong> #${order.id}</p>
                    
                    ${order.status === 'done' && !order.has_review ? `
                        <div class="order-actions">
                            <button class="btn-success" onclick="showRatingScreen(${order.id}, '${order.craftsman_name || 'الحرفي'}')">
                                ⭐ تقييم الخدمة
                            </button>
                        </div>
                    ` : ''}
                    
                    ${order.status === 'done' && order.has_review ? `
                        <p class="text-success" style="color: #10b981; font-weight: bold;">✅ تم التقييم - شكراً لك!</p>
                    ` : ''}
                    
                    ${order.status === 'accepted' ? `
                        <div class="order-actions">
                            <p><strong>📞 رقم الحرفي:</strong> ${order.craftsman_phone || ''}</p>
                            <a href="https://wa.me/216${order.craftsman_phone || ''}" target="_blank" class="btn-whatsapp">💬 تواصل مع الحرفي</a>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        
        listContainer.innerHTML = html;
        showScreen('myOrders');
        
    } catch (error) {
        console.error('My orders error:', error);
        alert('خطأ في تحميل الطلبات');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Rating Functions
// ==========================================

function showRatingScreen(orderId, craftsmanName) {
    const html = `
        <div class="rating-container">
            <h3>${craftsmanName}</h3>
            <p>كيف كانت تجربتك؟</p>
            <div class="stars-container">
                ${[1,2,3,4,5].map(i => `
                    <span class="star" onclick="setRating(${i})" id="star${i}">☆</span>
                `).join('')}
            </div>
            <textarea id="reviewComment" placeholder="تعليقك (اختياري)" rows="3"></textarea>
            <button class="btn btn-primary" onclick="submitReview(${orderId})">📤 إرسال التقييم</button>
        </div>
    `;
    
    let ratingScreen = document.getElementById('ratingScreen');
    if (!ratingScreen) {
        ratingScreen = document.createElement('div');
        ratingScreen.id = 'ratingScreen';
        ratingScreen.className = 'screen';
        document.querySelector('.container').appendChild(ratingScreen);
        
        const backBtn = document.createElement('button');
        backBtn.className = 'btn-back';
        backBtn.onclick = () => showScreen('myOrders');
        backBtn.textContent = '← رجوع';
        ratingScreen.appendChild(backBtn);
        
        const title = document.createElement('h2');
        title.textContent = '⭐ تقييم الخدمة';
        ratingScreen.appendChild(title);
        
        const contentDiv = document.createElement('div');
        contentDiv.id = 'ratingContent';
        ratingScreen.appendChild(contentDiv);
    }
    
    document.getElementById('ratingContent').innerHTML = html;
    showScreen('rating');
}

function setRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('.star').forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
    });
}

async function submitReview(orderId) {
    if (selectedRating === 0) {
        alert('الرجاء اختيار تقييم');
        return;
    }
    
    const comment = document.getElementById('reviewComment')?.value || '';
    const token = localStorage.getItem('qareeb_token');
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/orders/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                order_id: orderId,
                rating: selectedRating,
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ شكراً لتقييمك!\n\nتقييمك يساعد الآخرين في اختيار أفضل حرفي.\n\nالحرفي الآن حصل على:\n⭐ Score: ${data.score || 0}\n${data.badge || 'عادي'}`);
            selectedRating = 0;
            showMyOrders();
        } else {
            alert(data.error || 'لا يمكن التقييم الآن. تأكد أن الطلب منتهي.');
        }
    } catch (error) {
        console.error('Review error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Craftsman Dashboard Functions
// ==========================================

function showDashboard() {
    if (!currentUser || currentUser.role !== 'craftsman') {
        alert('هذه الصفحة للحرفيين فقط');
        return;
    }
    showScreen('dashboard');
    loadOrders('pending');
}

async function loadOrders(status) {
    const token = localStorage.getItem('qareeb_token');
    
    if (!token) {
        alert('يجب تسجيل الدخول أولاً');
        showScreen('login');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/orders/craftsman`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('فشل تحميل الطلبات');
        }
        
        const orders = await response.json();
        const filtered = orders.filter(o => o.status === status);
        
        const serviceNames = { 
            '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
            '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
        };
        
        const statusNames = {
            'pending': '⏳ قيد الانتظار',
            'accepted': '✅ مقبول',
            'done': '✔️ منتهي',
            'cancelled': '❌ ملغي'
        };
        
        const html = filtered.length === 0 ? 
            '<p class="empty-state">😕 لا توجد طلبات حالياً</p>' :
            filtered.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-status">${statusNames[order.status] || order.status}</span>
                        <span class="order-date">${new Date(order.created_at).toLocaleDateString('ar-TN')}</span>
                    </div>
                    <p><strong>👤 العميل:</strong> ${order.user_name || 'غير معروف'}</p>
                    <p><strong>📞 الهاتف:</strong> <a href="tel:+216${order.user_phone}">${order.user_phone}</a></p>
                    <p><strong>🔧 الخدمة:</strong> ${serviceNames[order.service_id] || 'غير محدد'}</p>
                    <p><strong>📝 المشكلة:</strong> ${order.address_text}</p>
                    
                    ${status === 'pending' ? `
                        <div class="order-actions">
                            <button class="btn-success" onclick="updateOrderStatus(${order.id}, 'accepted')">✅ قبول الطلب</button>
                            <button class="btn-danger" onclick="updateOrderStatus(${order.id}, 'cancelled')">❌ رفض الطلب</button>
                        </div>
                    ` : ''}
                    
                    ${status === 'accepted' ? `
                        <div class="order-actions">
                            <button class="btn-success" onclick="updateOrderStatus(${order.id}, 'done')">✔️ تم الإنهاء</button>
                            <a href="https://wa.me/216${order.user_phone}" target="_blank" class="btn-whatsapp">💬 واتساب</a>
                        </div>
                    ` : ''}
                    
                    ${status === 'done' && !order.has_customer_review ? `
                        <div class="order-actions">
                            <button class="btn-warning" onclick="showCustomerRatingScreen(${order.id}, '${order.user_name || 'العميل'}')">
                                ⭐ تقييم العميل
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        
        document.getElementById('dashboardOrders').innerHTML = html;
        
    } catch (error) {
        console.error('Dashboard error:', error);
        alert('خطأ في تحميل الطلبات');
    } finally {
        showLoading(false);
    }
}

async function updateOrderStatus(orderId, status) {
    const token = localStorage.getItem('qareeb_token');
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            const activeTab = document.querySelector('#dashboardTabs button:focus') || 
                             document.querySelector('#dashboardTabs button');
            let currentStatus = 'pending';
            if (activeTab) {
                if (activeTab.textContent.includes('مقبولة')) currentStatus = 'accepted';
                else if (activeTab.textContent.includes('منتهية')) currentStatus = 'done';
            }
            
            if (status === 'accepted') {
                loadOrders('accepted');
            } else if (status === 'done') {
                loadOrders('done');
            } else {
                loadOrders(currentStatus);
            }
        } else {
            alert('خطأ في تحديث حالة الطلب');
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Customer Rating Functions
// ==========================================

let selectedCustomerRating = 0;

function showCustomerRatingScreen(orderId, customerName) {
    const html = `
        <div class="rating-container">
            <h3>تقييم العميل: ${customerName}</h3>
            <p>كيف كان تعامل العميل؟</p>
            <div class="stars-container">
                ${[1,2,3,4,5].map(i => `
                    <span class="star" onclick="setCustomerRating(${i})" id="customerStar${i}">☆</span>
                `).join('')}
            </div>
            <textarea id="customerReviewComment" placeholder="تعليقك (اختياري)" rows="3"></textarea>
            <button class="btn btn-primary" onclick="submitCustomerReview(${orderId})">📤 إرسال التقييم</button>
        </div>
    `;
    
    let ratingScreen = document.getElementById('customerRatingScreen');
    if (!ratingScreen) {
        ratingScreen = document.createElement('div');
        ratingScreen.id = 'customerRatingScreen';
        ratingScreen.className = 'screen';
        document.querySelector('.container').appendChild(ratingScreen);
        
        const backBtn = document.createElement('button');
        backBtn.className = 'btn-back';
        backBtn.onclick = () => showDashboard();
        backBtn.textContent = '← رجوع';
        ratingScreen.appendChild(backBtn);
        
        const title = document.createElement('h2');
        title.textContent = '⭐ تقييم العميل';
        ratingScreen.appendChild(title);
        
        const contentDiv = document.createElement('div');
        contentDiv.id = 'customerRatingContent';
        ratingScreen.appendChild(contentDiv);
    }
    
    document.getElementById('customerRatingContent').innerHTML = html;
    showScreen('customerRating');
}

function setCustomerRating(rating) {
    selectedCustomerRating = rating;
    document.querySelectorAll('#customerRatingContent .star').forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
    });
}

async function submitCustomerReview(orderId) {
    if (selectedCustomerRating === 0) {
        alert('الرجاء اختيار تقييم');
        return;
    }
    
    const comment = document.getElementById('customerReviewComment')?.value || '';
    const token = localStorage.getItem('qareeb_token');
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/orders/customer-review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                order_id: orderId,
                rating: selectedCustomerRating,
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ تم تقييم العميل بنجاح!\n\nالعميل حصل على:\n⭐ Score: ${data.customer_score || 0}\n${data.customer_badge || 'عادي'}`);
            selectedCustomerRating = 0;
            showDashboard();
            loadOrders('done');
        } else {
            alert(data.error || 'خطأ في إرسال التقييم');
        }
    } catch (error) {
        console.error('Customer review error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Forgot Password Functions
// ==========================================

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const phone = document.getElementById('forgotPhone').value;
    currentResetPhone = phone;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('📱 تم إرسال رمز التحقق: ' + (data.debug_code || 'تحقق من هاتفك'));
            document.getElementById('forgotPasswordForm').reset();
            showScreen('verifyCode');
        } else {
            alert(data.error || 'رقم الهاتف غير موجود');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

async function handleVerifyCode(e) {
    e.preventDefault();
    
    const code = document.getElementById('verificationCode').value.trim();
    const newPassword = document.getElementById('resetNewPassword').value.trim();
    const confirmPassword = document.getElementById('resetConfirmPassword').value.trim();
    
    if (newPassword !== confirmPassword) {
        alert('كلمة المرور غير متطابقة');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: currentResetPhone,
                code: code,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
            document.getElementById('verifyCodeForm').reset();
            showScreen('login');
        } else {
            alert(data.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// Change Password Functions
// ==========================================

function showChangePasswordScreen() {
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        showScreen('login');
        return;
    }
    showScreen('changePassword');
}

async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    console.log('Current:', currentPassword);
    console.log('New:', newPassword);
    console.log('Confirm:', confirmPassword);
    
    if (newPassword !== confirmPassword) {
        alert('كلمة المرور الجديدة غير متطابقة');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    const token = localStorage.getItem('qareeb_token');
    
    if (!token) {
        alert('يجب تسجيل الدخول أولاً');
        showScreen('login');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ تم تغيير كلمة المرور بنجاح!');
            document.getElementById('changePasswordForm').reset();
            
            const returnTo = localStorage.getItem('returnTo');
            if (returnTo === 'dashboard') {
                localStorage.removeItem('returnTo');
                showDashboard();
            } else {
                showScreen('home');
            }
        } else {
            alert(data.error || 'خطأ في تغيير كلمة المرور. تأكد من كلمة المرور الحالية.');
        }
    } catch (error) {
        console.error('Change password error:', error);
        alert('خطأ في الاتصال بالسيرفر');
    } finally {
        showLoading(false);
    }
}

function showChangePasswordFromDashboard() {
    localStorage.setItem('returnTo', 'dashboard');
    showScreen('changePassword');
}