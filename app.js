// Tsubaki Chain Database Application
let isLoggedIn = false;
let currentUser = null;

class TsubakiDatabase {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.currentSection = 'home';
        this.currentTheme = 'dark';
        this.categories = {
            "Drive Chain": "drive_chain",        // API 엔드포인트에 맞게 수정
            "Sprocket": "sprocket",
            "Conveyor Chain": "conveyor_chain",
            "Timing Belt": "timing_belt",
            "Reducer": "reducer",
            "Coupling": "coupling",
            "Linear Actuator": "linear_actuator",
            "Cable Carrier": "cable_carrier",
            "Metadata": "metadata"               // METADATA_JSON 테이블도 있다면 추가
        };
        // 백엔드 API의 기본 URL 설정. 백엔드 서버가 3000번 포트에서 실행된다고 가정.
        this.apiBaseUrl = 'http://localhost:3000/api'; 
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupTheme();
        this.renderCategories();
        
        // 데이터 로딩 시도 (API로부터)
        try {
            await Promise.race([
                this.loadAllProductsFromAPI(), // Oracle DB에서 데이터를 가져오는 함수
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: API data loading took too long.')), 15000)) // 15초 타임아웃
            ]);
            console.log("Products successfully loaded from API.");
        } catch (error) {
            console.log('데이터 로딩 실패 또는 타임아웃:', error.message);
            // 에러 발생 시 사용자에게 알림을 주거나, 대체 로직(예: 샘플 데이터 로드) 추가
            document.getElementById('loading').textContent = '데이터 로딩 실패. 백엔드 서버가 실행 중인지 확인해주세요.';
            // this.loadSampleData(); // 필요한 경우 샘플 데이터 로드 (오프라인/에러 대비)
        }
        
        this.setupFilters();
        this.showLoading(false);
    }
    
    // 백엔드 API에서 모든 제품 데이터를 가져오는 함수
    async loadAllProductsFromAPI() {
        this.showLoading(true);
        const productData = [];

        for (const categoryName in this.categories) {
            const apiEndpointSuffix = this.categories[categoryName];
            const url = `${this.apiBaseUrl}/${apiEndpointSuffix}`;
            try {
                console.log(`Fetching data from: ${url}`);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, URL: ${url}`);
                }
                const data = await response.json();
                
                // 각 제품 객체에 category 필드 추가 (나중에 필터링 및 표시를 위해 유용)
                const productsWithCategory = data.map(product => ({ ...product, category: categoryName }));
                productData.push(...productsWithCategory);
            } catch (error) {
                console.error(`Failed to load data for ${categoryName} from ${url}:`, error);
                // 특정 카테고리 로드 실패 시에도 전체 로딩이 멈추지 않도록 처리
                // 사용자에게 부분적인 오류를 알릴 수 있음
            }
        }
        this.products = productData;
        this.filteredProducts = [...this.products]; // 초기 필터링된 제품 설정
        console.log("All products loaded:", this.products);
        this.renderProducts(); // 데이터 로드 후 제품 목록 렌더링
    }

    // 기존 loadProducts 함수는 더 이상 사용되지 않음 (로컬 파일 로딩)
    // 필요한 경우 백업을 위해 주석 처리하거나 삭제합니다.
    /*
    async loadProducts() {
        this.showLoading(true);
        const files = [
            "data/Drive_Chain.json",
            "data/Coupling.json",
            "data/Cable_Carrier.json",
            "data/Conveyor_Chain.json",
            "data/Linear_Actuator.json",
            "data/Reducer.json",
            "data/Sprocket.json",
            "data/Timing_Belt.json"
        ];
        
        const allProducts = [];
        for (const file of files) {
            try {
                const response = await fetch(file);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const categoryName = file.split('/').pop().replace('.json', '').replace('_', ' '); // 파일명에서 카테고리 이름 추출
                const productsWithCategory = data.map(product => ({ ...product, category: categoryName }));
                allProducts.push(...productsWithCategory);
            } catch (error) {
                console.error(`Failed to load ${file}:`, error);
            }
        }
        this.products = allProducts;
        this.filteredProducts = [...this.products];
        this.renderProducts();
    }
    */

    // // 임시 샘플 데이터 로드 (API 로딩 실패 시 사용 가능)
    // loadSampleData() {
    //     this.products = [
    //         { id: 1, name: "Sample Drive Chain A", category: "Drive Chain", description: "This is a sample drive chain.", specifications: { pitch: "15.875mm" }, image: "https://via.placeholder.com/150", price: 100 },
    //         { id: 2, name: "Sample Sprocket B", category: "Sprocket", description: "This is a sample sprocket.", specifications: { teeth: "25" }, image: "https://via.placeholder.com/150", price: 50 },
    //         // 더 많은 샘플 데이터 추가 가능
    //     ];
    //     this.filteredProducts = [...this.products];
    //     this.renderProducts();
    // }

    setupEventListeners() {
        // ... (기존과 동일)
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('signupBtn').addEventListener('click', () => this.showSignupModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('submitLogin').addEventListener('click', () => this.handleLogin());
        document.getElementById('submitSignup').addEventListener('click', () => this.handleSignup());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        document.getElementById('categoryGrid').addEventListener('click', (e) => {
            if (e.target.closest('.category-card')) {
                const categoryName = e.target.closest('.category-card').dataset.category;
                this.filterByCategory(categoryName);
            }
        });

        document.getElementById('showAllProductsBtn').addEventListener('click', () => this.showAllProducts());
        document.getElementById('mainSearch').addEventListener('input', (e) => this.searchProducts(e.target.value));
        document.getElementById('sortSelect').addEventListener('change', (e) => this.sortProducts(e.target.value));
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));

        // Navigation
        document.querySelectorAll('.nav-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Calculator type toggle
        document.getElementById('calcTypeToggle').addEventListener('change', (e) => {
            const basicCalc = document.getElementById('basicCalc');
            const chainCalc = document.getElementById('chainCalc');
            if (e.target.value === 'basic') {
                basicCalc.classList.remove('hidden');
                chainCalc.classList.add('hidden');
            } else {
                basicCalc.classList.add('hidden');
                chainCalc.classList.remove('hidden');
            }
        });

        // Modal close button
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        // Back to home from product list
        document.getElementById('backToHomeFromProducts').addEventListener('click', () => this.showSection('home'));
        // Back to home from guide
        document.getElementById('backToHomeFromGuide').addEventListener('click', () => this.showSection('home'));
    }

    showLoginModal() {
        document.getElementById('loginSection').classList.remove('hidden');
        // Optionally clear fields and error messages
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').classList.add('hidden');
    }

    hideLoginModal() {
        document.getElementById('loginSection').classList.add('hidden');
    }

    showSignupModal() {
        document.getElementById('signupSection').classList.remove('hidden');
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('signupError').classList.add('hidden');
    }

    hideSignupModal() {
        document.getElementById('signupSection').classList.add('hidden');
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('loginError');

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                isLoggedIn = true;
                currentUser = username;
                this.hideLoginModal();
                document.getElementById('loginBtn').classList.add('hidden');
                document.getElementById('logoutBtn').classList.remove('hidden');
                alert('로그인 성공!');
            } else {
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Login error:', err);
            loginError.classList.remove('hidden');
        }
    }

    async handleSignup() {
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const signupError = document.getElementById('signupError');

        try {
            const res = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                alert('회원가입 성공! 로그인해주세요.');
                this.hideSignupModal();
            } else {
                signupError.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Signup error:', err);
            signupError.classList.remove('hidden');
        }
    }

    logout() {
        isLoggedIn = false;
        currentUser = null;
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        alert('로그아웃되었습니다.');
    }

    toggleTheme() {
        const currentScheme = document.documentElement.getAttribute('data-color-scheme');
        if (currentScheme === 'dark') {
            document.documentElement.setAttribute('data-color-scheme', 'light');
            this.currentTheme = 'light';
            document.getElementById('themeToggle').textContent = '☀️ 라이트모드';
        } else {
            document.documentElement.setAttribute('data-color-scheme', 'dark');
            this.currentTheme = 'dark';
            document.getElementById('themeToggle').textContent = '🌙 다크모드';
        }
        localStorage.setItem('theme', this.currentTheme);
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-color-scheme', savedTheme);
            this.currentTheme = savedTheme;
            document.getElementById('themeToggle').textContent = savedTheme === 'dark' ? '🌙 다크모드' : '☀️ 라이트모드';
        } else {
            // 기본은 다크모드로 설정
            document.documentElement.setAttribute('data-color-scheme', 'dark');
            this.currentTheme = 'dark';
            document.getElementById('themeToggle').textContent = '🌙 다크모드';
        }
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }

    renderCategories() {
        const categoryGrid = document.getElementById('categoryGrid');
        categoryGrid.innerHTML = '';
        for (const categoryName in this.categories) {
            const card = document.createElement('div');
            card.classList.add('category-card');
            card.dataset.category = categoryName;
            card.innerHTML = `
                <img src="https://via.placeholder.com/100" alt="${categoryName}">
                <h4>${categoryName}</h4>
            `;
            categoryGrid.appendChild(card);
        }
    }

    filterByCategory(category) {
        this.filteredProducts = this.products.filter(product => product.category === category);
        this.currentPage = 1;
        this.showSection('products');
        this.renderProducts();
        document.getElementById('currentCategoryTitle').textContent = category;
    }

    showAllProducts() {
        this.filteredProducts = [...this.products];
        this.currentPage = 1;
        this.showSection('products');
        this.renderProducts();
        document.getElementById('currentCategoryTitle').textContent = '모든 제품';
    }

    searchProducts(query) {
        const lowerCaseQuery = query.toLowerCase();
        this.filteredProducts = this.products.filter(product => {
            const nameMatch = product.name && product.name.toLowerCase().includes(lowerCaseQuery);
            const descriptionMatch = product.description && product.description.toLowerCase().includes(lowerCaseQuery);
            const categoryMatch = product.category && product.category.toLowerCase().includes(lowerCaseQuery);
            // specifications 객체 내의 값 검색
            const specMatch = product.specifications && Object.values(product.specifications).some(spec => 
                typeof spec === 'string' && spec.toLowerCase().includes(lowerCaseQuery)
            );
            return nameMatch || descriptionMatch || categoryMatch || specMatch;
        });
        this.currentPage = 1;
        this.renderProducts();
    }

    sortProducts(criteria) {
        if (criteria === 'name-asc') {
            this.filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (criteria === 'name-desc') {
            this.filteredProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        } else if (criteria === 'price-asc') {
            this.filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (criteria === 'price-desc') {
            this.filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
        }
        this.renderProducts();
    }

    renderProducts() {
        const productGrid = document.getElementById('productsGrid');
        productGrid.innerHTML = '';
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const productsToDisplay = this.filteredProducts.slice(start, end);

        if (productsToDisplay.length === 0) {
            productGrid.innerHTML = '<p class="no-results">검색 결과가 없습니다.</p>';
        } else {
            productsToDisplay.forEach(product => {
                const card = document.createElement('div');
                card.classList.add('product-card');
                card.innerHTML = `
                    <img src="${product.image || 'https://via.placeholder.com/150'}" alt="${product.name || '제품 이미지'}">
                    <h4>${product.name || '이름 없음'}</h4>
                    <p class="product-category">${product.category || '미분류'}</p>
                    <p>${product.description ? product.description.substring(0, 100) + '...' : '설명 없음'}</p>
                    <button class="view-details-btn" data-product-id="${product.id}">자세히 보기</button>
                `;
                productGrid.appendChild(card);
            });
        }
        
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                this.showProductDetails(productId);
            });
        });

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.pageSize);
        document.getElementById('currentPageSpan').textContent = this.currentPage;
        document.getElementById('totalPagesSpan').textContent = totalPages;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages || totalPages === 0;
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredProducts.length / this.pageSize);
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        this.renderProducts();
    }

    showProductDetails(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('modalProductImage').src = product.image || 'https://via.placeholder.com/200';
            document.getElementById('modalProductName').textContent = product.name || '이름 없음';
            document.getElementById('modalProductCategory').textContent = `카테고리: ${product.category || '미분류'}`;
            document.getElementById('modalProductDescription').textContent = product.description || '설명 없음';
            document.getElementById('modalProductPrice').textContent = `가격: $${product.price ? product.price.toFixed(2) : 'N/A'}`;
            
            const specList = document.getElementById('modalProductSpecs');
            specList.innerHTML = '';
            if (product.specifications) {
                for (const key in product.specifications) {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${key}: ${product.specifications[key]}`;
                    specList.appendChild(listItem);
                }
            } else {
                specList.innerHTML = '<li>제공되는 사양 없음</li>';
            }

            document.getElementById('productModal').classList.remove('hidden');
        }
    }

    closeModal() {
        document.getElementById('productModal').classList.add('hidden');
    }

    showSection(sectionId) {
        this.currentSection = sectionId;
        document.querySelectorAll('main > section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById('loginSection').classList.add('hidden'); // 로그인 섹션도 숨김
        document.getElementById(`${sectionId}Section`).classList.remove('hidden');

        document.querySelectorAll('.nav-item').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-section="${sectionId}"]`).classList.add('active');

        // 제품 섹션으로 이동할 때 항상 초기화 및 렌더링
        if (sectionId === 'products') {
            // this.filteredProducts = [...this.products]; // 모든 제품 보여주기로 초기화 (선택 사항)
            // this.currentPage = 1;
            // this.renderProducts();
            // productsSection 내의 다른 요소들은 그대로 둠 (검색, 필터 등)
            document.getElementById('currentCategoryTitle').textContent = '모든 제품'; // 또는 현재 선택된 카테고리 이름
        } else if (sectionId === 'home') {
            document.getElementById('productsSection').classList.add('hidden'); // 제품 섹션 숨기기
        }
    }
}

// 계산기 로직 (기존과 동일)
let currentInput = '0';
let currentOperator = null;
let firstOperand = null;
const calculatorDisplay = document.getElementById('calcDisplay');

function updateDisplay() {
    if (calculatorDisplay) {
        calculatorDisplay.textContent = currentInput;
    }
}

function appendToCalc(value) {
    if (currentInput === '0' && value !== '.') {
        currentInput = value;
    } else {
        currentInput += value;
    }
    updateDisplay();
}

function clearCalc() {
    currentInput = '0';
    currentOperator = null;
    firstOperand = null;
    updateDisplay();
}

function setOperator(operator) {
    if (firstOperand === null) {
        firstOperand = parseFloat(currentInput);
    } else if (currentOperator) {
        calculateResult();
        firstOperand = parseFloat(currentInput);
    }
    currentOperator = operator;
    currentInput = '0'; // 다음 숫자 입력을 위해 초기화
}

function calculateResult() {
    if (firstOperand === null || currentOperator === null) {
        return;
    }

    const secondOperand = parseFloat(currentInput);
    let result = 0;

    switch (currentOperator) {
        case '+':
            result = firstOperand + secondOperand;
            break;
        case '-':
            result = firstOperand - secondOperand;
            break;
        case '*':
            result = firstOperand * secondOperand;
            break;
        case '/':
            if (secondOperand === 0) {
                result = 'Error';
                alert('0으로 나눌 수 없습니다!');
            } else {
                result = firstOperand / secondOperand;
            }
            break;
        default:
            return;
    }

    currentInput = result.toString();
    firstOperand = null;
    currentOperator = null;
    updateDisplay();
}

// 체인 속도 계산기 함수 (기존과 동일)
function calculateChainSpeed() {
    const pitchInput = document.getElementById('pitch');
    const teethInput = document.getElementById('teeth');
    const rpmInput = document.getElementById('rpm');
    const resultDiv = document.getElementById('speedResult');
    
    if (!pitchInput || !teethInput || !rpmInput || !resultDiv) return;
    
    const pitch = parseFloat(pitchInput.value);
    const teeth = parseFloat(teethInput.value);
    const rpm = parseFloat(rpmInput.value);
    
    if (isNaN(pitch) || isNaN(teeth) || isNaN(rpm)) {
        resultDiv.innerHTML = '<span style="color: red;">모든 값을 입력해주세요.</span>';
        return;
    }
    
    // V = (P × Z × N) / 1000 (m/min)
    const speed = (pitch * teeth * rpm) / 1000;
    
    resultDiv.innerHTML = `
        <strong>체인 속도: ${speed.toFixed(2)} m/min</strong><br>
        <small>계산식: V = (${pitch} × ${teeth} × ${rpm}) / 1000 = ${speed.toFixed(2)} m/min</small>
    `;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tsubakiApp = new TsubakiDatabase();
});

// Keyboard shortcuts (기존과 동일)
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('productModal');
        if (modal && !modal.classList.contains('hidden')) {
            window.tsubakiApp.closeModal();
        }
    }
    // Basic Calculator keyboard support (옵션)
    if (document.getElementById('basicCalc') && !document.getElementById('basicCalc').classList.contains('hidden')) {
        if (e.key >= '0' && e.key <= '9') {
            appendToCalc(e.key);
        } else if (e.key === '.') {
            appendToCalc('.');
        } else if (e.key === '+') {
            setOperator('+');
        } else if (e.key === '-') {
            setOperator('-');
        } else if (e.key === '*') {
            setOperator('*');
        } else if (e.key === '/') {
            setOperator('/');
        } else if (e.key === 'Enter' || e.key === '=') {
            calculateResult();
            e.preventDefault(); // Enter 키 기본 동작 방지
        } else if (e.key === 'Backspace') {
            if (currentInput.length > 1) {
                currentInput = currentInput.slice(0, -1);
            } else {
                currentInput = '0';
            }
            updateDisplay();
        }
    }
});