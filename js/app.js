import { BOARDS, getBoardById } from '../data/boards.js';
import { BoardRenderer } from './board.js';
import { DiceRoller } from './dice.js';
import { GameEngine } from './game.js';
import { SimulationController } from './simulation.js';
import { UIController } from './ui.js';
import { ExperimentUI } from './experiment-ui.js';

class App {
  constructor() {
    this.currentBoardId = 'classic-100';
    this.currentMode = 'manual'; // 'manual' or 'auto'
    this.init();
  }

  init() {
    // 1. Setup Router
    window.addEventListener('hashchange', () => this.handleRouting());
    this.setupNavLinks();

    // 2. Initialize Simulator Components
    const initialBoard = getBoardById(this.currentBoardId);
    this.boardRenderer = new BoardRenderer('board-container', initialBoard);

    this.diceRoller = new DiceRoller('dice-roller-container', (rollVal) => {
      // Manual roll completion
      if (this.currentMode === 'manual') {
        this.handleManualRoll(rollVal);
      }
    });

    this.gameEngine = new GameEngine(initialBoard, {
      onStateChange: (state) => this.updateSimulatorUI(state),
      onThresholdCrossed: (threshInfo) => this.handleThresholdNotification(threshInfo),
      onGameEnd: (finalState) => this.handleGameEnd(finalState)
    });

    this.simulationController = new SimulationController(
      this.gameEngine,
      this.boardRenderer,
      this.diceRoller,
      {
        onStatusChange: (status) => this.updateSimButtonState(status),
        onSimulationEnd: (finalState) => this.handleGameEnd(finalState)
      }
    );

    // 3. Initialize Geervan's Experiment UI
    this.experimentUI = new ExperimentUI('experiment-mount');
    this.experimentUI.init();

    // 5. Setup Event Listeners
    this.bindSimulatorControls();
    this.populateBoardSelectors();
    this.setupBoardsGallery();
    this.setupHeroPreview();

    // 6. Initial Route Resolution
    this.handleRouting();
    this.updateSimulatorUI(this.gameEngine.getState());
  }

  setupNavLinks() {
    const mainNav = document.getElementById('main-nav');
    const toggleBtn = document.getElementById('mobile-nav-toggle');

    const navLinks = document.querySelectorAll('.nav-link, .btn-nav-action');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          window.location.hash = href;
          if (mainNav) mainNav.classList.remove('show');
        }
      });
    });

    // Methodology internal sidebar sub-navigation
    const methodLinks = document.querySelectorAll('.method-nav-item');
    methodLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#m-')) {
          e.preventDefault();
          methodLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          const targetId = href.substring(1);
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          history.replaceState(null, '', href);
        }
      });
    });

    // Mobile nav toggle
    if (toggleBtn && mainNav) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainNav.classList.toggle('show');
      });

      // Close mobile nav when clicking outside
      document.addEventListener('click', (e) => {
        if (!mainNav.contains(e.target) && e.target !== toggleBtn) {
          mainNav.classList.remove('show');
        }
      });
    }
  }

  handleRouting() {
    let rawHash = window.location.hash.replace('#', '') || 'home';
    let subSection = null;

    if (rawHash.startsWith('m-')) {
      subSection = rawHash;
      rawHash = 'methodology';
    }

    const validPages = ['home', 'play', 'experiment', 'boards', 'methodology'];
    const activePage = validPages.includes(rawHash) ? rawHash : 'home';

    // Update section visibility
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`page-${activePage}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      const page = link.dataset.page;
      if (page === activePage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (subSection) {
      const subEl = document.getElementById(subSection);
      if (subEl) {
        setTimeout(() => {
          subEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
      document.querySelectorAll('.method-nav-item').forEach(item => {
        if (item.getAttribute('href') === `#${subSection}`) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh components if needed
    if (activePage === 'home') {
      this.startHeroSimulationLoop();
    } else {
      this.pauseHeroSimulationLoop();
    }

    if (activePage === 'play') {
      this.boardRenderer.updateTokens(this.gameEngine.p1Pos, this.gameEngine.p2Pos);
    }
  }

  populateBoardSelectors() {
    const simSelect = document.getElementById('sim-board-select');

    const optionsHtml = BOARDS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    if (simSelect) {
      simSelect.innerHTML = optionsHtml;
      simSelect.value = this.currentBoardId;
      simSelect.addEventListener('change', (e) => {
        this.changeBoard(e.target.value);
      });
    }
  }

  changeBoard(boardId) {
    this.currentBoardId = boardId;
    const board = getBoardById(boardId);
    this.simulationController.pause();
    this.boardRenderer.setBoard(board);
    this.gameEngine.setBoard(board);

    const simSelect = document.getElementById('sim-board-select');
    if (simSelect) simSelect.value = boardId;

    UIController.showToast(`Switched board to: ${board.name}`, 'info');
  }

  bindSimulatorControls() {
    // Mode Switch: Manual vs Auto
    const btnModeManual = document.getElementById('btn-mode-manual');
    const btnModeAuto = document.getElementById('btn-mode-auto');
    const manualActions = document.getElementById('manual-actions');
    const autoActions = document.getElementById('auto-actions');

    if (btnModeManual && btnModeAuto) {
      btnModeManual.addEventListener('click', () => {
        this.currentMode = 'manual';
        this.simulationController.pause();
        btnModeManual.classList.add('active');
        btnModeAuto.classList.remove('active');
        if (manualActions) manualActions.style.display = 'flex';
        if (autoActions) autoActions.style.display = 'none';
      });

      btnModeAuto.addEventListener('click', () => {
        this.currentMode = 'auto';
        this.simulationController.pause();
        btnModeAuto.classList.add('active');
        btnModeManual.classList.remove('active');
        if (manualActions) manualActions.style.display = 'none';
        if (autoActions) autoActions.style.display = 'flex';
      });
    }

    // Manual Roll Button
    const btnManualRoll = document.getElementById('btn-manual-roll');
    if (btnManualRoll) {
      btnManualRoll.addEventListener('click', () => {
        if (!this.diceRoller.isRolling && !this.gameEngine.isOver) {
          this.diceRoller.roll();
        }
      });
    }

    // Auto Sim Controls: Start / Pause
    const btnSimToggle = document.getElementById('btn-sim-toggle');
    if (btnSimToggle) {
      btnSimToggle.addEventListener('click', () => {
        if (this.simulationController.isPlaying) {
          this.simulationController.pause();
        } else {
          this.simulationController.start();
        }
      });
    }

    // Step Button
    const btnSimStep = document.getElementById('btn-sim-step');
    if (btnSimStep) {
      btnSimStep.addEventListener('click', () => {
        this.simulationController.step();
      });
    }

    // Reset Button
    const btnSimReset = document.getElementById('btn-sim-reset');
    if (btnSimReset) {
      btnSimReset.addEventListener('click', () => {
        this.simulationController.reset();
        UIController.showToast('Board reset. New random starting player chosen.', 'info');
      });
    }

    // Speed Slider
    const speedSlider = document.getElementById('sim-speed-slider');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.simulationController.setSpeed(speed);
      });
    }
  }

  async handleManualRoll(rollValue) {
    const turnResult = this.gameEngine.executeTurn(rollValue);
    if (!turnResult) return;

    if (turnResult.intermediate !== turnResult.from) {
      await this.boardRenderer.animateStepByStep(
        turnResult.player,
        turnResult.from,
        turnResult.intermediate,
        110
      );
    }

    if (turnResult.isLadder) {
      await this.boardRenderer.animateClimb(turnResult.player, turnResult.intermediate, turnResult.to);
    } else if (turnResult.isSnake) {
      await this.boardRenderer.animateSlide(turnResult.player, turnResult.intermediate, turnResult.to);
    } else {
      this.boardRenderer.updateTokens(this.gameEngine.p1Pos, this.gameEngine.p2Pos);
    }
  }

  updateSimulatorUI(state) {
    // Update State Rows
    const elMove = document.getElementById('state-move-count');
    const elTurn = document.getElementById('state-current-turn');
    const elLastRoll = document.getElementById('state-last-roll');
    const elP1Pos = document.getElementById('state-p1-pos');
    const elP2Pos = document.getElementById('state-p2-pos');
    const rowTurn = document.getElementById('state-row-turn');

    if (elMove) elMove.textContent = state.moveCount;
    if (elTurn) {
      elTurn.textContent = state.isOver ? `Game Over (P${state.winner} Won)` : `Player ${state.currentTurn}`;
    }
    if (rowTurn) {
      rowTurn.className = `state-row turn-p${state.currentTurn}`;
    }
    if (elLastRoll) {
      elLastRoll.textContent = state.lastRoll ? `${state.lastRoll} (P${state.lastRolledBy})` : 'None';
    }
    if (elP1Pos) elP1Pos.textContent = `Square ${state.p1Pos}`;
    if (elP2Pos) elP2Pos.textContent = `Square ${state.p2Pos}`;

    // Update Probability Display
    const p1Pct = (state.probabilities.p1 * 100).toFixed(1);
    const p2Pct = (state.probabilities.p2 * 100).toFixed(1);

    const elProbP1Num = document.getElementById('prob-p1-num');
    const elProbP2Num = document.getElementById('prob-p2-num');
    const barP1 = document.getElementById('prob-bar-p1');
    const barP2 = document.getElementById('prob-bar-p2');

    if (elProbP1Num) elProbP1Num.textContent = `${p1Pct}%`;
    if (elProbP2Num) elProbP2Num.textContent = `${p2Pct}%`;
    if (barP1) barP1.style.width = `${p1Pct}%`;
    if (barP2) barP2.style.width = `${p2Pct}%`;

    // Update Thresholds Tracker
    const t70 = document.getElementById('thresh-chip-70');
    const t75 = document.getElementById('thresh-chip-75');
    const t80 = document.getElementById('thresh-chip-80');
    const t90 = document.getElementById('thresh-chip-90');
    const statusMsg = document.getElementById('threshold-status-message');

    const updateChip = (chipEl, tKey) => {
      if (!chipEl) return;
      const data = state.thresholds[tKey];
      if (data) {
        chipEl.classList.add('reached');
        chipEl.querySelector('.thresh-state').textContent = `M${data.move} (P${data.leader})`;
      } else {
        chipEl.classList.remove('reached');
        chipEl.querySelector('.thresh-state').textContent = `Not reached`;
      }
    };

    updateChip(t70, 70);
    updateChip(t75, 75);
    updateChip(t80, 80);
    updateChip(t90, 90);

    if (statusMsg) {
      if (state.isOver) {
        if (state.thresholds[75]) {
          const lead = state.thresholds[75];
          const diff = state.moveCount - lead.move;
          statusMsg.textContent = `Player ${lead.leader} crossed the 75% 3:1 favorite horizon at move ${lead.move}, exactly ${diff} moves before winning on move ${state.moveCount}!`;
        } else if (state.thresholds[70]) {
          const lead = state.thresholds[70];
          const diff = state.moveCount - lead.move;
          statusMsg.textContent = `Player ${lead.leader} established a 70% advantage at move ${lead.move}, ${diff} moves before the winning roll.`;
        } else {
          statusMsg.textContent = `Competitive match: Game remained contested without a decisive statistical favorite until the final winning roll.`;
        }
      } else {
        if (state.thresholds[90]) {
          statusMsg.textContent = `90% near-certainty reached at move ${state.thresholds[90].move} for Player ${state.thresholds[90].leader}.`;
        } else if (state.thresholds[80]) {
          statusMsg.textContent = `80% heavy favorite horizon reached at move ${state.thresholds[80].move} for Player ${state.thresholds[80].leader}.`;
        } else if (state.thresholds[75]) {
          statusMsg.textContent = `75% (3:1 favorite) horizon reached at move ${state.thresholds[75].move} for Player ${state.thresholds[75].leader}.`;
        } else if (state.thresholds[70]) {
          statusMsg.textContent = `70% early advantage reached at move ${state.thresholds[70].move} for Player ${state.thresholds[70].leader}.`;
        } else {
          statusMsg.textContent = `Prediction threshold: Not reached. Game is within balanced probabilistic range.`;
        }
      }
    }
  }

  handleThresholdNotification(threshInfo) {
    UIController.showToast(
      `${threshInfo.threshold}% confidence threshold reached at move ${threshInfo.move} for Player ${threshInfo.leader}!`,
      'info',
      3500
    );
  }

  handleGameEnd(finalState) {
    const currentBoard = getBoardById(this.currentBoardId);
    let boardStats = null;
    if (this.experimentUI && this.experimentUI.resultsData && this.experimentUI.resultsData.boards) {
      boardStats = this.experimentUI.resultsData.boards[this.currentBoardId];
    }

    UIController.showToast(
      `Player ${finalState.winner} reached square ${this.gameEngine.size} and won in ${finalState.moveCount} moves!`,
      'info',
      4000
    );

    // Launch tactile 3D Game Completion Dialog Modal
    UIController.showGameEndModal({
      state: finalState,
      board: currentBoard,
      boardStats: boardStats,
      onPlayAgain: () => {
        this.simulationController.reset();
        this.simulationController.start();
      },
      onReset: () => {
        this.simulationController.reset();
      },
      onViewExperiment: () => {
        window.location.hash = '#experiment';
      }
    });
  }

  updateSimButtonState(status) {
    const btnToggle = document.getElementById('btn-sim-toggle');
    if (!btnToggle) return;
    if (status.isPlaying) {
      btnToggle.innerHTML = `<span>⏸</span> Pause Simulation`;
      btnToggle.classList.remove('btn-primary');
      btnToggle.classList.add('btn-wood');
    } else {
      btnToggle.innerHTML = `<span>▶</span> Start Simulation`;
      btnToggle.classList.add('btn-primary');
      btnToggle.classList.remove('btn-wood');
    }
  }

  setupBoardsGallery() {
    UIController.renderBoardsGallery('boards-gallery-grid', BOARDS, (boardId) => {
      this.changeBoard(boardId);
      window.location.hash = '#play';
    });
  }

  setupHeroPreview() {
    const heroBoardEl = document.getElementById('hero-board-container');
    if (!heroBoardEl) return;

    const initialBoard = getBoardById('classic-100');
    this.heroBoardRenderer = new BoardRenderer('hero-board-container', initialBoard);
    
    this.heroState = {
      p1Pos: 1,
      p2Pos: 1,
      turn: 1,
      board: initialBoard,
      isAnimating: false,
      timerId: null,
      isActive: true
    };

    this.heroBoardRenderer.updateTokens(this.heroState.p1Pos, this.heroState.p2Pos);

    // Interactive click on dice to roll immediately
    const diceGroup = document.getElementById('hero-dice-group');
    if (diceGroup) {
      diceGroup.addEventListener('click', () => {
        if (!this.heroState.isAnimating) {
          this.stepHeroSimulation();
        }
      });
    }

    this.startHeroSimulationLoop();
  }

  startHeroSimulationLoop() {
    if (!this.heroState) return;
    this.heroState.isActive = true;
    if (!this.heroState.timerId && !this.heroState.isAnimating) {
      this.heroState.timerId = setTimeout(() => this.stepHeroSimulation(), 1800);
    }
  }

  pauseHeroSimulationLoop() {
    if (!this.heroState) return;
    this.heroState.isActive = false;
    if (this.heroState.timerId) {
      clearTimeout(this.heroState.timerId);
      this.heroState.timerId = null;
    }
  }

  async stepHeroSimulation() {
    if (!this.heroState || !this.heroBoardRenderer || this.heroState.isAnimating) return;
    if (!this.heroState.isActive) return;

    this.heroState.isAnimating = true;
    if (this.heroState.timerId) {
      clearTimeout(this.heroState.timerId);
      this.heroState.timerId = null;
    }

    const diceGroup = document.getElementById('hero-dice-group');
    if (diceGroup) {
      diceGroup.classList.remove('is-rolling');
      void diceGroup.offsetWidth;
      diceGroup.classList.add('is-rolling');
    }

    // Roll 1 to 6
    const roll = Math.floor(Math.random() * 6) + 1;
    const player = this.heroState.turn;
    const currentPos = player === 1 ? this.heroState.p1Pos : this.heroState.p2Pos;
    let nextPos = currentPos + roll;
    if (nextPos > 100) nextPos = 100;

    // 1. Move token to target tile
    this.heroBoardRenderer.highlightSquare(nextPos);
    await this.heroBoardRenderer.animateMove(player, currentPos, nextPos, 'normal');

    if (player === 1) this.heroState.p1Pos = nextPos;
    else this.heroState.p2Pos = nextPos;
    this.heroBoardRenderer.updateTokens(this.heroState.p1Pos, this.heroState.p2Pos);

    // 2. Check for Ladders or Snakes
    const ladders = this.heroState.board.ladders || {};
    const snakes = this.heroState.board.snakes || {};

    if (ladders[nextPos]) {
      const ladderEnd = ladders[nextPos];
      await new Promise(r => setTimeout(r, 260));
      this.heroBoardRenderer.highlightSquare(ladderEnd);
      await this.heroBoardRenderer.animateMove(player, nextPos, ladderEnd, 'ladder');
      if (player === 1) this.heroState.p1Pos = ladderEnd;
      else this.heroState.p2Pos = ladderEnd;
      this.heroBoardRenderer.updateTokens(this.heroState.p1Pos, this.heroState.p2Pos);
    } else if (snakes[nextPos]) {
      const snakeEnd = snakes[nextPos];
      await new Promise(r => setTimeout(r, 260));
      this.heroBoardRenderer.highlightSquare(snakeEnd);
      await this.heroBoardRenderer.animateMove(player, nextPos, snakeEnd, 'snake');
      if (player === 1) this.heroState.p1Pos = snakeEnd;
      else this.heroState.p2Pos = snakeEnd;
      this.heroBoardRenderer.updateTokens(this.heroState.p1Pos, this.heroState.p2Pos);
    }

    // 3. Reset condition after win or deep into game
    const finalPos = player === 1 ? this.heroState.p1Pos : this.heroState.p2Pos;
    if (finalPos >= 100 || (this.heroState.p1Pos > 85 && this.heroState.p2Pos > 85)) {
      await new Promise(r => setTimeout(r, 2200));
      this.heroState.p1Pos = 1;
      this.heroState.p2Pos = 1;
      this.heroBoardRenderer.updateTokens(1, 1);
    }

    // Switch turn
    this.heroState.turn = player === 1 ? 2 : 1;
    this.heroState.isAnimating = false;

    // Schedule next turn if still on home page
    if (this.heroState.isActive) {
      this.heroState.timerId = setTimeout(() => this.stepHeroSimulation(), 1600);
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
