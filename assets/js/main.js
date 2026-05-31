// ===================== إعدادات Firebase =====================
const firebaseConfig = {
    apiKey: "AIzaSyD6CcJDUiXgCQxe_aL_j2aEi1nuQ2X2o5s",
    authDomain: "enath-7d5e8.firebaseapp.com",
    databaseURL: "https://enath-7d5e8-default-rtdb.firebaseio.com",
    projectId: "enath-7d5e8",
    storageBucket: "enath-7d5e8.firebasestorage.app",
    messagingSenderId: "101026768739",
    appId: "1:101026768739:web:c3635b04e972914a5b1556"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let categories = [];
let products = [];
let ads = [];
let currentProduct = null;
let currentAdIndex = 0;
let autoSlideInterval = null;

function generateTempCode() { return 'ROY' + Math.random().toString(36).substring(2, 10).toUpperCase(); }

// إشعار صغير
function showToast(message, isError = false) {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isError ? '#D58B9A' : '#A8E6CF'};
            color: ${isError ? 'white' : '#1B4332'};
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 0.85rem;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            font-family: 'Tajawal', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.background = isError ? '#D58B9A' : '#A8E6CF';
    toast.style.color = isError ? 'white' : '#1B4332';
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

async function loadData() {
    showLoading();
    try {
        const [catSnap, prodSnap, adsSnap] = await Promise.all([
            database.ref('categories').once('value'),
            database.ref('products').once('value'),
            database.ref('ads').once('value')
        ]);
        categories = catSnap.val() ? Object.keys(catSnap.val()).map(key => ({ id: key, ...catSnap.val()[key] })) : [];
        products = prodSnap.val() ? Object.keys(prodSnap.val()).map(key => ({ id: key, ...prodSnap.val()[key] })) : [];
        ads = adsSnap.val() ? Object.keys(adsSnap.val()).map(key => ({ id: key, ...adsSnap.val()[key] })) : [];
        if (categories.length === 0) {
            categories = [
                { id: "cat1", name: "إكسسوارات", image: "https://cdn-icons-png.flaticon.com/512/1077/1077035.png", active: true, order: 0 },
                { id: "cat2", name: "عطور", image: "https://cdn-icons-png.flaticon.com/512/1923/1923745.png", active: true, order: 1 },
                { id: "cat3", name: "حقائب", image: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png", active: true, order: 2 },
                { id: "cat4", name: "أحذية", image: "https://cdn-icons-png.flaticon.com/512/3114/3114886.png", active: true, order: 3 },
                { id: "cat5", name: "ملابس", image: "https://cdn-icons-png.flaticon.com/512/775/775926.png", active: true, order: 4 },
                { id: "cat6", name: "مكياج", image: "https://cdn-icons-png.flaticon.com/512/3014/3014582.png", active: true, order: 5 },
                { id: "cat7", name: "مجوهرات", image: "https://cdn-icons-png.flaticon.com/512/3657/3657297.png", active: true, order: 6 },
                { id: "cat8", name: "ساعات", image: "https://cdn-icons-png.flaticon.com/512/4836/4836642.png", active: true, order: 7 },
                { id: "cat9", name: "عناية", image: "https://cdn-icons-png.flaticon.com/512/2938/2938253.png", active: true, order: 8 },
                { id: "cat10", name: "حسومات", image: "https://cdn-icons-png.flaticon.com/512/2838/2838912.png", active: true, order: 9 }
            ];
            await saveCategories();
        }
        renderCategories();
        renderAds();
        renderRandomProducts();
        hideLoading();
    } catch (err) { console.error(err); alert("خطأ في تحميل البيانات"); hideLoading(); }
}

async function saveCategories() {
    const obj = {};
    categories.forEach(c => { obj[c.id] = { name: c.name, image: c.image, active: c.active, order: c.order !== undefined ? c.order : 0 }; });
    await database.ref('categories').set(obj);
}

function renderRandomProducts() {
    const container = document.getElementById('randomProducts');
    if (!container) return;
    const activeProducts = products.filter(p => p.active);
    if (activeProducts.length === 0) return;
    const shuffled = [...activeProducts].sort(() => 0.5 - Math.random());
    const randomItems = shuffled.slice(0, 10);
    container.innerHTML = randomItems.map(p => `
        <div class="product-card" data-product-id="${p.id}">
            <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/300x500?text=صورة+غير+متوفرة'">
            <div class="product-info">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div><span class="product-price">${p.price}$ </span>${p.oldprice ? `<span class="product-oldprice">${p.oldprice}$ </span>` : ''}</div>
                <div class="product-code-badge">رمز: ${p.code || generateTempCode()}</div>
            </div>
        </div>
    `).join('');
    attachCardEvents(container);
}

function renderCategories() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    const activeCats = categories.filter(c => c.active);
    // ترتيب حسب order (0-based) تصاعدياً
    const sorted = [...activeCats].sort((a,b) => (a.order || 0) - (b.order || 0));
    if (sorted.length === 0) { container.innerHTML = '<div style="text-align:center; padding:20px;">لا توجد فئات</div>'; return; }
    container.innerHTML = sorted.map(cat => `
        <div class="category-card" data-category-id="${cat.id}">
            <img src="${cat.image}" alt="${cat.name}">
            <h4>${escapeHtml(cat.name)}</h4>
        </div>
    `).join('');
    document.querySelectorAll('.category-card').forEach(card => { card.onclick = () => showProductsByCategory(card.dataset.categoryId); });
}

function showProductsByCategory(catId) {
    const category = categories.find(c => c.id === catId);
    const catProducts = products.filter(p => p.categoryId === catId && p.active);
    const title = document.getElementById('selectedCategoryTitle');
    const scrollDiv = document.getElementById('productsScroll');
    title.innerHTML = category ? category.name : 'منتجات';
    if (catProducts.length === 0) { scrollDiv.innerHTML = '<div style="padding:20px; text-align:center;">لا توجد منتجات في هذه الفئة</div>'; }
    else {
        scrollDiv.innerHTML = catProducts.map(p => `
            <div class="product-card" data-product-id="${p.id}">
                <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/300x500?text=صورة+غير+متوفرة'">
                <div class="product-info">
                    <div class="product-name">${escapeHtml(p.name)}</div>
                    <div><span class="product-price">${p.price}$ </span>${p.oldprice ? `<span class="product-oldprice">${p.oldprice}$ </span>` : ''}</div>
                    <div class="product-code-badge">رمز: ${p.code || generateTempCode()}</div>
                </div>
            </div>
        `).join('');
    }
    attachCardEvents(scrollDiv);
    document.getElementById('productsSection').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function attachCardEvents(container) {
    container.querySelectorAll('.product-card').forEach(card => {
        card.onclick = (e) => {
            e.stopPropagation();
            const prodId = card.dataset.productId;
            const product = products.find(p => p.id === prodId);
            if (product) openProductModal(product);
        };
    });
}

function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    const detailsDiv = document.getElementById('modalProductDetails');
    const codeSpan = document.getElementById('productCodeDisplay');
    const productCode = product.code || generateTempCode();
    detailsDiv.innerHTML = `
        <img src="${product.image}" class="product-modal-img" onerror="this.src='https://via.placeholder.com/300x500?text=صورة+غير+متوفرة'">
        <h3 style="color:#5E4B56; margin:0.5rem 0;">${escapeHtml(product.name)}</h3>
        <p style="color:#A89B9F;">${escapeHtml(product.desc || '')}</p>
        <p style="font-size:1.2rem; font-weight:bold; color:#D58B9A; margin:0.5rem 0;">${product.price} $</p>
        ${product.oldprice ? `<p style="text-decoration:line-through; color:#A89B9F;">${product.oldprice} $</p>` : ''}
    `;
    codeSpan.innerText = productCode;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
});

document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
    const codeSpan = document.getElementById('productCodeDisplay');
    if (codeSpan) {
        navigator.clipboard.writeText(codeSpan.innerText);
        showToast("✅ تم نسخ رمز المنتج", false);
    }
});

document.getElementById('instagramBuyBtn')?.addEventListener('click', () => {
    if (!currentProduct) return;
    const instagramUrl = "https://www.instagram.com/roya_rosse?igsh=MTV4MnU3OXBjZDJxcw==";
    const message = `مرحباً، أريد شراء المنتج التالي:\n\nالمنتج: ${currentProduct.name}\nالسعر: ${currentProduct.price} $\nرمز المنتج: ${currentProduct.code || generateTempCode()}`;
    window.open(`${instagramUrl}?text=${encodeURIComponent(message)}`, '_blank');
});

function renderAds() {
    const activeAds = ads.filter(ad => ad.active);
    const slider = document.getElementById('adsSlider');
    const dotsContainer = document.getElementById('sliderDots');
    if (!slider) return;
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    if (activeAds.length === 0) {
        slider.innerHTML = `<div class="ad-slide active"><div style="background:#eee; text-align:center; padding:80px;">لا توجد إعلانات</div></div>`;
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }
    slider.innerHTML = '';
    activeAds.forEach((ad, i) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'ad-slide' + (i === 0 ? ' active' : '');
        slideDiv.innerHTML = `<img src="${ad.image}" onerror="this.src='https://via.placeholder.com/1200x400?text=صورة+غير+متوفرة'">${ad.text ? `<div class="ad-text">${escapeHtml(ad.text)}</div>` : ''}`;
        slider.appendChild(slideDiv);
    });
    currentAdIndex = 0;
    if (dotsContainer && activeAds.length > 1) {
        dotsContainer.innerHTML = '';
        activeAds.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('data-index', i);
            dot.onclick = () => goToAd(i);
            dotsContainer.appendChild(dot);
        });
    } else if (dotsContainer) dotsContainer.innerHTML = '';
    const prevBtn = document.getElementById('prevAdBtn');
    const nextBtn = document.getElementById('nextAdBtn');
    if (prevBtn && nextBtn && activeAds.length > 1) {
        const newPrev = prevBtn.cloneNode(true);
        const newNext = nextBtn.cloneNode(true);
        prevBtn.parentNode?.replaceChild(newPrev, prevBtn);
        nextBtn.parentNode?.replaceChild(newNext, nextBtn);
        newPrev.onclick = () => { goToAd((currentAdIndex - 1 + activeAds.length) % activeAds.length); resetAutoSlide(activeAds.length); };
        newNext.onclick = () => { goToAd((currentAdIndex + 1) % activeAds.length); resetAutoSlide(activeAds.length); };
    }
    startAutoSlide(activeAds.length);
}

function goToAd(index) {
    const slides = document.querySelectorAll('#adsSlider .ad-slide');
    const dots = document.querySelectorAll('#sliderDots .dot');
    if (!slides.length) return;
    slides.forEach(slide => slide.classList.remove('active'));
    slides[index].classList.add('active');
    if (dots.length) { dots.forEach(dot => dot.classList.remove('active')); dots[index].classList.add('active'); }
    currentAdIndex = index;
}

function startAutoSlide(total) { if (total <= 1) return; if (autoSlideInterval) clearInterval(autoSlideInterval); autoSlideInterval = setInterval(() => { const activeCount = ads.filter(ad => ad.active).length; if (activeCount <= 1) return; goToAd((currentAdIndex + 1) % activeCount); }, 5000); }
function resetAutoSlide(total) { if (autoSlideInterval) { clearInterval(autoSlideInterval); startAutoSlide(total); } }

// البحث بالاسم والرمز
function performSearch(keyword) {
    if (!keyword.trim()) { document.getElementById('productsSection').style.display = 'none'; document.body.style.overflow = 'auto'; return; }
    const term = keyword.trim().toUpperCase();
    const filtered = products.filter(p => (p.name.toUpperCase().includes(term) || (p.code && p.code.toUpperCase().includes(term))) && p.active);
    const title = document.getElementById('selectedCategoryTitle');
    const scrollDiv = document.getElementById('productsScroll');
    title.innerHTML = `<i class="fas fa-search"></i> نتائج البحث عن "${escapeHtml(keyword)}"`;
    if (filtered.length === 0) { scrollDiv.innerHTML = '<div style="padding:20px; text-align:center; color:#A89B9F;">😞 لا توجد منتجات تطابق بحثك</div>'; }
    else {
        scrollDiv.innerHTML = filtered.map(p => `
            <div class="product-card" data-product-id="${p.id}">
                <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/300x500?text=صورة+غير+متوفرة'">
                <div class="product-info">
                    <div class="product-name">${escapeHtml(p.name)}</div>
                    <div class="product-price">${p.price} $</div>
                    <div class="product-code-badge">رمز: ${p.code || generateTempCode()}</div>
                </div>
            </div>
        `).join('');
    }
    attachCardEvents(scrollDiv);
    document.getElementById('productsSection').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function showSuggestions(inputElement, suggestionsContainer, keyword) {
    if (!keyword.trim()) { suggestionsContainer.style.display = 'none'; return; }
    const term = keyword.trim().toUpperCase();
    const matched = products.filter(p => (p.name.toUpperCase().includes(term) || (p.code && p.code.toUpperCase().includes(term))) && p.active).slice(0, 5);
    if (matched.length === 0) { suggestionsContainer.style.display = 'none'; return; }
    suggestionsContainer.innerHTML = matched.map(p => { const displayCode = p.code ? ` (${p.code})` : ''; return `<div class="suggestion-item" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}${displayCode}</div>`; }).join('');
    suggestionsContainer.style.display = 'block';
    document.querySelectorAll('.suggestion-item').forEach(item => { item.onclick = (e) => { e.stopPropagation(); const selectedName = item.getAttribute('data-name'); inputElement.value = selectedName; suggestionsContainer.style.display = 'none'; performSearch(selectedName); }; });
}

const desktopInput = document.getElementById('searchInputDesktop');
const desktopSuggestions = document.getElementById('suggestionsDesktop');
if (desktopInput) {
    desktopInput.addEventListener('input', (e) => {
        const val = e.target.value;
        showSuggestions(desktopInput, desktopSuggestions, val);
        if (val.trim() === '') { document.getElementById('productsSection').style.display = 'none'; document.body.style.overflow = 'auto'; }
        else { performSearch(val); }
    });
}

const mobileInput = document.getElementById('searchInputMobile');
const mobileSuggestions = document.getElementById('suggestionsMobile');
const clearMobileBtn = document.getElementById('clearMobileSearch');
if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearMobileBtn) clearMobileBtn.style.display = val ? 'block' : 'none';
        showSuggestions(mobileInput, mobileSuggestions, val);
        if (val.trim() === '') { document.getElementById('productsSection').style.display = 'none'; document.body.style.overflow = 'auto'; }
        else { performSearch(val); }
    });
    if (clearMobileBtn) {
        clearMobileBtn.addEventListener('click', () => {
            mobileInput.value = '';
            if (clearMobileBtn) clearMobileBtn.style.display = 'none';
            if (mobileSuggestions) mobileSuggestions.style.display = 'none';
            performSearch('');
            document.getElementById('productsSection').style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
}

document.getElementById('closeProductsBtn')?.addEventListener('click', () => { document.getElementById('productsSection').style.display = 'none'; document.body.style.overflow = 'auto'; });

document.addEventListener('click', function(e) {
    const productsSection = document.getElementById('productsSection');
    if (!productsSection || productsSection.style.display !== 'block') return;
    const searchElements = [desktopInput, mobileInput, desktopSuggestions, mobileSuggestions, clearMobileBtn].filter(el => el !== null);
    const productCards = document.querySelectorAll('#productsScroll .product-card');
    const isInsideResults = productsSection.contains(e.target);
    const isInsideSearch = searchElements.some(el => el && el.contains(e.target));
    const isInsideProductCard = Array.from(productCards).some(card => card.contains(e.target));
    const isOnCategory = e.target.closest('.category-card') !== null;
    const isInsideModal = document.getElementById('productModal')?.contains(e.target);
    if (!isInsideResults && !isInsideSearch && !isInsideProductCard && !isOnCategory && !isInsideModal) {
        productsSection.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (desktopSuggestions) desktopSuggestions.style.display = 'none';
        if (mobileSuggestions) mobileSuggestions.style.display = 'none';
    }
});

document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page === 'home') { document.getElementById('productsSection').style.display = 'none'; document.getElementById('productModal').style.display = 'none'; document.body.style.overflow = 'auto'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (page === 'categories') { document.getElementById('categoriesGrid').scrollIntoView({ behavior: 'smooth' }); }
        else if (page === 'contact') { document.getElementById('contactModal').style.display = 'flex'; }
        document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

const modal = document.getElementById('contactModal');
const contactLink = document.getElementById('contactLink');
const closeBtn = document.querySelector('.close');
contactLink?.addEventListener('click', (e) => { e.preventDefault(); if (modal) modal.style.display = 'flex'; });
closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
document.getElementById('footerContactLink')?.addEventListener('click', (e) => { e.preventDefault(); if (modal) modal.style.display = 'flex'; });
document.getElementById('wishlistIcon')?.addEventListener('click', () => alert('المفضلة قريباً'));

// التحديث التلقائي للمتجر
window.updateStoreData = async function() {
    try {
        const [prodSnap, catSnap, adsSnap] = await Promise.all([
            database.ref('products').once('value'),
            database.ref('categories').once('value'),
            database.ref('ads').once('value')
        ]);
        products = prodSnap.val() ? Object.keys(prodSnap.val()).map(key => ({ id: key, ...prodSnap.val()[key] })) : [];
        categories = catSnap.val() ? Object.keys(catSnap.val()).map(key => ({ id: key, ...catSnap.val()[key] })) : [];
        ads = adsSnap.val() ? Object.keys(adsSnap.val()).map(key => ({ id: key, ...adsSnap.val()[key] })) : [];
        renderCategories();
        renderAds();
        renderRandomProducts();
        const productsSection = document.getElementById('productsSection');
        if (productsSection && productsSection.style.display === 'block') {
            const currentTitle = document.getElementById('selectedCategoryTitle')?.innerText;
            if (currentTitle && currentTitle !== 'نتائج البحث') {
                const category = categories.find(c => c.name === currentTitle);
                if (category) showProductsByCategory(category.id);
            }
        }
        const searchInput = document.getElementById('searchInputDesktop');
        if (searchInput && searchInput.value.trim() !== '') performSearch(searchInput.value);
        const mobileSearchInput = document.getElementById('searchInputMobile');
        if (mobileSearchInput && mobileSearchInput.value.trim() !== '') performSearch(mobileSearchInput.value);
        console.log("✅ تم تحديث المتجر تلقائياً");
    } catch (err) { console.error("خطأ في التحديث التلقائي:", err); }
};

database.ref('products').on('child_added', () => { if (window.updateStoreData) window.updateStoreData(); });
database.ref('products').on('child_changed', () => { if (window.updateStoreData) window.updateStoreData(); });
database.ref('products').on('child_removed', () => { if (window.updateStoreData) window.updateStoreData(); });
database.ref('categories').on('child_added', () => { if (window.updateStoreData) window.updateStoreData(); });
database.ref('categories').on('child_changed', () => { if (window.updateStoreData) window.updateStoreData(); });
database.ref('ads').on('child_added', () => { if (window.updateStoreData) window.updateStoreData(); });
database.ref('ads').on('child_changed', () => { if (window.updateStoreData) window.updateStoreData(); });

function showLoading() {
    let loader = document.getElementById('globalLoader');
    if (loader) { loader.style.display = 'flex'; return; }
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:#FFF5F7; display:flex; justify-content:center; align-items:center; z-index:10000; direction:rtl; font-family:'Tajawal', sans-serif;`;
    loader.innerHTML = `
        <div style="text-align: center; max-width: 80%; padding: 35px; background: white; border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <i class="fas fa-heart" style="font-size: 4rem; color: #FF9AAE; margin-bottom: 1rem; animation: pulse 1.5s infinite;"></i>
            <h2 style="color: #5E4B56; font-size: 1.8rem;">أهلاً وسهلاً</h2>
            <p style="color: #A89B9F; margin-bottom: 1.5rem;">في متجر رويـا</p>
            <div style="width: 50px; height: 50px; margin: 0 auto; border: 3px solid #C7CEEA; border-top-color: #FF9AAE; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="color: #FF9AAE; margin-top: 1.5rem; font-size: 0.8rem;">جاري التحميل...</p>
            <p style="color: #A89B9F; margin-top: 1rem; font-size: 0.7rem;">تم التصميم بواسطة <strong style="color:#FF9AAE;">Ahmad Kllawe</strong></p>
        </div>
    `;
    if (!document.querySelector('#loader-styles')) {
        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.textContent = `@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } } @keyframes spin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

loadData();