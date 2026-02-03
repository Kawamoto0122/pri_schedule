document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // State Application
    // ----------------------------------------------------
    const API_URL = 'https://script.google.com/macros/s/AKfycbwR729mFW8nZn91aJVfrxTWyM9aIcLdAqFYAf_PjPqpQ459O2ncAMWHK4gz_GIGM-Wv/exec';

    // Local state to hold data for rendering
    let appData = {
        records: []
    };

    // Dashboard State
    let currentDashboardDate = new Date();

    // Elements
    const form = document.getElementById('rewardForm');
    const historyList = document.getElementById('historyList');
    const totalAmountEl = document.getElementById('totalAmount');
    const loadingDateEl = document.getElementById('currentDate');
    const progressListEl = document.getElementById('progressList');
    const toast = document.getElementById('toast');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Dashboard Nav Elements
    const dashboardTitle = document.getElementById('dashboardTitle');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const resetMonthBtn = document.getElementById('resetMonthBtn');

    // Task Type Definitions
    const TASK_TYPES = {
        'お風呂掃除': 50,
        '食器洗い': 20,
        '猫のトイレ掃除 ※1階&2階': 20,
        'ゴミ捨て': 10,
        '雑巾がけ床【1階】': 30,
        '雑巾がけ床【2階】': 50,
        'テスト80点以上': 50,
        'テスト90点以上': 100,
        'その他': null
    };

    // ----------------------------------------------------
    // Initialization
    // ----------------------------------------------------
    updateDate();
    fetchData(); // Initial load

    // ----------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------
    // Auto-fill amount based on type
    const typeSelect = document.getElementById('type');
    const amountInput = document.getElementById('amount');

    if (typeSelect && amountInput) {
        typeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            const price = TASK_TYPES[selectedType];

            if (price !== null) {
                amountInput.value = price;
                amountInput.readOnly = true;
                amountInput.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'; // Visual cue
            } else {
                amountInput.value = '';
                amountInput.readOnly = false;
                amountInput.style.backgroundColor = '';
                amountInput.focus();
            }
        });
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const registrant = document.getElementById('registrant').value.trim();
        const type = document.getElementById('type').value;
        const amount = parseInt(document.getElementById('amount').value);

        if (!registrant || !type || isNaN(amount)) return;

        // Show loading state or disable button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> 送信中...';

        const newRecord = {
            id: Date.now().toString(),
            registrant,
            type,
            amount,
            date: new Date().toISOString()
        };

        try {
            await postData('add', newRecord);

            form.reset();
            showToast('登録しました！');

            // Refresh data
            await fetchData();
        } catch (error) {
            console.error('Save error:', error);
            showToast('エラーが発生しました: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    clearHistoryBtn.addEventListener('click', () => {
        alert('共有データの安全のため、全履歴削除機能は無効化されています。');
    });
});

// Month Navigation Listeners
if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        currentDashboardDate.setMonth(currentDashboardDate.getMonth() - 1);
        renderDashboard();
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        currentDashboardDate.setMonth(currentDashboardDate.getMonth() + 1);
        renderDashboard();
    });
}

if (resetMonthBtn) {
    resetMonthBtn.addEventListener('click', () => {
        currentDashboardDate = new Date();
        renderDashboard();
    });
}

// ----------------------------------------------------
// Logic & Utilities
// ----------------------------------------------------
async function fetchData() {
    renderLoadingState();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        appData.records = data;
        renderUI();
    } catch (error) {
        console.error('Fetch error:', error);
        historyList.innerHTML = '<li class="empty-state" style="color:red;">データの読み込みに失敗しました。<br>再読み込みしてください。</li>';
        showToast('読み込みエラー');
    }
}

async function postData(action, data) {
    // GAS Web App simple POST
    const payload = JSON.stringify({
        action: action,
        data: data,
        id: data?.id || data
    });

    // Use no-cors mode requires backend strictly returning text/plain or handling it?
    // Actually, 'cors' mode is cleaner if GAS returns proper headers.
    // Standard GAS Web App setups usually handle simple POSTs well if they return JSON and followed redirects.
    const response = await fetch(API_URL, {
        method: 'POST',
        body: payload
    });

    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    return result;
}

async function deleteRecord(id) {
    if (!confirm('この記録を削除しますか？')) return;

    const item = document.querySelector(`button[data-id="${id}"]`).closest('.history-item');
    if (item) item.style.opacity = '0.5';

    try {
        await postData('delete', id);
        showToast('削除しました');
        fetchData();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('削除に失敗しました');
        if (item) item.style.opacity = '1';
    }
}

function updateDate() {
    const now = new Date();
    const options = { month: 'numeric', day: 'numeric', weekday: 'short' };
    const dateStr = now.toLocaleDateString('ja-JP', options);
    loadingDateEl.textContent = dateStr;
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
function renderLoadingState() {
    // Only show loading if empty? Or simple spinner overlay?
    // Let's just show spinner in list if it's empty, otherwise maybe toast?
    // For simplicity, just spinner in list for now.
    if (appData.records.length === 0) {
        historyList.innerHTML = '<li class="empty-state"><span class="material-icons-round spin">sync</span> 読み込み中...</li>';
    }
}

function renderUI() {
    renderHistory();
    renderDashboard();
}

function renderHistory() {
    historyList.innerHTML = '';

    if (!appData.records || appData.records.length === 0) {
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
                    <button class="delete-record-btn" title="削除" data-id="${record.id}">
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
    let total = 0;
    const perUser = {};

    // Use the currentDashboardDate state
    const year = currentDashboardDate.getFullYear();
    const month = currentDashboardDate.getMonth();

    // Update Title
    // e.g. "2024年 10月"
    dashboardTitle.textContent = `${year}年 ${month + 1}月 の状況`;

    const currentMonthRecords = appData.records.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    currentMonthRecords.forEach(r => {
        const amt = Number(r.amount);
        total += amt;
        if (perUser[r.registrant]) {
            perUser[r.registrant] += amt;
        } else {
            perUser[r.registrant] = amt;
        }
    });

    totalAmountEl.textContent = formatCurrency(total);

    progressListEl.innerHTML = '';
    const users = Object.keys(perUser).sort((a, b) => perUser[b] - perUser[a]);

    const maxVal = users.length > 0 ? perUser[users[0]] : 1;

    if (users.length === 0) {
        progressListEl.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.9rem;">今月のデータはありません</div>';
    }

    users.forEach(user => {
        const amount = perUser[user];
        const percent = (amount / maxVal) * 100;
        const hue = stringToHue(user);

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

function stringToHue(str) {
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
