/**
 * Money Tracker – Core Application Script
 * Clean, Streamlined & Minimalist Personal Finance Engine
 */
const app = (() => {
  'use strict';
  const STORAGE_KEY = 'money_tracker_data_v1', CURRENCY = '₹';
  const $ = id => document.getElementById(id);
  const getToday = () => new Date().toISOString().slice(0, 10);

  let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { incomes: [], expenses: [] };
  let currentMonth = new Date().toISOString().slice(0, 7), activeView = 'dashboard';
  let charts = { incExp: null, cat: null };

  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); };
  const uid = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const curr = n => `${CURRENCY}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = d => {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return y && m && day ? new Date(y, m - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : d;
  };

  const getIncomes = (m = currentMonth) => state.incomes.filter(i => i.date?.startsWith(m));
  const getExpenses = (m = currentMonth) => state.expenses.filter(e => e.date?.startsWith(m));
  const sumIncomes = (m = currentMonth) => getIncomes(m).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const sumExpenses = (m = currentMonth) => getExpenses(m).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const toast = msg => {
    const box = $('toastBox');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  const openModal = (type, id = null) => {
    const modal = $('appModal'), title = $('modalTitle'), body = $('modalBody');
    if (!modal || !title || !body) return;
    modal.classList.add('show');
    const isInc = type === 'income';
    const item = (isInc ? state.incomes : state.expenses).find(x => x.id === id) || {};
    title.textContent = `${id ? 'Edit' : 'Add'} ${isInc ? 'Income Record' : 'Daily Expense'}`;

    const incSources = ['Salary', 'Pocket Money', 'Scholarship', 'Freelancing', 'Other Income'];
    const expCats = ['Food', 'Travel', 'Shopping', 'Education', 'Rent', 'Electricity', 'Mobile Recharge', 'Entertainment', 'Health', 'Other'];
    const payMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'];

    body.innerHTML = `
      <input type="hidden" id="editId" value="${id || ''}"><input type="hidden" id="modalType" value="${type}">
      <div class="form-group"><label>Amount (${CURRENCY}) *</label><input type="number" id="fAmount" class="input" step="0.01" min="0.01" value="${item.amount || ''}" placeholder="0.00" required></div>
      <div class="form-group"><label>Date *</label><input type="date" id="fDate" class="input" value="${item.date || getToday()}" required></div>
      <div class="form-group"><label>${isInc ? 'Source' : 'Category'} *</label><select id="${isInc ? 'fSource' : 'fCat'}" class="input">${(isInc ? incSources : expCats).map(o => `<option value="${o}" ${item[isInc ? 'source' : 'category'] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      ${isInc ? '' : `<div class="form-group"><label>Payment Method *</label><select id="fPay" class="input">${payMethods.map(p => `<option value="${p}" ${item.paymentMethod === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>`}
      <div class="form-group"><label>${isInc ? 'Description' : 'Notes'}</label><input type="text" id="${isInc ? 'fDesc' : 'fNotes'}" class="input" value="${(isInc ? item.description : item.notes) || ''}" placeholder="${isInc ? 'e.g. Monthly stipend' : 'e.g. Lunch, groceries'}"></div>
    `;
  };

  const closeModal = () => $('appModal')?.classList.remove('show');

  const handleModalSubmit = e => {
    e.preventDefault();
    const type = $('modalType').value, id = $('editId').value;
    const amount = parseFloat($('fAmount').value), date = $('fDate').value;
    if (!amount || amount <= 0) return toast('Please enter a valid positive amount');
    if (!date) return toast('Please select a valid date');

    const isInc = type === 'income';
    const record = isInc 
      ? { id: id || uid('inc'), amount, date, source: $('fSource').value, description: $('fDesc').value.trim() }
      : { id: id || uid('exp'), amount, date, category: $('fCat').value, paymentMethod: $('fPay').value, notes: $('fNotes').value.trim() };

    const targetList = isInc ? state.incomes : state.expenses;
    if (id) {
      const idx = targetList.findIndex(x => x.id === id);
      if (idx !== -1) targetList[idx] = record;
      toast(`${isInc ? 'Income' : 'Expense'} record updated`);
    } else {
      targetList.push(record);
      toast(`${isInc ? 'Income' : 'Expense'} record added`);
    }
    currentMonth = date.slice(0, 7);
    closeModal();
    save();
  };

  const deleteRecord = (col, id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      state[col] = state[col].filter(x => x.id !== id);
      toast('Record deleted');
      save();
    }
  };

  const getLast6Months = () => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7);
  });

  const renderCharts = () => {
    if (activeView !== 'dashboard') return;
    const c1 = $('chartIncomeExpense'), c2 = $('chartCategoryBreakdown');
    if (c1) {
      if (charts.incExp) charts.incExp.destroy();
      const months = getLast6Months();
      charts.incExp = new Chart(c1, {
        type: 'bar',
        data: {
          labels: months.map(m => new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' })),
          datasets: [
            { label: 'Income', data: months.map(m => sumIncomes(m)), backgroundColor: '#15803d', borderRadius: 4 },
            { label: 'Expenses', data: months.map(m => sumExpenses(m)), backgroundColor: '#b91c1c', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#64748b', font: { family: 'Plus Jakarta Sans', weight: 600 } } } },
          scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => CURRENCY + Number(v).toLocaleString() } } }
        }
      });
    }

    if (c2) {
      if (charts.cat) charts.cat.destroy();
      const map = {};
      getExpenses().forEach(e => { map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0); });
      const cats = Object.keys(map), vals = Object.values(map);
      charts.cat = new Chart(c2, {
        type: 'doughnut',
        data: {
          labels: cats.length ? cats : ['No Expenses'],
          datasets: [{ data: cats.length ? vals : [1], backgroundColor: cats.length ? ['#334155', '#475569', '#64748b', '#0284c7', '#059669', '#d97706', '#b91c1c', '#7c3aed', '#0f766e', '#94a3b8'] : ['#e2e8f0'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, color: '#64748b' } } } }
      });
    }
  };

  const renderRecentTable = () => {
    const list = [
      ...state.incomes.map(i => ({ ...i, type: 'income', label: i.source, text: i.description })),
      ...state.expenses.map(e => ({ ...e, type: 'expense', label: e.category, text: e.notes }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const tbody = $('dashRecentTable');
    if (tbody) tbody.innerHTML = list.length ? list.map(x => `
      <tr>
        <td>${fmtDate(x.date)}</td>
        <td><span class="badge ${x.type === 'income' ? 'badge-inc' : 'badge-exp'}">${x.type === 'income' ? 'Income' : 'Expense'}</span></td>
        <td><strong>${x.label}</strong></td><td>${x.text || '-'}</td>
        <td class="${x.type === 'income' ? 'text-inc' : 'text-exp'} font-mono font-bold">${x.type === 'income' ? '+' : '-'}${curr(x.amount)}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center; padding:1.25rem; color:#64748b;">No transactions recorded yet</td></tr>';
  };

  const renderIncome = () => {
    if ($('incomeViewTotal')) $('incomeViewTotal').textContent = curr(sumIncomes());
    const srcF = $('incomeSourceFilter')?.value || 'ALL', q = ($('incomeSearchInput')?.value || '').toLowerCase().trim();
    const list = getIncomes().filter(i => (srcF === 'ALL' || i.source === srcF) && (!q || i.description?.toLowerCase().includes(q) || i.source.toLowerCase().includes(q))).sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = $('incomeTableBody');
    if (tbody) tbody.innerHTML = list.length ? list.map(i => `
      <tr>
        <td>${fmtDate(i.date)}</td><td><span class="badge badge-inc">${i.source}</span></td><td><strong>${i.description || 'Income'}</strong></td>
        <td class="text-inc font-bold font-mono">+${curr(i.amount)}</td>
        <td class="text-right">
          <button class="btn-link" onclick="app.openModal('income', '${i.id}')">Edit</button> |
          <button class="btn-link text-exp" onclick="app.deleteRecord('incomes', '${i.id}')">Delete</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">No income records found</td></tr>';
  };

  const renderExpenses = () => {
    if ($('expenseViewTotal')) $('expenseViewTotal').textContent = curr(sumExpenses());
    const catF = $('expenseCategoryFilter')?.value || 'ALL', payF = $('expensePaymentFilter')?.value || 'ALL', q = ($('expenseSearchInput')?.value || '').toLowerCase().trim();
    const list = getExpenses().filter(e => (catF === 'ALL' || e.category === catF) && (payF === 'ALL' || e.paymentMethod === payF) && (!q || e.notes?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))).sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = $('expenseTableBody');
    if (tbody) tbody.innerHTML = list.length ? list.map(e => `
      <tr>
        <td>${fmtDate(e.date)}</td><td><span class="badge badge-exp">${e.category}</span></td><td><small class="badge">${e.paymentMethod}</small></td><td>${e.notes || '-'}</td>
        <td class="text-exp font-bold font-mono">-${curr(e.amount)}</td>
        <td class="text-right">
          <button class="btn-link" onclick="app.openModal('expense', '${e.id}')">Edit</button> |
          <button class="btn-link text-exp" onclick="app.deleteRecord('expenses', '${e.id}')">Delete</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">No expenses recorded</td></tr>';
  };

  const renderTransactions = () => {
    const q = ($('txSearchInput')?.value || '').toLowerCase().trim(), typeF = $('txTypeFilter')?.value || 'ALL', catF = $('txCategoryFilter')?.value || 'ALL', from = $('txFromDate')?.value, to = $('txToDate')?.value;
    const list = [
      ...state.incomes.map(i => ({ ...i, type: 'income', label: i.source, text: i.description, pay: '-' })),
      ...state.expenses.map(e => ({ ...e, type: 'expense', label: e.category, text: e.notes, pay: e.paymentMethod }))
    ].filter(x => (typeF === 'ALL' || x.type === typeF) && (catF === 'ALL' || x.label === catF) && (!from || x.date >= from) && (!to || x.date <= to) && (!q || (x.label + (x.text || '') + (x.pay || '')).toLowerCase().includes(q))).sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = $('txHistoryTableBody');
    if (tbody) tbody.innerHTML = list.length ? list.map(x => `
      <tr>
        <td><span class="badge ${x.type === 'income' ? 'badge-inc' : 'badge-exp'}">${x.type === 'income' ? 'Income' : 'Expense'}</span></td>
        <td>${fmtDate(x.date)}</td><td><strong>${x.label}</strong></td><td><small class="badge">${x.pay}</small></td><td>${x.text || '-'}</td>
        <td class="${x.type === 'income' ? 'text-inc' : 'text-exp'} font-bold font-mono">${x.type === 'income' ? '+' : '-'}${curr(x.amount)}</td>
        <td class="text-right">
          <button class="btn-link" onclick="app.openModal('${x.type}', '${x.id}')">Edit</button> |
          <button class="btn-link text-exp" onclick="app.deleteRecord('${x.type === 'income' ? 'incomes' : 'expenses'}', '${x.id}')">Delete</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">No transactions match your search filter</td></tr>';
  };

  const resetTxFilters = () => {
    ['txSearchInput', 'txFromDate', 'txToDate'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('txTypeFilter')) $('txTypeFilter').value = 'ALL';
    if ($('txCategoryFilter')) $('txCategoryFilter').value = 'ALL';
    renderTransactions();
  };

  const renderReports = () => {
    const period = $('reportPeriodSelect')?.value || 'month';
    let incs = state.incomes, exps = state.expenses;
    if (period === 'month') { incs = getIncomes(); exps = getExpenses(); }
    else if (period === 'year') {
      const y = currentMonth.slice(0, 4);
      incs = incs.filter(i => i.date?.startsWith(y));
      exps = exps.filter(e => e.date?.startsWith(y));
    }

    const inflow = incs.reduce((s, i) => s + (Number(i.amount) || 0), 0), outflow = exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const net = inflow - outflow, rate = inflow > 0 ? Math.max(0, Math.round((net / inflow) * 100)) : 0, days = period === 'month' ? 30 : 365;

    if ($('repTotalIncome')) $('repTotalIncome').textContent = curr(inflow);
    if ($('repTotalExpense')) $('repTotalExpense').textContent = curr(outflow);
    if ($('repNetSavings')) $('repNetSavings').textContent = curr(net);
    if ($('repSavingsRate')) $('repSavingsRate').textContent = `${rate}%`;
    if ($('repDailyAverage')) $('repDailyAverage').textContent = curr(outflow / (days || 1));

    const map = {};
    exps.forEach(e => { map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0); });
    const sorted = Object.keys(map).sort((a, b) => map[b] - map[a]);
    if ($('repTopCategory')) $('repTopCategory').textContent = sorted.length ? `${sorted[0]} (${curr(map[sorted[0]])})` : 'None';

    const catTbody = $('repCategoryTableBody');
    if (catTbody) catTbody.innerHTML = sorted.length ? sorted.map(c => `
      <tr><td><strong>${c}</strong></td><td class="text-exp font-bold font-mono">${curr(map[c])}</td><td>${outflow > 0 ? Math.round((map[c] / outflow) * 100) : 0}%</td></tr>
    `).join('') : '<tr><td colspan="3" style="text-align:center;">No data available</td></tr>';

    const monthTbody = $('repMonthlyTableBody');
    if (monthTbody) monthTbody.innerHTML = getLast6Months().map(m => {
      const iAmt = sumIncomes(m), eAmt = sumExpenses(m), nAmt = iAmt - eAmt;
      return `<tr><td><strong>${new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</strong></td><td class="text-inc font-bold font-mono">+${curr(iAmt)}</td><td class="text-exp font-bold font-mono">-${curr(eAmt)}</td><td class="${nAmt >= 0 ? 'text-inc' : 'text-exp'} font-bold font-mono">${curr(nAmt)}</td></tr>`;
    }).join('');
  };

  const exportCSV = () => {
    const list = [
      ...state.incomes.map(i => ({ date: i.date, type: 'INCOME', category: i.source, amount: i.amount, notes: i.description || '' })),
      ...state.expenses.map(e => ({ date: e.date, type: 'EXPENSE', category: e.category, amount: e.amount, notes: `${e.paymentMethod} - ${e.notes || ''}` }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!list.length) return toast('No transaction records to export');
    const rows = [['Date', 'Type', 'Category_Or_Source', 'Amount', 'Notes_Payment'].join(',')];
    list.forEach(i => rows.push([`"${i.date}"`, `"${i.type}"`, `"${i.category}"`, `"${i.amount}"`, `"${(i.notes || '').replace(/"/g, '""')}"`].join(',')));
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    a.download = `MoneyTracker_Transactions_${getToday()}.csv`;
    a.click();
    toast('CSV file exported');
  };

  const exportBackup = () => {
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    a.download = `MoneyTracker_Backup_${getToday()}.json`;
    a.click();
    toast('Backup file downloaded');
  };

  const restoreBackup = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const p = JSON.parse(ev.target.result);
        if (typeof p !== 'object' || !p) throw new Error();
        state = { incomes: Array.isArray(p.incomes) ? p.incomes : [], expenses: Array.isArray(p.expenses) ? p.expenses : [] };
        save();
        e.target.value = '';
        toast('Database successfully restored');
      } catch (err) { toast('Invalid JSON backup file'); }
    };
    reader.readAsText(file);
  };

  const render = () => {
    const picker = $('globalMonthPicker');
    if (picker) picker.value = currentMonth;
    const totInc = sumIncomes(), totExp = sumExpenses(), net = totInc - totExp;
    if ($('sidebarNetBalance')) $('sidebarNetBalance').textContent = curr(net);
    if ($('sidebarMonthLabel')) $('sidebarMonthLabel').textContent = new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if ($('navIncBadge')) $('navIncBadge').textContent = getIncomes().length;
    if ($('navExpBadge')) $('navExpBadge').textContent = getExpenses().length;
    if ($('kpiIncome')) $('kpiIncome').textContent = curr(totInc);
    if ($('kpiIncomeCount')) $('kpiIncomeCount').textContent = `${getIncomes().length} records`;
    if ($('kpiExpense')) $('kpiExpense').textContent = curr(totExp);
    if ($('kpiExpenseCount')) $('kpiExpenseCount').textContent = `${getExpenses().length} records`;
    if ($('kpiBalance')) $('kpiBalance').textContent = curr(net);
    const kpiStatus = $('kpiBalanceStatus');
    if (kpiStatus) {
      kpiStatus.textContent = net > 0 ? 'Surplus' : (net < 0 ? 'Deficit' : 'Balanced');
      kpiStatus.className = 'badge ' + (net > 0 ? 'badge-inc' : (net < 0 ? 'badge-exp' : ''));
    }
    renderCharts();
    renderRecentTable();
    renderIncome();
    renderExpenses();
    renderTransactions();
    renderReports();
    if (window.lucide) window.lucide.createIcons();
  };

  const nav = view => {
    activeView = view;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    const titles = {
      dashboard: ['Dashboard', 'Track your daily income and expenditures'],
      income: ['Income Management', 'Record and track all your earning channels'],
      expenses: ['Expense Management', 'Log and review daily spending habits'],
      transactions: ['Transaction History', 'Unified ledger of all cash flow'],
      reports: ['Reports & Summary', 'Audited performance and cash flow comparisons'],
      settings: ['Backup & Data', 'Export or restore your records safely']
    };
    if (titles[view]) {
      if ($('pageTitle')) $('pageTitle').textContent = titles[view][0];
      if ($('pageSubtitle')) $('pageSubtitle').textContent = titles[view][1];
    }
    $('sidebar')?.classList.remove('open');
    $('sidebarBackdrop')?.classList.remove('open');
    render();
  };

  const init = () => {
    window.onhashchange = () => nav(location.hash.replace('#', '') || 'dashboard');
    document.querySelectorAll('[data-view]').forEach(link => {
      link.onclick = e => { e.preventDefault(); location.hash = link.dataset.view; };
    });
    if ($('globalMonthPicker')) $('globalMonthPicker').onchange = e => { currentMonth = e.target.value; render(); };
    if ($('menuBtn')) $('menuBtn').onclick = () => { $('sidebar').classList.add('open'); $('sidebarBackdrop').classList.add('open'); };
    const closeSide = () => { $('sidebar')?.classList.remove('open'); $('sidebarBackdrop')?.classList.remove('open'); };
    if ($('closeSidebarBtn')) $('closeSidebarBtn').onclick = closeSide;
    if ($('sidebarBackdrop')) $('sidebarBackdrop').onclick = closeSide;

    if ($('modalForm')) $('modalForm').onsubmit = handleModalSubmit;
    if ($('appModal')) $('appModal').onclick = e => { if (e.target.id === 'appModal') closeModal(); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    ['txSearchInput', 'txTypeFilter', 'txCategoryFilter', 'txFromDate', 'txToDate'].forEach(id => {
      const el = $(id);
      if (el) { el.oninput = renderTransactions; el.onchange = renderTransactions; }
    });

    if (location.hash) nav(location.hash.replace('#', ''));
    else render();
  };

  document.addEventListener('DOMContentLoaded', init);
  return { openModal, closeModal, deleteRecord, renderIncome, renderExpenses, renderReports, resetTxFilters, exportCSV, exportBackup, restoreBackup, nav };
})();
