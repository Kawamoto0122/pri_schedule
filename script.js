document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // State Application
    // ----------------------------------------------------
    const STORAGE_KEY = 'otetsudaiData';
    let appData = loadData();

    // Elements
    const form = document.getElementById('rewardForm');
    const historyList = document.getElementById('historyList');
    const totalAmountEl = document.getElementById('totalAmount');
    const loadingDateEl = document.getElementById('currentDate');
    const progressListEl = document.getElementById('progressList');
    const toast = document.getElementById('toast');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // ----------------------------------------------------
    // Initialization
    // ----------------------------------------------------
    updateDate();
    renderUI();

    // ----------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const registrant = document.getElementById('registrant').value.trim();
        const type = document.getElementById('type').value.trim();
        const amount = parseInt(document.getElementById('amount').value);

        if (!registrant || !type || isNaN(amount)) return;

        const newRecord = {
            id: Date.now(),
            registrant,
            type,
            amount,
            date: new Date().toISOString()
        };

        appData.records.unshift(newRecord); // Add to beginning
        saveData();
        renderUI();
        form.reset();
        showToast('登録しました！');
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('すべての履歴を削除してもよろしいですか？')) {
            appData.records = [];
            saveData();
            renderUI();
            showToast('履歴を削除しました');
        }
    });

    // ----------------------------------------------------
    // Logic & Utilities
    // ----------------------------------------------------
    function loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
        return { records: [] };
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    }

    function deleteRecord(id) {
        if (!confirm('この記録を削除しますか？')) return;

        appData.records = appData.records.filter(r => r.id !== id);
        saveData();
        renderUI();
        showToast('削除しました');
    }

    function updateDate() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        loadingDateEl.textContent = now.toLocaleDateString('ja-JP', options);
    }

    function formatCurrency(num) {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(num);
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // ----------------------------------------------------
    // Rendering
    // ----------------------------------------------------
    function renderUI() {
        renderHistory();
        renderDashboard();
    }

    function renderHistory() {
        historyList.innerHTML = '';

        if (appData.records.length === 0) {
            historyList.innerHTML = '<li class="empty-state">まだ記録がありません。お手伝いをして記録しましょう！</li>';
            return;
        }

        appData.records.forEach(record => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-content">
                    <h4>${record.registrant} <small style="color:var(--text-muted); font-weight:normal;">- ${record.type}</small></h4>
                    <p>${formatDate(record.date)}</p>
                </div>
                <div class="history-actions">
                    <div class="history-amount">
                        ${formatCurrency(record.amount)}
                    </div>
                    <button class="delete-record-btn" title="削除">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
            `;

            const deleteBtn = li.querySelector('.delete-record-btn');
            deleteBtn.addEventListener('click', () => deleteRecord(record.id));

            historyList.appendChild(li);
        });
    }

    function renderDashboard() {
        // Calculate Totals
        let total = 0;
        const perUser = {};

        // Filter for current month only (Enhancement: Could allow changing months later)
        const now = new Date();
        const currentMonthRecords = appData.records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        currentMonthRecords.forEach(r => {
            total += r.amount;
            if (perUser[r.registrant]) {
                perUser[r.registrant] += r.amount;
            } else {
                perUser[r.registrant] = r.amount;
            }
        });

        // Update Total Display
        totalAmountEl.textContent = formatCurrency(total);

        // Update User Breakdown Progress Bars
        progressListEl.innerHTML = '';
        const users = Object.keys(perUser).sort((a, b) => perUser[b] - perUser[a]); // Sort by amount desc

        // Find max for bar scaling (avoid div by zero)
        const maxVal = users.length > 0 ? perUser[users[0]] : 1;

        if (users.length === 0) {
            progressListEl.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.9rem;">今月のデータはありません</div>';
        }

        users.forEach(user => {
            const amount = perUser[user];
            const percent = (amount / maxVal) * 100;
            const hue = stringToHue(user); // Generate consistent color based on name

            const item = document.createElement('div');
            item.className = 'progress-item';
            item.innerHTML = `
                <div class="progress-info">
                    <div class="progress-header">
                        <span>${user}</span>
                        <span>${formatCurrency(amount)}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%; background-color: hsl(${hue}, 70%, 60%);"></div>
                    </div>
                </div>
            `;
            progressListEl.appendChild(item);
        });
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Helper: Generate a consistent color hue from a string
    function stringToHue(str) {
        // Specific color overrides for known users
        const colors = {
            '來夏': 35,  // Orange/Gold
            '湊斗': 210, // Blue
            '和奏': 320  // Pink/Magenta
        };
        if (colors[str]) return colors[str];

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash % 360;
    }
});
