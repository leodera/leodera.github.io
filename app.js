// Mobile navigation toggle
const mobileBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

// Copy email to clipboard
function copyEmailToClipboard() {
  navigator.clipboard.writeText('ndifepascal@gmail.com').then(() => {
    const toast = document.getElementById('toastNotification');
    if (toast) {
      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 2500);
    }
  });
}

// Global state tracking for paginated datasets
const previewState = {};

// Dynamic Project Loader from projects.json
async function loadPortfolioProjects() {
  const container = document.getElementById('projectsContainer');
  if (!container) return;

  try {
    const response = await fetch('projects.json?v=' + Date.now());
    if (!response.ok) throw new Error('Could not fetch projects.json');
    const projects = await response.json();
    
    container.innerHTML = projects.map(p => {
      let mediaHtml = '';

      // 1. Power BI image gallery with canvas switcher
      if (p.type === 'powerbi_gallery') {
        const defaultImg = (p.gallery && p.gallery[0]) ? p.gallery[0].url : '';
        const tabsHtml = (p.gallery || []).map((g, idx) => `
          <button onclick="document.getElementById('display-${p.id}').src='${g.url}'; highlightGalleryTab(this, '${p.id}')" 
                  class="gallery-tab-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold ${idx === 0 ? 'bg-amber-600 text-white shadow-md' : 'bg-dark-bg border border-dark-border text-gray-300 hover:text-white'} transition-all">
            ${g.name}
          </button>
        `).join('');

        let tableHtml = '';
        if (p.table) {
          const headersHtml = p.table.headers.map(h => `<th class="pb-1.5">${h}</th>`).join('');
          const rowsHtml = p.table.rows.map(r => `
            <tr>
              <td class="py-1.5">${r[0]}</td>
              <td class="py-1.5">${r[1]}</td>
              <td class="py-1.5 text-right ${r[3] || ''}">${r[2]}</td>
            </tr>
          `).join('');

          tableHtml = `
            <div class="rounded-xl border border-dark-border bg-dark-bg/60 p-3.5 overflow-x-auto mt-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">${p.table.title}</span>
                <span class="text-[10px] text-amber-400 font-medium">${p.table.threshold || ''}</span>
              </div>
              <table class="w-full text-left text-xs">
                <thead class="text-gray-400 border-b border-dark-border text-[11px]">
                  <tr>${headersHtml}</tr>
                </thead>
                <tbody class="divide-y divide-dark-border/40 text-gray-300">
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          `;
        }

        mediaHtml = `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div class="lg:col-span-5 space-y-4">
              <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${p.summary}</p>
              ${tableHtml}
              <div class="pt-2">
                <span class="text-xs font-semibold text-gray-300 block mb-2">Inspect Dashboard Canvas Pages:</span>
                <div class="flex flex-wrap gap-2">${tabsHtml}</div>
              </div>
            </div>
            <div class="lg:col-span-7 bg-dark-bg rounded-xl border border-dark-border p-2 overflow-hidden shadow-2xl">
              <img id="display-${p.id}" src="${defaultImg}" alt="${p.title}" class="w-full h-auto rounded-lg object-contain transition-all duration-300" />
            </div>
          </div>
        `;
      } 
      
      // 2. Interactive Tableau Public or iframe embed
      else if (p.type === 'iframe') {
        mediaHtml = `
          <div class="space-y-4">
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${p.summary}</p>
            <div class="w-full h-[750px] sm:h-[820px] bg-dark-bg rounded-xl border border-dark-border overflow-hidden shadow-2xl">
              <iframe src="${p.embedUrl}" title="${p.title}" class="w-full h-full border-0" allowfullscreen></iframe>
            </div>
          </div>
        `;
      }

      // 3. Spreadsheet Data Cleaning comparison (Before & After Google Sheets embed)
      else if (p.type === 'spreadsheet_comparison') {
        mediaHtml = `
          <div class="space-y-4">
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${p.summary}</p>
            
            <div class="flex items-center gap-2 pt-2">
              <span class="text-xs font-semibold text-gray-300">Data State:</span>
              <button onclick="toggleSheet('${p.id}', '${p.rawSheetEmbed}', this)" class="sheet-tab-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950 text-red-300 border border-red-800/40 transition-all">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i> 1. Raw / Messy Data
              </button>
              <button onclick="toggleSheet('${p.id}', '${p.cleanedSheetEmbed}', this)" class="sheet-tab-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all">
                <i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i> 2. Cleaned &amp; Standardized
              </button>
            </div>

            <div class="w-full h-[550px] bg-dark-bg rounded-xl border border-dark-border overflow-hidden shadow-2xl">
              <iframe id="sheetFrame-${p.id}" src="${p.rawSheetEmbed}" class="w-full h-full border-0" allowfullscreen></iframe>
            </div>
          </div>
        `;
      }

      // 4. Large Dataset Preview Comparison (Supports 1000+ rows with pagination & search)
      else if (p.type === 'data_preview_comparison') {
        // Initialize state for pagination
        previewState[p.id] = {
          currentTab: 'raw',
          page: 1,
          pageSize: 25,
          searchQuery: '',
          raw: p.raw_preview,
          cleaned: p.cleaned_preview
        };

        const totalRaw = p.raw_preview.rows.length;
        const totalCleaned = p.cleaned_preview.rows.length;

        mediaHtml = `
          <div class="space-y-4">
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${p.summary}</p>
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-400">Stage:</span>
                <button onclick="switchDatasetView('${p.id}', 'raw', this)" class="data-tab-btn-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950 text-red-300 border border-red-800/50 shadow-sm transition-all">
                  <i class="fa-solid fa-triangle-exclamation mr-1.5"></i> Raw Data (${totalRaw.toLocaleString()} rows)
                </button>
                <button onclick="switchDatasetView('${p.id}', 'cleaned', this)" class="data-tab-btn-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all">
                  <i class="fa-solid fa-circle-check mr-1.5 text-emerald-400"></i> Cleaned Pipeline Output (${totalCleaned.toLocaleString()} rows)
                </button>
              </div>

              <!-- Quick Search & Page Size Filter -->
              <div class="flex items-center gap-2">
                <div class="relative">
                  <input type="text" placeholder="Search rows..." oninput="handleDatasetSearch('${p.id}', this.value)" 
                         class="bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500 w-36 sm:w-48 pl-7" />
                  <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-gray-500 text-[10px]"></i>
                </div>
                <select onchange="handlePageSizeChange('${p.id}', this.value)" 
                        class="bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-brand-500">
                  <option value="25" selected>25 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                  <option value="250">250 / page</option>
                </select>
              </div>
            </div>

            <!-- Table Container (Sticky Header & Scrollable) -->
            <div id="table-wrapper-${p.id}" class="rounded-xl border border-dark-border bg-dark-bg/90 overflow-hidden shadow-2xl">
              <div class="overflow-x-auto max-h-[500px]">
                <table class="w-full text-left font-mono text-xs border-collapse">
                  <thead id="table-head-${p.id}" class="sticky top-0 z-10 border-b border-dark-border bg-dark-card text-[11px] text-gray-300 shadow-md">
                    <!-- Dynamic Headers Render Here -->
                  </thead>
                  <tbody id="table-body-${p.id}" class="divide-y divide-dark-border/40 text-gray-300">
                    <!-- Dynamic Rows Render Here -->
                  </tbody>
                </table>
              </div>

              <!-- Pagination Toolbar -->
              <div class="p-3 border-t border-dark-border bg-dark-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
                <span id="page-info-${p.id}">Showing rows 1 to 25</span>
                <div class="flex items-center gap-1.5">
                  <button onclick="navigateDatasetPage('${p.id}', 'prev')" class="px-3 py-1 rounded bg-dark-bg border border-dark-border text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i> Prev
                  </button>
                  <span id="page-counter-${p.id}" class="px-2 font-mono text-gray-300">Page 1</span>
                  <button onclick="navigateDatasetPage('${p.id}', 'next')" class="px-3 py-1 rounded bg-dark-bg border border-dark-border text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    Next <i class="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Full Project Card Layout
      const repoBtn = p.repoUrl ? `
        <a href="${p.repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-dark-bg border border-dark-border hover:border-brand-500 text-gray-300 hover:text-white transition-all">
          <i class="fa-brands fa-github text-sm"></i> ${p.repoBtnText || 'View Repo'}
        </a>
      ` : '';

      const extBtn = p.externalUrl ? `
        <a href="${p.externalUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md">
          <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> ${p.externalBtnText || 'Fullscreen'}
        </a>
      ` : '';

      return `
        <div class="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-brand-500/60 transition-all shadow-2xl">
          <div class="p-6 border-b border-dark-border bg-gradient-to-r from-blue-950/40 via-dark-card to-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800/40">${p.badge}</span>
                <span class="text-xs text-gray-400">• ${p.category}</span>
              </div>
              <h3 class="text-xl font-bold text-white mt-1">${p.title}</h3>
            </div>
            <div class="flex items-center gap-3">
              ${repoBtn}
              ${extBtn}
            </div>
          </div>
          <div class="p-6">${mediaHtml}</div>
        </div>
      `;
    }).join('');

    // Trigger initial table rendering for any data_preview_comparison cards
    projects.forEach(p => {
      if (p.type === 'data_preview_comparison') {
        renderDatasetTable(p.id);
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-red-400 text-sm">Failed to load projects: ${err.message}. Check that projects.json is present in the root repository.</div>`;
  }
}

// ================= DATASET VIEWER LOGIC (1000+ ROWS) =================

function renderDatasetTable(projectId) {
  const state = previewState[projectId];
  if (!state) return;

  const activeDataset = state.currentTab === 'raw' ? state.raw : state.cleaned;
  if (!activeDataset) return;

  // Header Rendering
  const thead = document.getElementById(`table-head-${projectId}`);
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th class="px-3 py-2 text-center text-gray-500 w-12">#</th>
        ${activeDataset.headers.map(h => `<th class="px-3 py-2 font-semibold tracking-wider text-gray-300 whitespace-nowrap">${h}</th>`).join('')}
      </tr>
    `;
  }

  // Row Filtering
  let filteredRows = activeDataset.rows;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filteredRows = activeDataset.rows.filter(row => 
      row.some(cell => String(cell).toLowerCase().includes(q))
    );
  }

  // Pagination Slice
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const startIdx = (state.page - 1) * state.pageSize;
  const endIdx = Math.min(startIdx + state.pageSize, totalRows);
  const rowsToDisplay = filteredRows.slice(startIdx, endIdx);

  // Body Rendering
  const tbody = document.getElementById(`table-body-${projectId}`);
  if (tbody) {
    if (rowsToDisplay.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${activeDataset.headers.length + 1}" class="text-center py-8 text-gray-500">No matching records found</td></tr>`;
    } else {
      tbody.innerHTML = rowsToDisplay.map((row, idx) => `
        <tr class="hover:bg-brand-950/20 transition-colors">
          <td class="px-3 py-1.5 text-center text-gray-500 text-[10px] select-none">${startIdx + idx + 1}</td>
          ${row.map(cell => `<td class="px-3 py-1.5 whitespace-nowrap">${cell !== null && cell !== undefined ? cell : '<span class="text-gray-600">null</span>'}</td>`).join('')}
        </tr>
      `).join('');
    }
  }

  // Pagination Meta Updates
  const pageInfo = document.getElementById(`page-info-${projectId}`);
  const pageCounter = document.getElementById(`page-counter-${projectId}`);
  if (pageInfo) {
    pageInfo.innerText = totalRows === 0 ? '0 records' : `Showing ${startIdx + 1} to ${endIdx} of ${totalRows.toLocaleString()} rows`;
  }
  if (pageCounter) {
    pageCounter.innerText = `Page ${state.page} of ${totalPages}`;
  }
}

function switchDatasetView(projectId, viewType, btn) {
  const state = previewState[projectId];
  if (!state) return;

  state.currentTab = viewType;
  state.page = 1; // reset to page 1

  document.querySelectorAll(`.data-tab-btn-${projectId}`).forEach(b => {
    b.className = `data-tab-btn-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all`;
  });

  if (viewType === 'raw') {
    btn.className = `data-tab-btn-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950 text-red-300 border border-red-800/50 shadow-sm transition-all`;
  } else {
    btn.className = `data-tab-btn-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50 shadow-sm transition-all`;
  }

  renderDatasetTable(projectId);
}

function handleDatasetSearch(projectId, query) {
  const state = previewState[projectId];
  if (!state) return;
  state.searchQuery = query;
  state.page = 1;
  renderDatasetTable(projectId);
}

function handlePageSizeChange(projectId, size) {
  const state = previewState[projectId];
  if (!state) return;
  state.pageSize = parseInt(size, 10);
  state.page = 1;
  renderDatasetTable(projectId);
}

function navigateDatasetPage(projectId, direction) {
  const state = previewState[projectId];
  if (!state) return;

  if (direction === 'prev') {
    state.page -= 1;
  } else if (direction === 'next') {
    state.page += 1;
  }
  renderDatasetTable(projectId);
}

// Gallery tab switcher
function highlightGalleryTab(btn, projectId) {
  document.querySelectorAll('.gallery-tab-' + projectId).forEach(b => {
    b.className = `gallery-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-300 hover:text-white transition-all`;
  });
  btn.className = `gallery-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white shadow-md transition-all`;
}

// Spreadsheet switcher
function toggleSheet(projectId, embedUrl, btn) {
  const frame = document.getElementById('sheetFrame-' + projectId);
  if (frame) frame.src = embedUrl;
  document.querySelectorAll('.sheet-tab-' + projectId).forEach(b => {
    b.className = `sheet-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all`;
  });
  btn.className = `sheet-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white shadow-md transition-all`;
}

// Initialize projects on load
window.addEventListener('DOMContentLoaded', loadPortfolioProjects);
