/**
 * Snakes & Ladders Lab: UI Controller
 * Manages notification toasts, modals, tooltips, and interactive view updates.
 */

export class UIController {
  static showToast(message, type = 'info', duration = 3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    toast.style.cssText = `
      background: #2a1c14;
      color: #f7eedb;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: var(--font-heading);
      font-size: 0.85rem;
      border: 1px solid #c49d65;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      animation: toastIn 0.3s ease;
      pointer-events: auto;
    `;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Displays the 3D Game Completion Dialog Modal with creative 3D stats cards
   * highlighting:
   * 1. Match Duration vs Board Expected Mean
   * 2. 75% Prediction Horizon (on which move + moves in advance)
   * 3. 80% Prediction Horizon (on which move + moves in advance)
   * 4. Match Decisiveness & Early Advantage Dynamics
   */
  static showGameEndModal({
    state,
    board,
    boardStats = null,
    onPlayAgain = null,
    onReset = null,
    onViewAnalysis = null,
    onViewExperiment = null
  }) {
    // Remove existing modal if any
    const existing = document.getElementById('game-end-modal-overlay');
    if (existing) existing.remove();

    const movesPlayed = state.moveCount || 0;
    const winner = state.winner || 1;
    const boardName = (board && board.name) ? board.name : 'Selected Board';
    const boardSize = (board && board.size) ? board.size : 100;

    // Board Mean Length Calculation
    let boardMean = 60.55;
    if (boardStats && boardStats.gameLength && typeof boardStats.gameLength.mean === 'number') {
      boardMean = boardStats.gameLength.mean;
    } else if (board && board.id === 'classic-100') {
      boardMean = 39.2;
    }

    const diffMean = (movesPlayed - boardMean).toFixed(1);
    const pctDiff = (((movesPlayed - boardMean) / boardMean) * 100).toFixed(1);

    let meanDeltaText = '';
    let meanPillClass = 'pill-neutral';
    let meanPillText = 'Standard Match';

    if (movesPlayed > boardMean) {
      meanDeltaText = `+${diffMean} moves (+${pctDiff}%) longer than board mean`;
      meanPillClass = 'pill-orange';
      meanPillText = 'Extended Match';
    } else if (movesPlayed < boardMean) {
      meanDeltaText = `${Math.abs(diffMean)} moves (${Math.abs(pctDiff)}%) below board mean`;
      meanPillClass = 'pill-green';
      meanPillText = 'Speed Victory';
    } else {
      meanDeltaText = 'Exactly equal to expected board mean';
      meanPillClass = 'pill-neutral';
      meanPillText = 'Exact Average';
    }

    // 75% Horizon (3:1 Favorite)
    const t75 = (state.thresholds && state.thresholds[75]) ? state.thresholds[75] : null;
    let t75Main = 'Not Reached';
    let t75Sub = 'Game stayed under 75% confidence until the final winning roll';
    let t75Pill = 'Contested Match';
    let t75PillClass = 'pill-neutral';

    if (t75) {
      const adv75 = movesPlayed - t75.move;
      t75Main = `Move ${t75.move}`;
      t75Sub = `Locked ${adv75} moves before finish (P${t75.leader} held 3:1 win odds)`;
      t75Pill = `3:1 Favorite (P${t75.leader})`;
      t75PillClass = 'pill-purple';
    }

    // 80% Horizon (4:1 Heavy Favorite)
    const t80 = (state.thresholds && state.thresholds[80]) ? state.thresholds[80] : null;
    let t80Main = 'Not Reached';
    let t80Sub = 'Game remained within competitive range until the winning roll';
    let t80Pill = 'Uncertain Horizon';
    let t80PillClass = 'pill-neutral';

    if (t80) {
      const adv80 = movesPlayed - t80.move;
      t80Main = `Move ${t80.move}`;
      t80Sub = `Locked ${adv80} moves before finish (P${t80.leader} held 4:1 win odds)`;
      t80Pill = `4:1 Heavy Favorite (P${t80.leader})`;
      t80PillClass = 'pill-teal';
    }

    // 70% Early Advantage / Turning Point
    const t70 = (state.thresholds && state.thresholds[70]) ? state.thresholds[70] : null;
    let t70Main = 'Evenly Split';
    let t70Sub = 'Neither player established a 70% advantage prior to endgame';
    let t70Pill = 'Balanced Match';
    let t70PillClass = 'pill-neutral';

    if (t70) {
      const adv70 = movesPlayed - t70.move;
      t70Main = `Move ${t70.move}`;
      t70Sub = `Player ${t70.leader} gained 70% early statistical advantage (${adv70} moves early)`;
      t70Pill = `70% Lead (P${t70.leader})`;
      t70PillClass = 'pill-orange';
    }

    const overlay = document.createElement('div');
    overlay.id = 'game-end-modal-overlay';
    overlay.className = 'game-modal-overlay';

    overlay.innerHTML = `
      <div class="game-end-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="game-modal-close-btn" id="modal-btn-close" title="Close Dialog">✕</button>

        <!-- Victory Header -->
        <div class="game-modal-header">
          <div class="game-modal-trophy-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34c3.55-.7 6-3.8 6-7.66V4H4v6c0 3.86 2.45 6.96 6 7.66z"/>
            </svg>
          </div>
          <h2 class="game-modal-title winner-p${winner}" id="modal-title">
            Player ${winner} Emerges Victorious!
          </h2>
          <div class="game-modal-subtitle">
            Reached Square ${boardSize} on ${boardName} in ${movesPlayed} total moves
          </div>
        </div>

        <!-- 4 Creative 3D Neo-Brutalist Stats Boxes -->
        <div class="modal-3d-grid">
          
          <!-- 3D Brutalist Box 1: Duration & Expected Mean -->
          <div class="modal-3d-box box-duration">
            <div class="box-3d-header">
              <span class="box-3d-tag">
                <span class="box-3d-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                #01 Game Length
              </span>
            </div>
            <div class="box-3d-value-row">
              <span class="box-3d-num">${movesPlayed}</span>
              <span class="box-3d-unit">Total Moves</span>
            </div>
            <div class="box-3d-sub">
              Board Expected Mean: <strong>${boardMean.toFixed(1)} moves</strong><br/>
              ${meanDeltaText}
            </div>
            <div class="box-3d-badge-row">
              <span class="box-3d-pill ${meanPillClass}">${meanPillText}</span>
              <span class="box-3d-pill pill-neutral">Mean: ${boardMean.toFixed(1)}</span>
            </div>
          </div>

          <!-- 3D Brutalist Box 2: 75% Prediction Horizon (3:1 Favorite) -->
          <div class="modal-3d-box box-thresh75">
            <div class="box-3d-header">
              <span class="box-3d-tag">
                <span class="box-3d-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </span>
                #02 75% Horizon (3:1)
              </span>
            </div>
            <div class="box-3d-value-row">
              <span class="box-3d-num">${t75Main}</span>
              <span class="box-3d-unit">${t75 ? '(3:1 Odds)' : ''}</span>
            </div>
            <div class="box-3d-sub">
              ${t75Sub}
            </div>
            <div class="box-3d-badge-row">
              <span class="box-3d-pill ${t75PillClass}">${t75Pill}</span>
            </div>
          </div>

          <!-- 3D Brutalist Box 3: 80% Prediction Horizon (4:1 Heavy Favorite) -->
          <div class="modal-3d-box box-thresh80">
            <div class="box-3d-header">
              <span class="box-3d-tag">
                <span class="box-3d-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                #03 80% Horizon (4:1)
              </span>
            </div>
            <div class="box-3d-value-row">
              <span class="box-3d-num">${t80Main}</span>
              <span class="box-3d-unit">${t80 ? '(4:1 Odds)' : ''}</span>
            </div>
            <div class="box-3d-sub">
              ${t80Sub}
            </div>
            <div class="box-3d-badge-row">
              <span class="box-3d-pill ${t80PillClass}">${t80Pill}</span>
            </div>
          </div>

          <!-- 3D Brutalist Box 4: 70% Early Decisiveness -->
          <div class="modal-3d-box box-dynamics">
            <div class="box-3d-header">
              <span class="box-3d-tag">
                <span class="box-3d-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </span>
                #04 Turning Point (70%)
              </span>
            </div>
            <div class="box-3d-value-row">
              <span class="box-3d-num">${t70Main}</span>
              <span class="box-3d-unit">${t70 ? '(Clear Edge)' : ''}</span>
            </div>
            <div class="box-3d-sub">
              ${t70Sub}
            </div>
            <div class="box-3d-badge-row">
              <span class="box-3d-pill ${t70PillClass}">${t70Pill}</span>
            </div>
          </div>

        </div>

        <!-- 3D Tactile Action Buttons -->
        <div class="game-modal-actions">
          <button class="btn-3d-modal btn-3d-secondary" id="modal-btn-experiment">
            100M Experiment Data →
          </button>
          <button class="btn-3d-modal btn-3d-primary" id="modal-btn-play-again">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Play Again (Reset & Roll)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => overlay.remove(), 200);
      document.removeEventListener('keydown', handleKey);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKey);

    // Event listeners
    const btnClose = overlay.querySelector('#modal-btn-close');
    const btnPlayAgain = overlay.querySelector('#modal-btn-play-again');
    const btnExperiment = overlay.querySelector('#modal-btn-experiment');

    if (btnClose) btnClose.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    if (btnPlayAgain) {
      btnPlayAgain.addEventListener('click', () => {
        closeModal();
        if (onPlayAgain) onPlayAgain();
      });
    }

    if (btnAnalysis) {
      btnAnalysis.addEventListener('click', () => {
        closeModal();
        if (onViewAnalysis) onViewAnalysis();
      });
    }

    if (btnExperiment) {
      btnExperiment.addEventListener('click', () => {
        closeModal();
        if (onViewExperiment) onViewExperiment();
      });
    }
  }

  static renderBoardsGallery(containerId, boards, onSelectBoard) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = boards.map(b => {
      const numSnakes = Object.keys(b.snakes || {}).length;
      const numLadders = Object.keys(b.ladders || {}).length;
      return `
        <div class="board-card" data-board-id="${b.id}">
          <div class="board-card-title">${b.name}</div>
          <div class="board-card-sub">${b.subtitle}</div>
          
          <div class="board-card-preview" id="preview-board-${b.id}">
            <canvas class="mini-board-canvas" id="canvas-${b.id}"></canvas>
          </div>

          <div class="board-card-meta-pills">
            <span class="meta-pill">${b.size} Squares</span>
            <span class="meta-pill">${numSnakes} Snakes</span>
            <span class="meta-pill">${numLadders} Ladders</span>
            <span class="meta-pill">${b.difficulty}</span>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
            ${b.description}
          </p>

          <div class="board-card-footer">
            <span style="font-size: 0.72rem; color: var(--text-subtle);">${b.source}</span>
            <button class="btn btn-primary btn-sm btn-select-board" data-board-id="${b.id}">
              Simulate Board →
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.board-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const boardId = card.dataset.boardId;
        if (onSelectBoard) onSelectBoard(boardId);
      });
    });

    // Draw Mini Previews on Canvases
    boards.forEach(b => {
      UIController.drawMiniBoard(`canvas-${b.id}`, b);
    });
  }

  static drawMiniBoard(canvasId, board) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cols = board.cols || 10;
    const rows = board.rows || 10;

    const w = canvas.width = 400;
    const h = canvas.height = 400;
    const cellW = w / cols;
    const cellH = h / rows;

    // Background
    ctx.fillStyle = '#eedec8';
    ctx.fillRect(0, 0, w, h);

    // Draw checker tiles with pastel palettes
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isEven = (r + c) % 2 === 0;
        let tileColor = isEven ? '#f7efe2' : '#dceada';
        if ((r * cols + c) % 7 === 0) tileColor = '#f5ddd6';
        else if ((r * cols + c) % 5 === 0) tileColor = '#f8eed8';

        ctx.fillStyle = tileColor;
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        ctx.strokeStyle = 'rgba(117, 71, 46, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    const getCenter = (sq) => {
      const idx = sq - 1;
      const rowFromBottom = Math.floor(idx / cols);
      const colInRow = idx % cols;
      const isReversed = rowFromBottom % 2 === 1;
      const col = isReversed ? (cols - 1 - colInRow) : colInRow;
      const row = (rows - 1) - rowFromBottom;
      return {
        x: (col + 0.5) * cellW,
        y: (row + 0.5) * cellH
      };
    };

    // Draw Ladders with Rungs & Drop Shadows
    Object.entries(board.ladders || {}).forEach(([s, e]) => {
      const p1 = getCenter(parseInt(s, 10));
      const p2 = getCenter(parseInt(e, 10));
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const px = -Math.sin(angle) * 7;
      const py = Math.cos(angle) * 7;

      // Drop Shadow
      ctx.strokeStyle = 'rgba(30, 15, 5, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p1.x - px + 3, p1.y - py + 3);
      ctx.lineTo(p2.x - px + 3, p2.y - py + 3);
      ctx.moveTo(p1.x + px + 3, p1.y + py + 3);
      ctx.lineTo(p2.x + px + 3, p2.y + py + 3);
      ctx.stroke();

      // Wooden Stiles
      ctx.strokeStyle = '#855627';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p1.x - px, p1.y - py);
      ctx.lineTo(p2.x - px, p2.y - py);
      ctx.moveTo(p1.x + px, p1.y + py);
      ctx.lineTo(p2.x + px, p2.y + py);
      ctx.stroke();

      // Rungs
      ctx.strokeStyle = '#d4952c';
      ctx.lineWidth = 2.5;
      const numRungs = Math.max(3, Math.floor(len / 18));
      for (let i = 1; i <= numRungs; i++) {
        const t = i / (numRungs + 1);
        const rx = p1.x + dx * t;
        const ry = p1.y + dy * t;
        ctx.beginPath();
        ctx.moveTo(rx - px, ry - py);
        ctx.lineTo(rx + px, ry + py);
        ctx.stroke();
      }
    });

    // Draw Cute Cartoon Snakes
    const colors = ['#3c7a36', '#d4582f', '#2f697a'];
    let sIdx = 0;
    Object.entries(board.snakes || {}).forEach(([s, e]) => {
      const p1 = getCenter(parseInt(s, 10));
      const p2 = getCenter(parseInt(e, 10));
      const snakeColor = colors[sIdx % colors.length];
      sIdx++;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const perp = angle + Math.PI / 2;
      const wave = Math.min(24, dist * 0.25);

      const cp1x = p1.x + dx * 0.33 + Math.cos(perp) * wave;
      const cp1y = p1.y + dy * 0.33 + Math.sin(perp) * wave;
      const cp2x = p1.x + dx * 0.66 - Math.cos(perp) * wave;
      const cp2y = p1.y + dy * 0.66 - Math.sin(perp) * wave;

      // Shadow
      ctx.strokeStyle = 'rgba(25, 12, 5, 0.25)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(p1.x + 3, p1.y + 3);
      ctx.bezierCurveTo(cp1x + 3, cp1y + 3, cp2x + 3, cp2y + 3, p2.x + 3, p2.y + 3);
      ctx.stroke();

      // Main Body
      ctx.strokeStyle = snakeColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      ctx.stroke();

      // Cute Snake Head
      ctx.fillStyle = snakeColor;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p1.x - 2, p1.y - 1.5, 2, 0, Math.PI * 2);
      ctx.arc(p1.x + 2, p1.y - 1.5, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(p1.x - 2, p1.y - 1.5, 1, 0, Math.PI * 2);
      ctx.arc(p1.x + 2, p1.y - 1.5, 1, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
