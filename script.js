// API Configuration
const API_URL = 'https://qareeb-backend-ehvw.onrender.com/api';

// Global State
let selectedService = null;
let currentUser = null;
let currentCraftsmen = []; 
let userLocation = { lat: 34.7400, lng: 10.7600 }; // Default: Sfax
let selectedRating = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkUserLocation();
    setupEventListeners();
    checkAuthState();
});

// Setup Event Listeners
function setupEventListeners() {
    // Service selection
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => selectService(card.dataset.service, card));
    });

    // Search button
    document.getElementById('searchBtn').addEventListener('click', searchCraftsmen);

    // Auth navigation
    document.getElementById('showLoginBtn').addEventListener('click', () => showScreen('login'));
    document.getElementById('showRegisterBtn').addEventListener('click', () => showScreen('register'));

    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => showScreen('home'));
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId + 'Screen').classList.add('active');
}

// Service Selection
function selectService(serviceId, element) {
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    selectedService = serviceId;
    document.getElementById('searchBtn').disabled = false;
}

// Get User Location
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

// Search Craftsmen
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

// Display Craftsmen
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
                <h3>${c.name || 'اسم غير معروف'} ${c.is_verified ? '✅' : ''}</h3>
                <p>
                    <span class="rating">⭐ ${c.rating || '0.0'}</span> · 
                    <span class="distance">📏 ${c.distance ? c.distance.toFixed(1) : '?'} كم</span>
                </p>
            </div>
            <div class="contact-buttons" onclick="event.stopPropagation()">
                <a href="https://wa.me/216${c.phone}" target="_blank" class="btn-whatsapp">💬 واتساب</a>
                <a href="tel:+216${c.phone}" class="btn-call">📞 اتصال</a>
            </div>
        </div>
    `).join('');
}

// Handle Login
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

// Handle Register
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

// Update UI after login/register
function updateUIAfterAuth() {
    if (currentUser) {
        document.getElementById('showLoginBtn').style.display = 'none';
        document.getElementById('showRegisterBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        
        if (currentUser.role === 'craftsman') {
            document.getElementById('dashboardLink').style.display = 'block';
        }
    }
}

// Logout
function logout() {
    localStorage.removeItem('qareeb_token');
    localStorage.removeItem('qareeb_user');
    currentUser = null;
    
    document.getElementById('showLoginBtn').style.display = 'inline-block';
    document.getElementById('showRegisterBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('dashboardLink').style.display = 'none';
    
    showScreen('home');
}

// Check Auth State
function checkAuthState() {
    const token = localStorage.getItem('qareeb_token');
    const user = localStorage.getItem('qareeb_user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUIAfterAuth();
    }
}

// Show/Hide Loading
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

// Show craftsman details
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
    
    // جلب التقييمات
    let reviewsHtml = '<p>⭐ لا توجد تقييمات بعد</p>';
    try {
        const reviewsResponse = await fetch(`${API_URL}/orders/reviews/craftsman/${craftsmanId}`);
        const reviews = await reviewsResponse.json();
        if (reviews.length > 0) {
            reviewsHtml = reviews.slice(0, 3).map(r => `
                <div class="review-item">
                    <p><strong>${r.user_name || 'مستخدم'}</strong> - ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</p>
                    <p>${r.comment || 'بدون تعليق'}</p>
                    <small>${new Date(r.created_at).toLocaleDateString('ar-TN')}</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
    
    const html = `
        <div class="craftsman-profile">
            <h2>${craftsman.name} ${craftsman.is_verified ? '✅' : ''}</h2>
            <p>📞 <a href="tel:+216${craftsman.phone}">${craftsman.phone}</a></p>
            <p>⭐ ${craftsman.rating || '0.0'} (${craftsman.total_ratings || 0} تقييم)</p>
            <p>📏 ${craftsman.distance?.toFixed(1) || '?'} كم عنك</p>
            <p>🔧 الخدمة: ${serviceNames[selectedService] || 'غير محدد'}</p>
            
            <button class="btn btn-primary" onclick="requestService(${craftsman.id})">
                🛠️ طلب الخدمة
            </button>
            
            <div class="reviews-section">
                <h3>⭐ التقييمات</h3>
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

// Request service from craftsman
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
        
        const message = `مرحباً ${craftsman.name}،\n\nعندي مشكلة في ${serviceNames[selectedService] || 'الخدمة'}:\n${description}\n\nرقمي: ${currentUser.phone}\nالاسم: ${currentUser.name}\n\nمن تطبيق قريب - Qareeb 🛠️`;
        
        const whatsappUrl = `https://wa.me/216${craftsman.phone}?text=${encodeURIComponent(message)}`;
        
        alert(`✅ تم إرسال طلبك إلى ${craftsman.name}!\nسيتم تحويلك إلى واتساب للتواصل المباشر.`);
        
        window.open(whatsappUrl, '_blank');
        
        // عرض شاشة التقييم بعد الطلب
        setTimeout(() => {
            if (confirm('هل تريد تقييم الخدمة الآن؟')) {
                showRatingScreen(orderData.order.id, craftsman.name);
            } else {
                showScreen('home');
            }
        }, 1000);
        
    } catch (error) {
        console.error('Order error:', error);
        alert('❌ خطأ في إرسال الطلب: ' + error.message);
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
            alert('✅ شكراً لتقييمك!');
            showScreen('home');
        } else {
            alert(data.error || 'خطأ في إرسال التقييم');
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
            // تحديد التبويب النشط
            const activeTab = document.querySelector('#dashboardTabs button:focus') || 
                             document.querySelector('#dashboardTabs button');
            let currentStatus = 'pending';
            if (activeTab) {
                if (activeTab.textContent.includes('مقبولة')) currentStatus = 'accepted';
                else if (activeTab.textContent.includes('منتهية')) currentStatus = 'done';
            }
            
            // إذا قبل الطلب، نعرض تبويب المقبولة
            if (status === 'accepted') {
                loadOrders('accepted');
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