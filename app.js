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

// Dynamic Project Loader from projects.json
async function loadPortfolioProjects() {
  const container = document.getElementById('projectsContainer');
  if (!container) return;

  try {
    // Cache-busting query to guarantee fresh data on every update
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

      // 3. Spreadsheet Data Cleaning comparison (Before & After)
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

      // 4. Data Preview Comparison (Raw vs Cleaned First Few Rows)
      else if (p.type === 'data_preview_comparison') {
        const renderTableRows = (dataObj) => `
          <div class="overflow-x-auto rounded-xl border border-dark-border bg-dark-bg/80">
            <table class="w-full text-left font-mono text-xs">
              <thead class="border-b border-dark-border bg-dark-card/60 text-[11px] text-gray-400">
                <tr>
                  <th class="px-3 py-2 text-center text-gray-500 w-8">#</th>
                  ${dataObj.headers.map(h => `<th class="px-3 py-2 font-semibold text-gray-300">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/40 text-gray-300">
                ${dataObj.rows.map((row, idx) => `
                  <tr class="hover:bg-dark-card/30 transition-colors">
                    <td class="px-3 py-1.5 text-center text-gray-500 text-[10px]">${idx + 1}</td>
                    ${row.map(cell => `<td class="px-3 py-1.5 whitespace-nowrap">${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        mediaHtml = `
          <div class="space-y-4">
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${p.summary}</p>
            
            <div class="flex items-center gap-2 pt-1">
              <span class="text-xs font-semibold text-gray-400">Dataset Inspection:</span>
              <button onclick="switchDataPreview('${p.id}', 'raw', this)" class="preview-btn-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950 text-red-300 border border-red-800/50 shadow-sm transition-all">
                <i class="fa-solid fa-triangle-exclamation mr-1.5"></i> Raw Data (First 5 Rows)
              </button>
              <button onclick="switchDataPreview('${p.id}', 'cleaned', this)" class="preview-btn-${p.id} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all">
                <i class="fa-solid fa-circle-check mr-1.5 text-emerald-400"></i> Cleaned Pipeline Output
              </button>
            </div>

            <div id="preview-raw-${p.id}">
              <span class="text-[11px] font-mono text-red-400 block mb-1.5"><i class="fa-solid fa-bug mr-1"></i> Input Stage: Uncleaned string formats, nulls, negative values, and inconsistent casing:</span>
              ${renderTableRows(p.raw_preview)}
            </div>

            <div id="preview-cleaned-${p.id}" style="display: none;">
              <span class="text-[11px] font-mono text-emerald-400 block mb-1.5"><i class="fa-solid fa-check-double mr-1"></i> Output Stage: Imputed values, ISO standard date stamps, standardized floats, clean categorical strings:</span>
              ${renderTableRows(p.cleaned_preview)}
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

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-red-400 text-sm">Failed to load projects: ${err.message}. Check that projects.json is present in the root repository.</div>`;
  }
}

// Helper: gallery tabs
function highlightGalleryTab(btn, projectId) {
  document.querySelectorAll('.gallery-tab-' + projectId).forEach(b => {
    b.className = `gallery-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-300 hover:text-white transition-all`;
  });
  btn.className = `gallery-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white shadow-md transition-all`;
}

// Helper: spreadsheet tabs
function toggleSheet(projectId, embedUrl, btn) {
  const frame = document.getElementById('sheetFrame-' + projectId);
  if (frame) frame.src = embedUrl;
  document.querySelectorAll('.sheet-tab-' + projectId).forEach(b => {
    b.className = `sheet-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all`;
  });
  btn.className = `sheet-tab-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white shadow-md transition-all`;
}

// Helper: switch raw vs cleaned table preview
function switchDataPreview(projectId, state, btn) {
  const rawDiv = document.getElementById(`preview-raw-${projectId}`);
  const cleanDiv = document.getElementById(`preview-cleaned-${projectId}`);
  if (!rawDiv || !cleanDiv) return;
  
  document.querySelectorAll(`.preview-btn-${projectId}`).forEach(b => {
    b.className = `preview-btn-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-bg border border-dark-border text-gray-400 hover:text-white transition-all`;
  });

  if (state === 'raw') {
    rawDiv.style.display = 'block';
    cleanDiv.style.display = 'none';
    btn.className = `preview-btn-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950 text-red-300 border border-red-800/50 shadow-sm transition-all`;
  } else {
    rawDiv.style.display = 'none';
    cleanDiv.style.display = 'block';
    btn.className = `preview-btn-${projectId} px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50 shadow-sm transition-all`;
  }
}

// Initialize projects on load
window.addEventListener('DOMContentLoaded', loadPortfolioProjects);
