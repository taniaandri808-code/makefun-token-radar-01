(async function() {
  let radarData = window.RADAR || null;
  let boardRows = [];

  try {
    const res = await fetch('../board.json');
    if (res.ok) {
      const data = await res.json();
      boardRows = data.rows || [];
    }
  } catch (e) {
    try {
      const res2 = await fetch('board.json');
      if (res2.ok) {
        const data2 = await res2.json();
        boardRows = data2.rows || [];
      }
    } catch (err) {
      // fallback
    }
  }

  if (boardRows.length === 0 && radarData && radarData.rows) {
    boardRows = radarData.rows.map(r => ({
      ...r,
      token_status: 'pre-token',
      model: {
        base_multiple: 0.25,
        growth_pct: r.change_7d || 0,
        growth_multiplier: r.growth_multiplier,
        maturity_multiplier: r.maturity_multiplier,
        age_days: r.age_days
      },
      farm_steps: [
        "Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: under $3 of gas for the first transaction. Time: 5 minutes",
        "Deposit $100 of USDC into the protocol on its main chain and keep the position open. Cost: $100 of capital and about $4 of gas. Time: 15 minutes to set up",
        "Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote. Cost: about $2 of gas a week. Time: 10 minutes a week",
        "Hold the position for at least 30 days so the activity is counted in more than one snapshot. Cost: the $100 stays in the position. Time: 30 days",
        "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes. Cost: no fee to check, and never pay to claim. Time: 10 minutes",
        "Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it. Cost: nothing but the log. Time: 5 minutes"
      ]
    }));
  }

  const watchlistSlugs = new Set();
  const watchlistSize = radarData ? (radarData.watchlist_size || 40) : 40;
  for (let i = 0; i < Math.min(watchlistSize, boardRows.length); i++) {
    watchlistSlugs.add(boardRows[i].slug);
  }

  const metaInfo = document.getElementById('metaInfo');
  const boardView = document.getElementById('boardView');
  const detailView = document.getElementById('detailView');
  const boardTableBody = document.getElementById('boardTableBody');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const chainFilter = document.getElementById('chainFilter');
  const watchlistToggle = document.getElementById('watchlistToggle');
  const backBtn = document.getElementById('backBtn');
  const detailContent = document.getElementById('detailContent');

  if (radarData && metaInfo) {
    metaInfo.textContent = 'As of ' + radarData.as_of + ' | Source: ' + radarData.source + ' | Board: ' + boardRows.length + ' protocols';
  }

  const categories = new Set();
  const chains = new Set();
  boardRows.forEach(r => {
    if (r.category) categories.add(r.category);
    if (Array.isArray(r.chains)) {
      r.chains.forEach(c => chains.add(c));
    }
  });

  [...categories].sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  [...chains].sort().forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch;
    opt.textContent = ch;
    chainFilter.appendChild(opt);
  });

  let currentSort = { column: 'rank', asc: true };

  function formatUsd(val) {
    if (val === null || val === undefined) return 'N/A';
    if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return '$' + (val / 1e3).toFixed(1) + 'K';
    return '$' + val.toLocaleString();
  }

  function formatPct(val) {
    if (val === null || val === undefined) return '0.0%';
    const sign = val > 0 ? '+' : '';
    return sign + val.toFixed(1) + '%';
  }

  function renderTable() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedCat = categoryFilter.value;
    const selectedChain = chainFilter.value;
    const onlyWatchlist = watchlistToggle.checked;

    let filtered = boardRows.filter(r => {
      if (onlyWatchlist && !watchlistSlugs.has(r.slug)) return false;
      if (selectedCat && r.category !== selectedCat) return false;
      if (selectedChain && (!r.chains || !r.chains.includes(selectedChain))) return false;
      if (query) {
        const text = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + (r.chains || []).join(' ')).toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let valA = a[currentSort.column];
      let valB = b[currentSort.column];
      if (currentSort.column === 'name' || currentSort.column === 'slug') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      } else {
        valA = valA ?? 0;
        valB = valB ?? 0;
      }
      if (valA < valB) return currentSort.asc ? -1 : 1;
      if (valA > valB) return currentSort.asc ? 1 : -1;
      return 0;
    });

    boardTableBody.innerHTML = '';
    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching protocols found.</td>';
      boardTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.addEventListener('click', () => showDetail(r));

      const changeClass = (r.change_7d ?? 0) >= 0 ? 'positive' : 'negative';
      const changeStr = formatPct(r.change_7d);
      const ageStr = r.age_days !== null ? r.age_days + ' days' : 'Unknown (365d)';
      const chainStr = Array.isArray(r.chains) && r.chains.length > 0 ? r.chains.slice(0, 2).join(', ') : 'Multi-chain';
      const scoreMult = ((r.growth_multiplier || 1) * (r.maturity_multiplier || 1)).toFixed(2) + 'x';

      tr.innerHTML = '<td><strong>#' + r.rank + '</strong></td>' +
        '<td><div class="proto-cell"><span class="proto-name">' + r.name + '</span><span class="proto-meta">' + (r.category || 'DeFi') + ' &bull; ' + chainStr + '</span></div></td>' +
        '<td>' + formatUsd(r.tvl_usd) + '</td>' +
        '<td><span class="' + changeClass + '">' + changeStr + '</span></td>' +
        '<td>' + ageStr + '</td>' +
        '<td><strong>' + formatUsd(r.implied_value_usd) + '</strong></td>' +
        '<td>' + scoreMult + '</td>';
      boardTableBody.appendChild(tr);
    });
  }

  function showDetail(r) {
    boardView.classList.add('hidden');
    detailView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const changeClass = (r.change_7d ?? 0) >= 0 ? 'positive' : 'negative';
    const changeStr = formatPct(r.change_7d);
    const ageStr = r.age_days !== null ? r.age_days + ' days' : 'Unknown (default 365 days)';
    const chainsList = Array.isArray(r.chains) ? r.chains.join(', ') : 'None';
    const model = r.model || { base_multiple: 0.25, growth_pct: r.change_7d || 0, growth_multiplier: r.growth_multiplier || 1, maturity_multiplier: r.maturity_multiplier || 1, age_days: r.age_days };

    let stepsHtml = '';
    const steps = r.farm_steps || [];
    steps.forEach((stepText, idx) => {
      stepsHtml += '<li class="farm-step-item">' +
        '<div class="farm-step-num">' + (idx + 1) + '.</div>' +
        '<div class="farm-step-text">' + stepText + '</div>' +
        '</li>';
    });

    detailContent.innerHTML = '<div class="detail-header">' +
      '<div class="detail-title-row">' +
      '<div class="detail-title">' +
      '<div class="detail-category">' + (r.category || 'DeFi') + ' &bull; ' + chainsList + '</div>' +
      '<h2>' + r.name + '</h2>' +
      '<div class="proto-meta" style="margin-top: 0.25rem;">Slug: <code>' + r.slug + '</code> &bull; Global Rank #' + r.rank + '</div>' +
      '</div>' +
      '<div class="detail-implied-box">' +
      '<div class="detail-implied-label">Implied Token Value</div>' +
      '<div class="detail-implied-value">' + formatUsd(r.implied_value_usd) + '</div>' +
      '</div>' +
      '</div>' +
      '<h3 style="font-size: 1.125rem; margin: 1.5rem 0 1rem 0; color: var(--text-main);">Score Breakdown & Protocol Numbers</h3>' +
      '<div class="detail-metrics-grid">' +
      '<div class="metric-card"><div class="metric-label">TVL (Total Value Locked)</div><div class="metric-val">' + formatUsd(r.tvl_usd) + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">7d TVL Change</div><div class="metric-val ' + changeClass + '">' + changeStr + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">Protocol Age</div><div class="metric-val" style="font-size: 1rem; margin-top: 0.25rem;">' + ageStr + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">Base Multiple</div><div class="metric-val">' + model.base_multiple + 'x</div></div>' +
      '<div class="metric-card"><div class="metric-label">Growth Multiplier</div><div class="metric-val">' + (model.growth_multiplier).toFixed(4) + 'x</div></div>' +
      '<div class="metric-card"><div class="metric-label">Maturity Multiplier</div><div class="metric-val">' + (model.maturity_multiplier).toFixed(4) + 'x</div></div>' +
      '</div>' +
      '</div>' +
      '<div class="farm-plan-section">' +
      '<h3>Actionable Farm Plan (' + steps.length + ' Steps)</h3>' +
      '<ul class="farm-steps-list">' + stepsHtml + '</ul>' +
      '</div>';
  }

  backBtn.addEventListener('click', () => {
    detailView.classList.add('hidden');
    boardView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  searchInput.addEventListener('input', renderTable);
  categoryFilter.addEventListener('change', renderTable);
  chainFilter.addEventListener('change', renderTable);
  watchlistToggle.addEventListener('change', renderTable);

  document.querySelectorAll('#boardTable th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (currentSort.column === col) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.column = col;
        currentSort.asc = (col === 'rank' || col === 'name');
      }
      renderTable();
    });
  });

  renderTable();
})();
