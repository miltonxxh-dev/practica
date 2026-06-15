// ===== Configuration =====
const CONFIG = {
    debounceDelay: 150,
    highlightLanguages: {
        'HTML': 'xml',
        'Django': 'python',
        'SQL': 'sql'
    }
};

// ===== State =====
let allTasks = [];
let currentFilter = 'all';
let searchQuery = '';

// ===== DOM Elements =====
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearSearch');
const filterBtns = document.querySelectorAll('.filter-btn');
const resultsContainer = document.getElementById('resultsContainer');
const emptyState = document.getElementById('emptyState');
const statsText = document.getElementById('statsText');
const toast = document.getElementById('toast');

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadTasks();
    setupEventListeners();
    performSearch();
});

// ===== Load Tasks =====
async function loadTasks() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) throw new Error('Failed to load tasks');
        allTasks = await response.json();
        statsText.textContent = `Загружено ${allTasks.length} заданий`;
    } catch (error) {
        console.error('Error loading tasks:', error);
        statsText.textContent = 'Ошибка загрузки заданий';
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Не удалось загрузить задания</h3>
                <p>Проверьте, что файл tasks.json находится в той же папке</p>
            </div>
        `;
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Search input with debounce
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = e.target.value.trim().toLowerCase();
            updateClearButton();
            performSearch();
        }, CONFIG.debounceDelay);
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        updateClearButton();
        searchInput.focus();
        performSearch();
    });

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            performSearch();
        });
    });

    // Keyboard shortcut: Escape to clear
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchQuery) {
            searchInput.value = '';
            searchQuery = '';
            updateClearButton();
            performSearch();
            searchInput.focus();
        }
    });
}

function updateClearButton() {
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
}

// ===== Search Logic =====
function performSearch() {
    const filtered = filterTasks();
    renderTasks(filtered);
    updateStats(filtered.length);
}

function filterTasks() {
    return allTasks.filter(task => {
        // Category filter
        if (currentFilter !== 'all' && task.category !== currentFilter) {
            return false;
        }

        // If no search query, show all
        if (!searchQuery) return true;

        // Search across all fields (partial match)
        const query = searchQuery;
        
        const searchableText = [
            String(task.id),
            task.title,
            task.category,
            task.task,
            task.solution,
            ...(task.keywords || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(query);
    });
}

// ===== Render Tasks =====
function renderTasks(tasks) {
    if (tasks.length === 0) {
        resultsContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    
    const html = tasks.map(task => createTaskCard(task)).join('');
    resultsContainer.innerHTML = html;

    // Apply syntax highlighting
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    // Attach copy button handlers
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', handleCopy);
    });
}

function createTaskCard(task) {
    const categoryClass = task.category.toLowerCase();
    const lang = CONFIG.highlightLanguages[task.category] || 'plaintext';
    
    // Escape HTML in solution for display
    const escapedSolution = escapeHtml(task.solution);

    return `
        <article class="task-card" data-id="${task.id}">
            <div class="task-header">
                <div class="task-meta">
                    <span class="task-number">#${task.id}</span>
                    <span class="task-category ${categoryClass}">${task.category}</span>
                </div>
                <h2 class="task-title">${escapeHtml(task.title)}</h2>
            </div>
            
            <div class="task-body">
                <div class="task-section">
                    <div class="section-label">Условие</div>
                    <div class="task-condition">${escapeHtml(task.task)}</div>
                </div>
                
                <div class="task-section">
                    <div class="section-label">Решение</div>
                    <div class="code-wrapper">
                        <div class="code-header">
                            <span class="code-lang">${task.category}</span>
                            <button class="copy-btn" data-code="${encodeURIComponent(task.solution)}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Копировать
                            </button>
                        </div>
                        <pre><code class="language-${lang}">${escapedSolution}</code></pre>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// ===== Copy Functionality =====
async function handleCopy(e) {
    const btn = e.currentTarget;
    const code = decodeURIComponent(btn.dataset.code);
    
    try {
        await navigator.clipboard.writeText(code);
        showCopiedState(btn);
        showToast();
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopiedState(btn);
        showToast();
    }
}

function showCopiedState(btn) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Скопировано!
    `;
    btn.classList.add('copied');
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
    }, 2000);
}

function showToast() {
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ===== Stats =====
function updateStats(count) {
    if (searchQuery || currentFilter !== 'all') {
        statsText.textContent = `Найдено: ${count} из ${allTasks.length}`;
    } else {
        statsText.textContent = `Всего заданий: ${allTasks.length}`;
    }
}

// ===== Utility =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}