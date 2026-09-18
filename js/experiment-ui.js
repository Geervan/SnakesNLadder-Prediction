/**
 * Snakes & Ladders Lab: Geervan's Experiment UI Controller
 * Renders the verified 100-million-game dataset and manages the live Web Worker simulation suite.
 */

import { BOARDS } from '../data/boards.js';
import { ExperimentPool } from './experiment-pool.js';

export class ExperimentUI {
  constructor(containerId = 'experiment-mount') {
    this.container = document.getElementById(containerId);
    this.pool = null;
    this.officialData = null;
    this.liveMode = false;
    this.liveBoardReports = new Map();
  }

  async init() {
    if (!this.container) return;
    this.renderSkeleton();
    await this.loadOfficialDataset();
    this.renderOfficialView();
    this.initRunnerControls();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="experiment-layout">
        <!-- Top Summary Cards -->
        <div class="experiment-hero-card" id="exp-hero-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <div>
              <div class="badge badge-gold" style="margin-bottom: 6px;">Official Verified Dataset</div>
              <h2 style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: var(--color-wood-dark); margin: 0 0 4px 0;">
                100,000,000 Game Computational Benchmark
              </h2>
              <div style="font-size: 0.82rem; color: var(--text-muted);">
                Exact Markov model integration across 10 distinct 100-square board architectures. 10,000,000 games simulated per board.
              </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm btn-start-live-exp" id="btn-top-start-exp">
                ▶ Run Live Experiment
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-download-json">
                Download dataset (JSON)
              </button>
            </div>
          </div>

          <div class="experiment-kpi-grid" id="exp-kpi-grid">
            <div class="experiment-kpi-box exp-box-sims">
              <span class="experiment-kpi-label">#01 Total Simulations</span>
              <span class="experiment-kpi-val" id="kpi-total-games">100,000,000</span>
              <span class="experiment-kpi-sub">10 boards × 10,000,000 games</span>
            </div>

            <div class="experiment-kpi-box exp-box-mean">
              <span class="experiment-kpi-label">#02 Mean Game Length</span>
              <span class="experiment-kpi-val" id="kpi-mean-length">--</span>
              <span class="experiment-kpi-sub" id="kpi-median-length">Median: -- moves</span>
            </div>

            <div class="experiment-kpi-box exp-box-m70">
              <span class="experiment-kpi-label">#03 70% Horizon (Advantage)</span>
              <span class="experiment-kpi-val" id="kpi-m70">--</span>
              <span class="experiment-kpi-sub" id="kpi-m70-sub">--% reached prior to finish</span>
            </div>

            <div class="experiment-kpi-box exp-box-m75">
              <span class="experiment-kpi-label">#04 75% Horizon (3:1 Odds)</span>
              <span class="experiment-kpi-val" id="kpi-m75">--</span>
              <span class="experiment-kpi-sub" id="kpi-m75-sub">--% reached prior to finish</span>
            </div>

            <div class="experiment-kpi-box exp-box-m80">
              <span class="experiment-kpi-label">#05 80% Horizon (4:1 Heavy)</span>
              <span class="experiment-kpi-val" id="kpi-m80">--</span>
              <span class="experiment-kpi-sub" id="kpi-m80-sub">--% reached prior to finish</span>
            </div>

            <div class="experiment-kpi-box exp-box-ratio">
              <span class="experiment-kpi-label">#06 Prediction Horizon Ratio</span>
              <span class="experiment-kpi-val" id="kpi-ratio">--</span>
              <span class="experiment-kpi-sub">Typical midpoint prediction horizon (M75 / Mean)</span>
            </div>
          </div>
        </div>

        <!-- Combined Cross-Board Synthesis Card -->
        <div class="synthesis-card">
          <div class="synthesis-header">
            <div class="synthesis-title">Simple Prediction Guide (How Early Can We Tell?)</div>
            <span class="badge badge-gold">100,000,000 Games Analyzed</span>
          </div>

          <p class="synthesis-intro">
            A full game usually takes about <strong>60 moves</strong>. Here is after how many moves we can predict the winner:
          </p>

          <div class="synthesis-milestones-grid">
            <div class="synthesis-milestone-item m-70">
              <span class="milestone-pct">70% Certainty (Decent Lead)</span>
              <strong class="milestone-move">After 31 Moves</strong>
              <span class="milestone-rate">We can predict the winner in <strong>9 out of 10 games</strong>.</span>
            </div>

            <div class="synthesis-milestone-item m-75">
              <span class="milestone-pct">75% Certainty (3:1 Favorite)</span>
              <strong class="milestone-move">After 31 Moves</strong>
              <span class="milestone-rate">We can predict the winner in <strong>7 out of 10 games</strong>.</span>
            </div>

            <div class="synthesis-milestone-item m-80">
              <span class="milestone-pct">80% Certainty (4:1 Heavy Favorite)</span>
              <strong class="milestone-move">After 31 Moves</strong>
              <span class="milestone-rate">We can predict the winner in <strong>6 out of 10 games</strong>.</span>
            </div>

            <div class="synthesis-milestone-item m-90">
              <span class="milestone-pct">90% Certainty (Almost Certain)</span>
              <strong class="milestone-move">After 37 Moves</strong>
              <span class="milestone-rate">We can predict the winner in <strong>3 out of 10 games</strong>.</span>
            </div>
          </div>

          <div class="synthesis-takeaway">
            <strong>Why is 90% certainty so rare before the end?</strong> Because landing on a big snake near square 100 can slide the leader all the way back to the bottom in just one roll!
          </div>

          <!-- Start Experiment Action Bar -->
          <div class="synthesis-footer-action">
            <button class="btn btn-primary btn-start-live-exp" id="btn-jump-and-start-exp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Start 100M Live Experiment →
            </button>
            <span class="synthesis-footer-hint">Scrolls down to live runner and starts simulation</span>
          </div>
        </div>

        <!-- Master Comparison Table -->
        <div class="master-table-container">
          <div class="master-table-header">
            <div class="master-table-title-group">
              <h3>Cross-Board Comparative Master Table</h3>
              <p>Non-ranked comparative metrics across all 10 experimental board configurations with combined aggregate summary.</p>
            </div>
            <div class="master-table-actions">
              <span class="badge badge-wood" id="table-dataset-badge">Precomputed Benchmark</span>
            </div>
          </div>

          <div class="table-responsive-master">
            <table class="master-data-table" id="master-data-table">
              <thead>
                <tr>
                  <th>Board Name</th>
                  <th>Games Target</th>
                  <th>Mean Length</th>
                  <th>Median Length</th>
                  <th>70% Mean (M70)</th>
                  <th>70% Reached</th>
                  <th>75% Mean (M75)</th>
                  <th>75% Reached</th>
                  <th>80% Mean (M80)</th>
                  <th>80% Reached</th>
                  <th>90% Mean (M90)</th>
                  <th>90% Reached</th>
                  <th>P1 Win Rate</th>
                </tr>
              </thead>
              <tbody id="master-table-body">
                <tr><td colspan="13" style="text-align:center; padding: 20px;">Loading official dataset...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Live 100M Simulation Runner -->
        <div class="live-runner-card" id="live-runner-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 800; color: var(--color-wood-dark); margin: 0;">
                Live Interactive 100-Million-Game Reproduction Suite
              </h3>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                Run the full multi-threaded Web Worker experiment locally on your own machine. UI remains 100% responsive.
              </div>
            </div>
            <span class="badge badge-olive" id="runner-state-badge">Ready to Start</span>
          </div>

          <!-- Controls Bar -->
          <div class="runner-control-bar">
            <div class="runner-buttons-group">
              <button class="btn btn-primary" id="btn-runner-start">Start 100M Simulation</button>
              <button class="btn btn-secondary" id="btn-runner-pause" disabled>Pause</button>
              <button class="btn btn-secondary" id="btn-runner-resume" style="display: none;">Resume</button>
              <button class="btn btn-secondary" id="btn-runner-cancel" disabled>Cancel</button>
            </div>

            <div style="font-size: 0.76rem; color: var(--text-muted);">
              Uses background Web Workers on available CPU cores.
            </div>
          </div>

          <!-- Global Live Progress Monitor -->
          <div class="global-progress-box">
            <div class="global-progress-top">
              <span class="global-progress-title" id="global-progress-label">Overall Progress</span>
              <span class="global-progress-stats" id="global-progress-nums">0 / 100,000,000 (0.0%)</span>
            </div>

            <div class="progress-track-lg">
              <div class="progress-bar-fill" id="global-progress-bar" style="width: 0%;"></div>
            </div>

            <div class="global-metrics-strip">
              <div class="metric-tag">Boards Completed: <strong id="metric-boards-done">0 / 10</strong></div>
              <div class="metric-tag">Throughput: <strong id="metric-speed">0 games/sec</strong></div>
              <div class="metric-tag">Elapsed: <strong id="metric-elapsed">0.0s</strong></div>
              <div class="metric-tag">Estimated Remaining: <strong id="metric-eta">--</strong></div>
            </div>
          </div>

          <!-- 10 Boards Individual Cards Grid -->
          <div class="boards-runner-grid" id="boards-runner-grid"></div>
        </div>
      </div>
    `;
  }

  async loadOfficialDataset() {
    try {
      const res = await fetch('data/results.json');
      if (res.ok) {
        this.officialData = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch results.json, falling back to embedded defaults:', e);
    }
  }

  renderOfficialView() {
    if (!this.officialData) return;

    const summary = this.officialData.pooledSummary;
    if (summary) {
      document.getElementById('kpi-total-games').textContent = summary.gamesSimulated.toLocaleString();
      document.getElementById('kpi-mean-length').textContent = `${summary.gameLength.mean} moves`;
      document.getElementById('kpi-median-length').textContent = `Median: ${summary.gameLength.median} moves (P25: ${summary.gameLength.p25}, P75: ${summary.gameLength.p75})`;
      
      if (summary.threshold70) {
        document.getElementById('kpi-m70').textContent = `${summary.threshold70.mean} moves`;
        document.getElementById('kpi-m70-sub').textContent = `${summary.threshold70.reachedPct}% reached prior to finish`;
      }

      if (summary.threshold75) {
        document.getElementById('kpi-m75').textContent = `${summary.threshold75.mean} moves`;
        document.getElementById('kpi-m75-sub').textContent = `${summary.threshold75.reachedPct}% reached prior to finish`;
        document.getElementById('kpi-ratio').textContent = `${summary.threshold75.horizonRatio}%`;
      }

      if (summary.threshold80) {
        document.getElementById('kpi-m80').textContent = `${summary.threshold80.mean} moves`;
        document.getElementById('kpi-m80-sub').textContent = `${summary.threshold80.reachedPct}% reached prior to finish`;
      }
    }
    this.renderMasterTableRows(this.officialData.boards, this.officialData.pooledSummary);
    this.renderBoardJobCards();
  }

  renderMasterTableRows(boardsData, pooledSummary = null) {
    const tbody = document.getElementById('master-table-body');
    if (!tbody || !boardsData) return;

    const summary = pooledSummary || (this.officialData ? this.officialData.pooledSummary : null);
    let html = '';

    if (summary) {
      html += `
        <tr class="pooled-row">
          <td><strong>ALL 10 BOARDS (COMBINED AGGREGATE)</strong></td>
          <td class="val-mono">${summary.gamesSimulated.toLocaleString()}</td>
          <td class="val-highlight">${summary.gameLength.mean} moves</td>
          <td class="val-mono">${summary.gameLength.median}</td>
          <td class="val-mono">${summary.threshold70 ? summary.threshold70.mean + ' moves' : 'N/A'}</td>
          <td class="val-mono">${summary.threshold70 ? summary.threshold70.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${summary.threshold75 ? summary.threshold75.mean + ' moves' : 'N/A'}</td>
          <td class="val-mono">${summary.threshold75 ? summary.threshold75.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${summary.threshold80 ? summary.threshold80.mean + ' moves' : 'N/A'}</td>
          <td class="val-mono">${summary.threshold80 ? summary.threshold80.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${summary.threshold90 ? summary.threshold90.mean + ' moves' : 'N/A'}</td>
          <td class="val-mono">${summary.threshold90 ? summary.threshold90.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${(summary.p1WinRate * 100).toFixed(2)}%</td>
        </tr>
      `;
    }

    for (const item of boardsData) {
      const r = item.report;
      html += `
        <tr>
          <td><strong>${item.boardName}</strong></td>
          <td class="val-mono">${r.gamesSimulated.toLocaleString()}</td>
          <td class="val-highlight">${r.gameLength.mean} moves</td>
          <td class="val-mono">${r.gameLength.median}</td>
          <td class="val-mono">${r.threshold70 && r.threshold70.reached > 0 ? r.threshold70.mean + ' moves' : '<span class="val-dim">N/A</span>'}</td>
          <td class="val-mono">${r.threshold70 ? r.threshold70.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${r.threshold75 && r.threshold75.reached > 0 ? r.threshold75.mean + ' moves' : '<span class="val-dim">N/A</span>'}</td>
          <td class="val-mono">${r.threshold75 ? r.threshold75.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${r.threshold80 && r.threshold80.reached > 0 ? r.threshold80.mean + ' moves' : '<span class="val-dim">N/A</span>'}</td>
          <td class="val-mono">${r.threshold80 ? r.threshold80.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${r.threshold90 && r.threshold90.reached > 0 ? r.threshold90.mean + ' moves' : '<span class="val-dim">N/A</span>'}</td>
          <td class="val-mono">${r.threshold90 ? r.threshold90.reachedPct + '%' : '0%'}</td>
          <td class="val-mono">${(r.p1WinRate * 100).toFixed(2)}%</td>
        </tr>
      `;
    }
    tbody.innerHTML = html;
  }

  renderBoardJobCards() {
    const grid = document.getElementById('boards-runner-grid');
    if (!grid) return;

    let html = '';
    for (let i = 0; i < BOARDS.length; i++) {
      const b = BOARDS[i];
      html += `
        <div class="board-job-card" id="job-card-${b.id}">
          <div class="job-card-top">
            <span class="job-board-name">${i + 1}. ${b.name}</span>
            <span class="badge badge-wood" id="job-badge-${b.id}">Queued</span>
          </div>

          <div class="job-card-meta">
            <span id="job-count-${b.id}">0 / 10,000,000</span>
            <span id="job-pct-${b.id}">0.0%</span>
          </div>

          <div class="job-progress-track">
            <div class="job-progress-fill" id="job-bar-${b.id}" style="width: 0%;"></div>
          </div>

          <div class="job-card-stats">
            <span id="job-stat-len-${b.id}">Length: --</span>
            <span id="job-stat-m75-${b.id}">M75: --</span>
          </div>
        </div>
      `;
    }
    grid.innerHTML = html;
  }

  initRunnerControls() {
    const btnStart = document.getElementById('btn-runner-start');
    const btnPause = document.getElementById('btn-runner-pause');
    const btnResume = document.getElementById('btn-runner-resume');
    const btnCancel = document.getElementById('btn-runner-cancel');
    const btnDownload = document.getElementById('btn-download-json');
    const btnJumpStart = document.getElementById('btn-jump-and-start-exp');
    const btnTopStart = document.getElementById('btn-top-start-exp');

    const scrollToRunnerAndStart = () => {
      const runnerEl = document.getElementById('live-runner-card');
      if (runnerEl) {
        runnerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      setTimeout(() => {
        const btnStartSim = document.getElementById('btn-runner-start');
        if (btnStartSim && !btnStartSim.disabled && (!this.pool || !this.pool.isRunning)) {
          btnStartSim.click();
        }
      }, 400);
    };

    if (btnJumpStart) {
      btnJumpStart.addEventListener('click', scrollToRunnerAndStart);
    }

    if (btnTopStart) {
      btnTopStart.addEventListener('click', scrollToRunnerAndStart);
    }

    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.officialData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "snakes_ladders_100m_results.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      });
    }

    btnStart.addEventListener('click', () => {
      const threads = Math.max(2, Math.min(12, (navigator.hardwareConcurrency || 4) - 1));

      this.pool = new ExperimentPool({
        numWorkers: threads,
        gamesPerBoard: 10000000,
        seed: 123456789,
        onProgress: (p) => this.onLiveProgress(p),
        onBoardComplete: (b) => this.onLiveBoardComplete(b),
        onComplete: (c) => this.onLiveExperimentComplete(c)
      });

      this.liveMode = true;
      this.liveBoardReports.clear();
      document.getElementById('table-dataset-badge').textContent = 'Live Verification Run';

      // Reset UI
      for (const b of BOARDS) {
        const card = document.getElementById(`job-card-${b.id}`);
        if (card) {
          card.className = 'board-job-card';
          document.getElementById(`job-badge-${b.id}`).textContent = 'Queued';
          document.getElementById(`job-badge-${b.id}`).className = 'badge badge-wood';
          document.getElementById(`job-count-${b.id}`).textContent = '0 / 10,000,000';
          document.getElementById(`job-pct-${b.id}`).textContent = '0.0%';
          document.getElementById(`job-bar-${b.id}`).style.width = '0%';
          const elLen = document.getElementById(`job-stat-len-${b.id}`);
          const elM75 = document.getElementById(`job-stat-m75-${b.id}`);
          if (elLen) elLen.textContent = 'Length: --';
          if (elM75) elM75.textContent = 'M75: --';
        }
      }

      btnStart.disabled = true;
      btnPause.disabled = false;
      btnCancel.disabled = false;
      document.getElementById('runner-state-badge').textContent = 'Simulating 100,000,000 Games...';
      document.getElementById('runner-state-badge').className = 'badge badge-gold';

      this.pool.start();
    });

    btnPause.addEventListener('click', () => {
      if (this.pool) {
        this.pool.pause();
        btnPause.style.display = 'none';
        btnResume.style.display = 'inline-block';
        document.getElementById('runner-state-badge').textContent = 'Paused';
        document.getElementById('runner-state-badge').className = 'badge badge-wood';
      }
    });

    btnResume.addEventListener('click', () => {
      if (this.pool) {
        this.pool.resume();
        btnResume.style.display = 'none';
        btnPause.style.display = 'inline-block';
        document.getElementById('runner-state-badge').textContent = 'Simulating...';
        document.getElementById('runner-state-badge').className = 'badge badge-gold';
      }
    });

    btnCancel.addEventListener('click', () => {
      if (this.pool) {
        this.pool.cancel();
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnPause.style.display = 'inline-block';
        btnResume.style.display = 'none';
        btnCancel.disabled = true;
        document.getElementById('runner-state-badge').textContent = 'Cancelled';
        document.getElementById('runner-state-badge').className = 'badge badge-terracotta';
      }
    });
  }

  onLiveProgress(p) {
    // Global
    const elNums = document.getElementById('global-progress-nums');
    const elBar = document.getElementById('global-progress-bar');
    const elDone = document.getElementById('metric-boards-done');
    const elSpeed = document.getElementById('metric-speed');
    const elElapsed = document.getElementById('metric-elapsed');

    const totalDisplayPct = p.totalPercent >= 99.95 ? 100.0 : p.totalPercent;
    const totalDisplayCount = p.totalCompleted >= 99950000 ? p.totalTarget : p.totalCompleted;

    if (elNums) elNums.textContent = `${totalDisplayCount.toLocaleString()} / ${p.totalTarget.toLocaleString()} (${totalDisplayPct.toFixed(1)}%)`;
    if (elBar) elBar.style.width = `${totalDisplayPct}%`;
    if (elDone) elDone.textContent = `${p.boardIndex} / ${BOARDS.length}`;
    if (elSpeed) elSpeed.textContent = `${p.speed.toLocaleString()} games/sec`;
    if (elElapsed) elElapsed.textContent = `${(p.elapsedMs / 1000).toFixed(1)}s`;

    if (p.totalCompleted > 500000 && p.etaMs > 0) {
      const etaSec = Math.round(p.etaMs / 1000);
      const elEta = document.getElementById('metric-eta');
      if (elEta) elEta.textContent = etaSec > 60 ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s` : `${etaSec}s`;
    }

    // Active Board Card
    const board = p.board;
    const card = document.getElementById(`job-card-${board.id}`);
    if (card) {
      card.className = 'board-job-card active';
      const badge = document.getElementById(`job-badge-${board.id}`);
      const count = document.getElementById(`job-count-${board.id}`);
      const pct = document.getElementById(`job-pct-${board.id}`);
      const bar = document.getElementById(`job-bar-${board.id}`);

      if (badge) {
        badge.textContent = 'Simulating';
        badge.className = 'badge badge-navy';
      }
      if (count) count.textContent = `${p.boardCompleted.toLocaleString()} / ${p.boardTarget.toLocaleString()}`;
      if (pct) pct.textContent = `${p.boardPercent.toFixed(1)}%`;
      if (bar) bar.style.width = `${p.boardPercent}%`;
    }
  }

  onLiveBoardComplete({ board, report }) {
    const card = document.getElementById(`job-card-${board.id}`);
    if (card) {
      card.className = 'board-job-card completed';
      const badge = document.getElementById(`job-badge-${board.id}`);
      const count = document.getElementById(`job-count-${board.id}`);
      const pct = document.getElementById(`job-pct-${board.id}`);
      const bar = document.getElementById(`job-bar-${board.id}`);
      const statLen = document.getElementById(`job-stat-len-${board.id}`);
      const statM75 = document.getElementById(`job-stat-m75-${board.id}`);

      if (badge) {
        badge.textContent = 'Complete';
        badge.className = 'badge badge-olive';
      }
      if (count) count.textContent = `10,000,000 / 10,000,000`;
      if (pct) pct.textContent = `100.0%`;
      if (bar) bar.style.width = `100%`;
      if (statLen) statLen.textContent = `Length: ${report.gameLength.mean}m`;
      if (statM75) statM75.textContent = `M75: ${report.threshold75 && report.threshold75.reached > 0 ? report.threshold75.mean + 'm' : 'N/A'}`;
    }

    this.liveBoardReports.set(board.id, {
      boardId: board.id,
      boardName: board.name,
      report
    });

    this.renderMasterTableRows(Array.from(this.liveBoardReports.values()));
  }

  onLiveExperimentComplete({ totalTimeMs, boardReports }) {
    document.getElementById('runner-state-badge').textContent = 'Experiment Complete (100M Games)';
    document.getElementById('runner-state-badge').className = 'badge badge-olive';
    document.getElementById('metric-boards-done').textContent = '10 / 10';
    document.getElementById('metric-eta').textContent = 'Complete';

    // Explicitly snap to 100% complete
    const elNums = document.getElementById('global-progress-nums');
    const elBar = document.getElementById('global-progress-bar');
    if (elNums) elNums.textContent = '100,000,000 / 100,000,000 (100.0%)';
    if (elBar) elBar.style.width = '100%';

    document.getElementById('btn-runner-start').disabled = false;
    document.getElementById('btn-runner-pause').disabled = true;
    document.getElementById('btn-runner-cancel').disabled = true;
  }
}
