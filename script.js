// script.js

// Declare global Firebase variables from index.html
let app, auth, db;
let GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, signInWithCustomToken;
let collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, orderBy, getDocs;

let currentUser = null; // Stores the current authenticated user
let allExpenses = []; // Stores all fetched expenses
let allCategories = []; // Stores all fetched categories
let currentActiveTab = 'dashboard'; // Tracks the active navigation tab
let currentEditingCategoryId = null; // Used for editing categories

// Function to initialize Firebase once the DOM is ready and Firebase SDKs are loaded
window.onload = async () => {
    // Ensure Firebase objects are available from the window object
    app = window.initializeApp(window.firebaseConfig);
    auth = window.getAuth(app);
    db = window.getFirestore(app);

    GoogleAuthProvider = window.GoogleAuthProvider;
    signInWithPopup = window.signInWithPopup;
    signInAnonymously = window.signInAnonymously;
    signOut = window.signOut;
    onAuthStateChanged = window.onAuthStateChanged;
    signInWithCustomToken = window.signInWithCustomToken;

    collection = window.collection;
    addDoc = window.addDoc;
    onSnapshot = window.onSnapshot;
    query = window.query;
    where = window.where;
    doc = window.doc;
    updateDoc = window.updateDoc;
    deleteDoc = window.deleteDoc;
    orderBy = window.orderBy;
    getDocs = window.getDocs;

    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (currentUser) {
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('main-app-content').classList.remove('hidden');
            console.log("تم تسجيل الدخول: ", currentUser.uid);
            // Fetch initial data once user is authenticated
            await fetchAllData();
            renderActiveTabContent();
        } else {
            document.getElementById('auth-modal').classList.remove('hidden');
            document.getElementById('main-app-content').classList.add('hidden');
            console.log("لا يوجد مستخدم مسجل دخول.");
        }
    });

    // Attempt initial sign-in with custom token or anonymously
    try {
        if (window.__initial_auth_token) {
            await signInWithCustomToken(auth, window.__initial_auth_token);
            console.log("تم تسجيل الدخول بالرمز المخصص.");
        } else {
            await signInAnonymously(auth);
            console.log("تم تسجيل الدخول كمجهول.");
        }
    } catch (error) {
        console.error("خطأ أثناء المصادقة الأولية:", error);
        // Fallback to anonymous if custom token fails
        try {
            await signInAnonymously(auth);
            console.log("تم تسجيل الدخول كمجهول بعد فشل الرمز المخصص.");
        } catch (anonError) {
            console.error("خطأ في تسجيل الدخول كمجهول:", anonError);
        }
    }

    // Attach all event listeners after Firebase is initialized
    attachEventListeners();
};

// --- Authentication Functions ---
async function handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // UI updates handled by onAuthStateChanged listener
    } catch (error) {
        console.error("خطأ أثناء تسجيل الدخول باستخدام Google:", error);
        alertUser("فشل تسجيل الدخول باستخدام Google. الرجاء المحاولة مرة أخرى.");
    }
}

async function handleAnonymousSignIn() {
    try {
        await signInAnonymously(auth);
        // UI updates handled by onAuthStateChanged listener
    } catch (error) {
        console.error("خطأ أثناء تسجيل الدخول كمجهول:", error);
        alertUser("فشل تسجيل الدخول كمجهول. الرجاء المحاولة مرة أخرى.");
    }
}

function handleSignOut() {
    signOut(auth)
        .then(() => console.log("تم تسجيل الخروج بنجاح."))
        .catch(error => console.error("خطأ في تسجيل الخروج:", error));
}

// --- Data Fetching and Management (Firestore) ---
async function fetchAllData() {
    if (!currentUser || !db) return;

    const appId = window.__app_id;
    const userId = currentUser.uid;

    // Fetch categories with real-time updates
    const categoriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/categories`);
    onSnapshot(categoriesCollectionRef, (snapshot) => {
        allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ensure 'أخرى' category exists
        if (!allCategories.some(cat => cat.name === 'أخرى')) {
            addDoc(categoriesCollectionRef, { name: 'أخرى', createdAt: new Date().toISOString() })
                .then(() => console.log("'أخرى' فئة مضافة."))
                .catch(err => console.error("خطأ في إضافة فئة 'أخرى':", err));
        }
        renderActiveTabContent(); // Re-render content that depends on categories
    }, (error) => console.error("خطأ في جلب الفئات:", error));

    // Fetch expenses with real-time updates
    const expensesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/expenses`);
    const q = query(expensesCollectionRef, orderBy('date', 'desc')); // Order by date for consistent display
    onSnapshot(q, (snapshot) => {
        allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderActiveTabContent(); // Re-render content that depends on expenses
    }, (error) => console.error("خطأ في جلب المصاريف:", error));
}

// --- UI Rendering Functions ---

function renderActiveTabContent() {
    const mainContentArea = document.getElementById('main-content-area');
    mainContentArea.innerHTML = ''; // Clear previous content

    // Reset tab active classes
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.remove('text-blue-600', 'font-bold', 'border-t-2', 'border-blue-600');
        item.classList.add('text-gray-500', 'hover:text-blue-600');
    });

    // Set active class for current tab
    document.getElementById(`tab-${currentActiveTab}`).classList.add('text-blue-600', 'font-bold', 'border-t-2', 'border-blue-600');
    document.getElementById(`tab-${currentActiveTab}`).classList.remove('text-gray-500', 'hover:text-blue-600');


    if (currentActiveTab === 'dashboard') {
        renderDashboard();
    } else if (currentActiveTab === 'categories') {
        renderCategories();
    } else if (currentActiveTab === 'profile') {
        renderProfile();
    }
}

function renderDashboard() {
    const mainContentArea = document.getElementById('main-content-area');
    mainContentArea.innerHTML = `
        <div class="p-4">
            <h2 class="text-2xl font-bold mb-4 text-blue-800">لوحة القيادة</h2>

            <!-- Monthly Summary -->
            <div class="bg-white p-4 rounded-lg shadow-md mb-6">
                <h3 class="text-lg font-semibold text-gray-700 mb-2">إجمالي مصاريف هذا الشهر:</h3>
                <p id="total-monthly-expense" class="text-3xl font-bold text-blue-600">0.00 د.إ</p>
            </div>

            <!-- LLM Feature Button -->
            <button id="analyze-expenses-button"
                class="w-full bg-green-500 text-white py-2 px-4 rounded-full mb-6 flex items-center justify-center hover:bg-green-600 transition duration-300 ease-in-out">
                <span class="text-lg ml-2">✨</span> تحليل المصاريف
            </button>

            <!-- Search and Filter -->
            <div class="mb-6 flex flex-col sm:flex-row gap-4">
                <input type="text" id="dashboard-search-term" placeholder="البحث عن مصروف..."
                    class="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <select id="dashboard-filter-category"
                    class="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="">جميع الفئات</option>
                    ${allCategories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                </select>
            </div>

            <!-- Expenses List -->
            <h3 class="text-xl font-semibold mb-3 text-blue-700">المصاريف الأخيرة:</h3>
            <div id="expenses-list" class="space-y-4">
                <p class="text-gray-600 text-center">لا توجد مصاريف لعرضها.</p>
            </div>
        </div>
    `;

    // Update totals
    let monthlySum = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    allExpenses.forEach(exp => {
        const expenseDate = new Date(exp.date);
        if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
            monthlySum += parseFloat(exp.amount || 0);
        }
    });
    document.getElementById('total-monthly-expense').textContent = `${monthlySum.toFixed(2)} د.إ`;

    // Attach search and filter listeners
    document.getElementById('dashboard-search-term').addEventListener('input', updateFilteredExpenses);
    document.getElementById('dashboard-filter-category').addEventListener('change', updateFilteredExpenses);

    // Attach LLM feature button listener
    document.getElementById('analyze-expenses-button').addEventListener('click', () => {
        showModal('spending-analysis-modal');
        fetchSpendingAnalysis();
    });

    updateFilteredExpenses(); // Initial render of filtered expenses
}

function updateFilteredExpenses() {
    const searchTerm = document.getElementById('dashboard-search-term').value.toLowerCase();
    const filterCategory = document.getElementById('dashboard-filter-category').value;
    const expensesListDiv = document.getElementById('expenses-list');
    expensesListDiv.innerHTML = ''; // Clear current list

    const filtered = allExpenses.filter(expense => {
        const matchesSearch = expense.name.toLowerCase().includes(searchTerm) ||
                              expense.description.toLowerCase().includes(searchTerm) ||
                              expense.category.toLowerCase().includes(searchTerm);
        const matchesCategory = filterCategory === '' || expense.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        expensesListDiv.innerHTML = '<p class="text-gray-600 text-center">لا توجد مصاريف لعرضها.</p>';
        return;
    }

    filtered.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const dayName = expenseDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'numeric' });
        const expenseHtml = `
            <div class="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
                <div>
                    <p class="text-lg font-semibold text-gray-800">${expense.name}</p>
                    <p class="text-sm text-gray-500">${dayName} - ${expense.category}</p>
                    <p class="text-md font-medium text-red-600 mt-1">${parseFloat(expense.amount).toFixed(2)} د.إ</p>
                </div>
                <div class="flex space-x-2 space-x-reverse">
                    <button data-id="${expense.id}" class="edit-expense-btn bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button data-id="${expense.id}" class="delete-expense-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1_1_0_00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        expensesListDiv.insertAdjacentHTML('beforeend', expenseHtml);
    });

    // Attach event listeners to newly rendered buttons
    expensesListDiv.querySelectorAll('.delete-expense-btn').forEach(button => {
        button.addEventListener('click', (e) => handleDeleteExpense(e.currentTarget.dataset.id));
    });
    // Edit expense button will be implemented later if needed
    expensesListDiv.querySelectorAll('.edit-expense-btn').forEach(button => {
      button.addEventListener('click', (e) => console.log('تعديل المصروف (لم يتم التطبيق بعد):', e.currentTarget.dataset.id));
    });
}

async function handleDeleteExpense(id) {
    if (!currentUser || !db) return;
    try {
        await deleteDoc(doc(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/expenses`, id));
        console.log("تم حذف المصروف بنجاح!");
    } catch (error) {
        console.error("خطأ في حذف المصروف:", error);
    }
}

function renderCategories() {
    const mainContentArea = document.getElementById('main-content-area');
    mainContentArea.innerHTML = `
        <div class="p-4">
            <h2 class="text-2xl font-bold mb-4 text-blue-800">إدارة الفئات</h2>
            <button id="add-category-btn"
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-full mb-6 flex items-center justify-center hover:bg-blue-700 transition duration-300 ease-in-out">
                <span class="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    إضافة فئة جديدة
                </span>
            </button>
            <div id="categories-list" class="space-y-3">
                <p class="text-gray-600 text-center">لا توجد فئات لعرضها. أضف فئة جديدة!</p>
            </div>
        </div>
    `;

    document.getElementById('add-category-btn').addEventListener('click', () => showModal('add-category-modal'));

    const categoriesListDiv = document.getElementById('categories-list');
    if (allCategories.length === 0) {
        categoriesListDiv.innerHTML = '<p class="text-gray-600 text-center">لا توجد فئات لعرضها. أضف فئة جديدة!</p>';
    } else {
        categoriesListDiv.innerHTML = ''; // Clear placeholder
        allCategories.forEach(category => {
            const expenseCount = allExpenses.filter(exp => exp.category === category.name).length;
            const categoryHtml = `
                <div class="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-lg font-semibold text-gray-800">${category.name}</p>
                        <p class="text-sm text-gray-500">${expenseCount} مصروف</p>
                    </div>
                    <div class="flex space-x-2 space-x-reverse">
                        <button data-id="${category.id}" data-name="${category.name}" class="edit-category-btn bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <button data-id="${category.id}" data-name="${category.name}" class="delete-category-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            categoriesListDiv.insertAdjacentHTML('beforeend', categoryHtml);
        });

        // Attach event listeners to newly rendered buttons
        categoriesListDiv.querySelectorAll('.edit-category-btn').forEach(button => {
            button.addEventListener('click', (e) => showEditCategoryModal(e.currentTarget.dataset.id, e.currentTarget.dataset.name));
        });
        categoriesListDiv.querySelectorAll('.delete-category-btn').forEach(button => {
            button.addEventListener('click', (e) => handleDeleteCategory(e.currentTarget.dataset.id, e.currentTarget.dataset.name));
        });
    }
}

async function handleDeleteCategory(id, name) {
    if (!currentUser || !db) return;

    if (name === "أخرى") {
        alertUser("لا يمكن حذف فئة 'أخرى'.");
        return;
    }

    const count = allExpenses.filter(exp => exp.category === name).length;
    if (count > 0) {
        const confirmDelete = window.confirm(`هذه الفئة تحتوي على ${count} مصروف. هل أنت متأكد أنك تريد حذفها؟ سيتم نقل المصاريف إلى فئة 'أخرى'.`);
        if (!confirmDelete) {
            return;
        }
        // Reassign expenses to 'أخرى'
        const expensesToUpdate = allExpenses.filter(exp => exp.category === name);
        const batch = db.batch();
        expensesToUpdate.forEach(exp => {
            const expenseRef = doc(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/expenses`, exp.id);
            batch.update(expenseRef, { category: "أخرى" });
        });
        await batch.commit();
    }

    try {
        await deleteDoc(doc(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/categories`, id));
        console.log("تم حذف الفئة بنجاح!");
    } catch (error) {
        console.error("خطأ في حذف الفئة:", error);
    }
}

function showEditCategoryModal(id, name) {
    currentEditingCategoryId = id;
    document.getElementById('edit-category-name').value = name;
    document.getElementById('edit-category-name').disabled = (name === 'أخرى');
    document.getElementById('edit-category-note').classList.toggle('hidden', name !== 'أخرى');
    document.querySelector('#edit-category-form button[type="submit"]').disabled = (name === 'أخرى');
    showModal('edit-category-modal');
}

async function handleEditCategory(e) {
    e.preventDefault();
    const newCategoryName = document.getElementById('edit-category-name').value.trim();
    const errorElement = document.getElementById('edit-category-error');
    errorElement.classList.add('hidden'); // Hide previous errors

    if (!newCategoryName) {
        errorElement.textContent = "اسم الفئة لا يمكن أن يكون فارغاً.";
        errorElement.classList.remove('hidden');
        return;
    }

    if (document.getElementById('edit-category-name').disabled) { // Check if it was disabled (i.e., 'أخرى')
        errorElement.textContent = "لا يمكن تعديل اسم فئة 'أخرى'.";
        errorElement.classList.remove('hidden');
        return;
    }

    try {
      // Check if new category name already exists (case-insensitive for practical use)
      const categoriesRef = collection(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/categories`);
      const q = query(categoriesRef, where("name", "==", newCategoryName), where(doc.FieldPath.documentId(), '!=', currentEditingCategoryId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        errorElement.textContent = "هذه الفئة موجودة بالفعل.";
        errorElement.classList.remove('hidden');
        return;
      }

      // Get old category name to update expenses
      const oldCategoryName = allCategories.find(cat => cat.id === currentEditingCategoryId)?.name;

      const categoryRef = doc(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/categories`, currentEditingCategoryId);
      await updateDoc(categoryRef, { name: newCategoryName });

      // Update all expenses with the old category name to the new one
      const expensesRef = collection(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/expenses`);
      const expensesToUpdateQuery = query(expensesRef, where("category", "==", oldCategoryName));
      const expensesSnapshot = await getDocs(expensesToUpdateQuery);

      const batch = db.batch();
      expensesSnapshot.forEach((expDoc) => {
        const expenseDocRef = doc(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/expenses`, expDoc.id);
        batch.update(expenseDocRef, { category: newCategoryName });
      });
      await batch.commit();

      hideModal('edit-category-modal');
      currentEditingCategoryId = null; // Reset
    } catch (err) {
      console.error("خطأ في تحديث الفئة:", err);
      errorElement.textContent = "فشل تحديث الفئة. الرجاء المحاولة مرة أخرى.";
      errorElement.classList.remove('hidden');
    }
}


function renderProfile() {
    const mainContentArea = document.getElementById('main-content-area');
    const userId = currentUser ? currentUser.uid : 'غير متاح';
    const userEmail = currentUser ? currentUser.email : 'غير متاح';
    const userDisplayName = currentUser ? currentUser.displayName : 'غير متاح';
    const isAnonymous = currentUser ? currentUser.isAnonymous : true;

    mainContentArea.innerHTML = `
        <div class="p-4">
            <h2 class="text-2xl font-bold mb-4 text-blue-800">الملف الشخصي</h2>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="mb-4">
                    <p class="text-lg font-semibold text-gray-700">معرف المستخدم (UID):</p>
                    <p class="text-md text-gray-800 break-words">${userId}</p>
                </div>
                ${userEmail !== 'غير متاح' ? `<div class="mb-4">
                    <p class="text-lg font-semibold text-gray-700">البريد الإلكتروني:</p>
                    <p class="text-md text-gray-800">${userEmail}</p>
                </div>` : ''}
                ${userDisplayName !== 'غير متاح' ? `<div class="mb-4">
                    <p class="text-lg font-semibold text-gray-700">اسم المستخدم:</p>
                    <p class="text-md text-gray-800">${userDisplayName}</p>
                </div>` : ''}
                ${isAnonymous ? '<p class="text-gray-600">أنت مسجل الدخول كمستخدم مجهول.</p>' : ''}
            </div>
        </div>
    `;
}

// --- Modal Utilities ---
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    // Reset form fields and errors when hiding modals
    if (modalId === 'add-expense-modal') {
        document.getElementById('add-expense-form').reset();
        document.getElementById('add-expense-error').classList.add('hidden');
    } else if (modalId === 'add-category-modal') {
        document.getElementById('add-category-form').reset();
        document.getElementById('add-category-error').classList.add('hidden');
    } else if (modalId === 'edit-category-modal') {
        document.getElementById('edit-category-form').reset();
        document.getElementById('edit-category-error').classList.add('hidden');
        currentEditingCategoryId = null;
    } else if (modalId === 'spending-analysis-modal') {
        document.getElementById('analysis-result').innerHTML = ''; // Clear previous results
        document.getElementById('analysis-loading').classList.remove('hidden'); // Show loading again
        document.getElementById('analysis-result').classList.add('hidden');
        document.getElementById('analysis-error').classList.add('hidden');
    }
}

function alertUser(message) {
    // In a real app, you'd use a custom modal instead of alert()
    console.warn("إشعار للمستخدم:", message);
    window.alert(message); // Using alert for simplicity, replace with custom modal if needed
}

// --- Form Submissions ---
async function handleAddExpenseFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('expense-name').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    const description = document.getElementById('expense-description').value.trim();
    const errorElement = document.getElementById('add-expense-error');
    errorElement.classList.add('hidden');

    if (!name || isNaN(amount) || !date || !category) {
        errorElement.textContent = "الرجاء ملء جميع الحقول المطلوبة والمبلغ يجب أن يكون رقماً صالحاً.";
        errorElement.classList.remove('hidden');
        return;
    }

    try {
        await addDoc(collection(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/expenses`), {
            name,
            amount,
            date,
            category,
            description,
            createdAt: new Date().toISOString(),
        });
        hideModal('add-expense-modal');
    } catch (err) {
        console.error("خطأ في إضافة المصروف: ", err);
        errorElement.textContent = "فشل إضافة المصروف. الرجاء المحاولة مرة أخرى.";
        errorElement.classList.remove('hidden');
    }
}

async function handleAddCategoryFormSubmit(e) {
    e.preventDefault();
    const categoryName = document.getElementById('new-category-name').value.trim();
    const errorElement = document.getElementById('add-category-error');
    errorElement.classList.add('hidden');

    if (!categoryName) {
        errorElement.textContent = "اسم الفئة لا يمكن أن يكون فارغاً.";
        errorElement.classList.remove('hidden');
        return;
    }

    try {
        const categoriesRef = collection(db, `artifacts/${window.__app_id}/users/${currentUser.uid}/categories`);
        const q = query(categoriesRef, where("name", "==", categoryName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            errorElement.textContent = "هذه الفئة موجودة بالفعل.";
            errorElement.classList.remove('hidden');
            return;
        }

        await addDoc(categoriesRef, {
            name: categoryName,
            createdAt: new Date().toISOString(),
        });
        hideModal('add-category-modal');
    } catch (err) {
        console.error("خطأ في إضافة الفئة: ", err);
        errorElement.textContent = "فشل إضافة الفئة. الرجاء المحاولة مرة أخرى.";
        errorElement.classList.remove('hidden');
    }
}

// --- LLM Integration ---
async function fetchSpendingAnalysis() {
    const analysisLoading = document.getElementById('analysis-loading');
    const analysisError = document.getElementById('analysis-error');
    const analysisResultDiv = document.getElementById('analysis-result');

    analysisLoading.classList.remove('hidden');
    analysisError.classList.add('hidden');
    analysisResultDiv.classList.add('hidden');
    analysisResultDiv.innerHTML = ''; // Clear previous results

    try {
        const categorySummary = allExpenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + parseFloat(expense.amount || 0);
            return acc;
        }, {});

        let promptText = "أنا أستخدم تطبيقًا لتتبع المصاريف. إليك ملخص لإنفاقي الأخير حسب الفئة:\n\n";
        for (const category in categorySummary) {
            promptText += `- ${category}: ${categorySummary[category].toFixed(2)} درهم إماراتي\n`;
        }
        promptText += "\nالرجاء تحليل عادات إنفاقي بناءً على هذه البيانات. قدم رؤى حول المجالات التي قد أنفق فيها كثيرًا، واقترح مجالات يمكنني توفير المال فيها، وقدم نصائح عملية لتحسين صحتي المالية. الرجاء الرد باللغة العربية، بأسلوب ودود ومشجع، وقم بتنظيم الرد بعناوين واضحة ونقاط تعداد حيثما كان ذلك مناسبًا. ركز على النصائح العملية.";

        const apiKey = ""; // Canvas will provide this at runtime
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
            analysisResultDiv.innerHTML = result.candidates[0].content.parts[0].text.replace(/\n/g, '<br/>'); // Preserve newlines
            analysisResultDiv.classList.remove('hidden');
        } else {
            analysisError.textContent = "فشل الحصول على التحليل. (بنية استجابة LLM غير متوقعة)";
            analysisError.classList.remove('hidden');
            console.error("LLM response structure unexpected:", result);
        }
    } catch (err) {
        console.error("خطأ في جلب التحليل من Gemini API:", err);
        analysisError.textContent = "حدث خطأ أثناء الحصول على التحليل. الرجاء التأكد من اتصالك بالإنترنت.";
        analysisError.classList.remove('hidden');
    } finally {
        analysisLoading.classList.add('hidden');
    }
}


// --- Event Listeners ---
function attachEventListeners() {
    // Auth Modal Buttons
    document.getElementById('google-signin-button-modal').addEventListener('click', handleGoogleSignIn);
    document.getElementById('anonymous-signin-button-modal').addEventListener('click', handleAnonymousSignIn);

    // Header Sign Out Button
    document.getElementById('signout-button').addEventListener('click', handleSignOut);

    // FAB Button
    document.getElementById('fab-add-expense').addEventListener('click', () => {
        showModal('add-expense-modal');
        // Populate categories dropdown in Add Expense modal
        const categorySelect = document.getElementById('expense-category');
        categorySelect.innerHTML = ''; // Clear previous options
        if (allCategories.length === 0) {
            categorySelect.innerHTML = '<option value="">لا توجد فئات. أضف واحدة أولاً.</option>';
        } else {
            allCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
            // Set default to 'أخرى' if exists
            const otherOption = allCategories.find(cat => cat.name === 'أخرى');
            if (otherOption) {
                categorySelect.value = 'أخرى';
            } else {
                categorySelect.value = allCategories[0].name; // Select first if 'أخرى' not found
            }
        }
    });

    // Navigation Tabs
    document.getElementById('tab-dashboard').addEventListener('click', () => { currentActiveTab = 'dashboard'; renderActiveTabContent(); });
    document.getElementById('tab-categories').addEventListener('click', () => { currentActiveTab = 'categories'; renderActiveTabContent(); });
    document.getElementById('tab-add').addEventListener('click', () => { showModal('add-expense-modal'); }); // This tab is just a shortcut to the FAB action
    document.getElementById('tab-profile').addEventListener('click', () => { currentActiveTab = 'profile'; renderActiveTabContent(); });

    // Add Expense Modal
    document.getElementById('add-expense-form').addEventListener('submit', handleAddExpenseFormSubmit);
    document.getElementById('cancel-add-expense').addEventListener('click', () => hideModal('add-expense-modal'));

    // Add Category Modal
    document.getElementById('add-category-form').addEventListener('submit', handleAddCategoryFormSubmit);
    document.getElementById('cancel-add-category').addEventListener('click', () => hideModal('add-category-modal'));

    // Edit Category Modal
    document.getElementById('edit-category-form').addEventListener('submit', handleEditCategory);
    document.getElementById('cancel-edit-category').addEventListener('click', () => hideModal('edit-category-modal'));

    // Spending Analysis Modal
    document.getElementById('close-analysis-modal').addEventListener('click', () => hideModal('spending-analysis-modal'));
}
