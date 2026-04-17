// API Configuration
const API_URL = 'https://qareeb-backend-ehvw.onrender.com/api';

// Global State
let selectedService = null;
let currentUser = null;
let currentCraftsmen = []; 
let userLocation = { lat: 34.7400, lng: 10.7600 }; // Default: Sfax

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
    '1': 'سباك',
    '2': 'كهربائي', 
    '3': 'تنظيف',
    '5': 'دهان',
    '6': 'نجارة',
    '7': 'تركيب',
    '8': 'بريكولاج'
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

// Check Auth State
function checkAuthState() {
    const token = localStorage.getItem('qareeb_token');
    const user = localStorage.getItem('qareeb_user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
    }
}

// Show/Hide Loading
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

// Show craftsman details
function showCraftsmanDetails(craftsmanId) {
    const craftsman = currentCraftsmen.find(c => c.id === craftsmanId);
    if (!craftsman) {
        alert('الحرفي غير موجود');
        return;
    }
    
    const serviceNames = { 
        '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
        '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
    };
    
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
            <button class="btn btn-secondary" onclick="showScreen('results')">
                ← رجوع للقائمة
            </button>
        </div>
    `;
    
    // إنشاء شاشة التفاصيل إذا لم تكن موجودة
    let detailsScreen = document.getElementById('detailsScreen');
    if (!detailsScreen) {
        detailsScreen = document.createElement('div');
        detailsScreen.id = 'detailsScreen';
        detailsScreen.className = 'screen';
        document.querySelector('.container').appendChild(detailsScreen);
    }
    
    // إنشاء محتوى التفاصيل
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
    // التحقق من تسجيل الدخول
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
    
    // طلب وصف المشكلة
    const description = prompt('📝 اكتب وصف المشكلة:\n(مثلاً: حنفية المطبخ تسرب ماء)');
    if (!description || description.trim() === '') {
        alert('يجب كتابة وصف للمشكلة');
        return;
    }
    
    showLoading(true);
    
    try {
        // 1. إنشاء الطلب في قاعدة البيانات
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
        
        // 2. فتح واتساب مع الحرفي
        const serviceNames = { 
            '1': 'سباك', '2': 'كهربائي', '3': 'تنظيف',
            '5': 'دهان', '6': 'نجارة', '7': 'تركيب', '8': 'بريكولاج'
        };
        
        const message = `مرحباً ${craftsman.name}،\n\nعندي مشكلة في ${serviceNames[selectedService] || 'الخدمة'}:\n${description}\n\nرقمي: ${currentUser.phone}\nالاسم: ${currentUser.name}\n\nمن تطبيق قريب - Qareeb 🛠️`;
        
        const whatsappUrl = `https://wa.me/216${craftsman.phone}?text=${encodeURIComponent(message)}`;
        
        // 3. تأكيد للمستخدم
        alert(`✅ تم إرسال طلبك إلى ${craftsman.name}!\nسيتم تحويلك إلى واتساب للتواصل المباشر.`);
        
        // 4. فتح واتساب
        window.open(whatsappUrl, '_blank');
        
        // 5. الرجوع للصفحة الرئيسية
        showScreen('home');
        
    } catch (error) {
        console.error('Order error:', error);
        alert('❌ خطأ في إرسال الطلب: ' + error.message);
    } finally {
        showLoading(false);
    }
}


