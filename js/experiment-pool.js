/**
 * Snakes & Ladders Lab: Browser Web Worker Experiment Pool
 * Manages parallel execution of 10-board 100M simulations on browser worker threads.
 */

import { BOARDS } from '../data/boards.js';

export class ExperimentPool {
  constructor(options = {}) {
    this.boards = BOARDS;
    this.maxWorkers = options.numWorkers || (typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? Math.max(2, Math.min(12, navigator.hardwareConcurrency)) : 4);
    this.gamesPerBoard = options.gamesPerBoard || 10000000;
    this.seed = options.seed || 123456789;

    this.workers = [];
    this.isRunning = false;
    this.isPaused = false;
    this.isCancelled = false;

    // Current state
    this.currentBoardIndex = 0;
    this.totalGamesTarget = this.boards.length * this.gamesPerBoard;
    this.totalGamesCompleted = 0;
    this.startTime = 0;
    this.lastProgressTime = 0;

    // Aggregators & Reports
    this.completedBoardReports = new Map();
    this.currentBoardProgress = 0;

    // Callbacks
    this.onProgress = options.onProgress || null;
    this.onBoardComplete = options.onBoardComplete || null;
    this.onComplete = options.onComplete || null;
    this.onError = options.onError || null;
  }

  setWorkerCount(count) {
    if (this.isRunning) return;
    this.maxWorkers = Math.max(1, Math.min(16, count));
  }

  setSeed(seedNum) {
    if (this.isRunning) return;
    this.seed = seedNum >>> 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.isCancelled = false;
    this.startTime = Date.now();
    this.lastProgressTime = Date.now();
    this.totalGamesCompleted = 0;
    this.currentBoardIndex = 0;
    this.completedBoardReports.clear();

    this.runNextBoard();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    for (const w of this.workers) {
      w.postMessage({ action: 'pause' });
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    for (const w of this.workers) {
      w.postMessage({ action: 'resume' });
    }
  }

  cancel() {
    this.isCancelled = true;
    this.isRunning = false;
    this.isPaused = false;
    this.terminateWorkers();
  }

  terminateWorkers() {
    for (const w of this.workers) {
      try {
        w.postMessage({ action: 'cancel' });
        w.terminate();
      } catch (e) {
        // ignore
      }
    }
    this.workers = [];
  }

  runNextBoard() {
    if (this.isCancelled) return;

    if (this.currentBoardIndex >= this.boards.length) {
      // All 10 boards completed!
      this.isRunning = false;
      this.terminateWorkers();
      if (this.onComplete) {
        this.onComplete({
          totalTimeMs: Date.now() - this.startTime,
          boardReports: Array.from(this.completedBoardReports.values())
        });
      }
      return;
    }

    const board = this.boards[this.currentBoardIndex];
    this.currentBoardProgress = 0;
    this.terminateWorkers();

    const workerCount = this.maxWorkers;
    const gamesPerWorker = Math.floor(this.gamesPerBoard / workerCount);
    const workerReports = [];
    let completedWorkers = 0;

    const boardStartTotal = this.totalGamesCompleted;

    for (let i = 0; i < workerCount; i++) {
      const target = (i === workerCount - 1)
        ? (this.gamesPerBoard - (gamesPerWorker * (workerCount - 1)))
        : gamesPerWorker;

      const worker = new Worker('js/sim-worker.js', { type: 'module' });
      let workerCompleted = 0;

      worker.onmessage = (e) => {
        if (this.isCancelled) return;
        const msg = e.data;

        if (msg.type === 'progress') {
          const delta = msg.batchDone;
          workerCompleted += delta;
          this.currentBoardProgress += delta;
          this.totalGamesCompleted += delta;

          this.emitProgress(board);
        } else if (msg.type === 'complete') {
          workerReports.push(msg.report);
          completedWorkers++;

          if (completedWorkers >= workerCount) {
            // Merge all worker reports for this board
            const combinedReport = this.mergeWorkerReports(workerReports);
            this.completedBoardReports.set(board.id, {
              boardId: board.id,
              boardName: board.name,
              subtitle: board.subtitle,
              report: combinedReport
            });

            if (this.onBoardComplete) {
              this.onBoardComplete({
                boardIndex: this.currentBoardIndex,
                board,
                report: combinedReport
              });
            }

            this.currentBoardIndex++;
            this.runNextBoard();
          }
        }
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        if (this.onError) this.onError(err);
      };

      this.workers.push(worker);

      worker.postMessage({
        action: 'start',
        job: {
          boardConfig: board,
          gamesTarget: target,
          seed: this.seed + (this.currentBoardIndex * 1000) + i,
          workerId: i + 1,
          batchSize: 50000
        }
      });
    }
  }

  emitProgress(board) {
    const now = Date.now();
    if (now - this.lastProgressTime < 80) return; // Throttle UI dispatches to ~12fps to keep main thread light
    this.lastProgressTime = now;

    const elapsedMs = now - this.startTime;
    const elapsedSec = elapsedMs / 1000;
    const speed = elapsedSec > 0 ? Math.round(this.totalGamesCompleted / elapsedSec) : 0;
    const remainingGames = this.totalGamesTarget - this.totalGamesCompleted;
    const etaMs = speed > 0 ? Math.round((remainingGames / speed) * 1000) : 0;

    if (this.onProgress) {
      this.onProgress({
        boardIndex: this.currentBoardIndex,
        board,
        boardCompleted: this.currentBoardProgress,
        boardTarget: this.gamesPerBoard,
        boardPercent: (this.currentBoardProgress / this.gamesPerBoard) * 100,
        totalCompleted: this.totalGamesCompleted,
        totalTarget: this.totalGamesTarget,
        totalPercent: (this.totalGamesCompleted / this.totalGamesTarget) * 100,
        speed,
        elapsedMs,
        etaMs
      });
    }
  }

  mergeWorkerReports(reports) {
    if (reports.length === 1) return reports[0];

    const maxBins = 300;
    let totalGames = 0;
    let p1Wins = 0;
    let p2Wins = 0;
    let p1Starts = 0;
    let p2Starts = 0;

    let r70 = 0, nr70 = 0, sumM70 = 0;
    let r75 = 0, nr75 = 0, sumM75 = 0;
    let r80 = 0, nr80 = 0, sumM80 = 0;
    let r90 = 0, nr90 = 0, sumM90 = 0;
    let r95 = 0, nr95 = 0, sumM95 = 0;
    let sumLength = 0;

    const glHist = new Uint32Array(maxBins + 1);
    const m70Hist = new Uint32Array(maxBins + 1);
    const m75Hist = new Uint32Array(maxBins + 1);
    const m80Hist = new Uint32Array(maxBins + 1);
    const m90Hist = new Uint32Array(maxBins + 1);
    const m95Hist = new Uint32Array(maxBins + 1);

    for (const r of reports) {
      totalGames += r.gamesSimulated;
      p1Wins += r.p1Wins;
      p2Wins += r.p2Wins;
      p1Starts += r.p1Starts;
      p2Starts += r.p2Starts;

      if (r.threshold70) {
        r70 += r.threshold70.reached;
        nr70 += r.threshold70.notReached;
        sumM70 += (r.threshold70.mean * r.threshold70.reached);
      }

      if (r.threshold75) {
        r75 += r.threshold75.reached;
        nr75 += r.threshold75.notReached;
        sumM75 += (r.threshold75.mean * r.threshold75.reached);
      }

      if (r.threshold80) {
        r80 += r.threshold80.reached;
        nr80 += r.threshold80.notReached;
        sumM80 += (r.threshold80.mean * r.threshold80.reached);
      }

      if (r.threshold90) {
        r90 += r.threshold90.reached;
        nr90 += r.threshold90.notReached;
        sumM90 += (r.threshold90.mean * r.threshold90.reached);
      }

      if (r.threshold95) {
        r95 += r.threshold95.reached;
        nr95 += r.threshold95.notReached;
        sumM95 += (r.threshold95.mean * r.threshold95.reached);
      }

      sumLength += (r.gameLength.mean * r.gamesSimulated);

      if (r.histograms) {
        for (let i = 0; i <= maxBins; i++) {
          if (r.histograms.gameLength) glHist[i] += r.histograms.gameLength[i] || 0;
          if (r.histograms.m70) m70Hist[i] += r.histograms.m70[i] || 0;
          if (r.histograms.m75) m75Hist[i] += r.histograms.m75[i] || 0;
          if (r.histograms.m80) m80Hist[i] += r.histograms.m80[i] || 0;
          if (r.histograms.m90) m90Hist[i] += r.histograms.m90[i] || 0;
          if (r.histograms.m95) m95Hist[i] += r.histograms.m95[i] || 0;
        }
      }
    }

    const meanLength = totalGames > 0 ? (sumLength / totalGames) : 0;
    const meanM70 = r70 > 0 ? (sumM70 / r70) : 0;
    const meanM75 = r75 > 0 ? (sumM75 / r75) : 0;
    const meanM80 = r80 > 0 ? (sumM80 / r80) : 0;
    const meanM90 = r90 > 0 ? (sumM90 / r90) : 0;
    const meanM95 = r95 > 0 ? (sumM95 / r95) : 0;

    const calcQ = (hist, count) => {
      if (count === 0) return { min: 0, p25: 0, median: 0, p75: 0, max: 0 };
      let min = -1, max = 0, acc = 0, p25 = 0, median = 0, p75 = 0;
      const t25 = count * 0.25, t50 = count * 0.50, t75 = count * 0.75;
      for (let i = 1; i < hist.length; i++) {
        const c = hist[i];
        if (c > 0) {
          if (min === -1) min = i;
          max = i;
          const prev = acc;
          acc += c;
          if (prev < t25 && acc >= t25 && p25 === 0) p25 = i;
          if (prev < t50 && acc >= t50 && median === 0) median = i;
          if (prev < t75 && acc >= t75 && p75 === 0) p75 = i;
        }
      }
      return { min: min === -1 ? 0 : min, p25: p25 || min, median: median || min, p75: p75 || max, max: max || min };
    };

    const glQ = calcQ(glHist, totalGames);
    const m70Q = calcQ(m70Hist, r70);
    const m75Q = calcQ(m75Hist, r75);
    const m80Q = calcQ(m80Hist, r80);
    const m90Q = calcQ(m90Hist, r90);
    const m95Q = calcQ(m95Hist, r95);

    return {
      gamesSimulated: totalGames,
      p1Wins,
      p2Wins,
      p1WinRate: totalGames > 0 ? (p1Wins / totalGames) : 0,
      p2WinRate: totalGames > 0 ? (p2Wins / totalGames) : 0,
      p1Starts,
      p2Starts,
      p1StartRate: totalGames > 0 ? (p1Starts / totalGames) : 0,
      gameLength: {
        mean: parseFloat(meanLength.toFixed(2)),
        median: glQ.median,
        p25: glQ.p25,
        p75: glQ.p75,
        min: glQ.min,
        max: glQ.max
      },
      threshold70: {
        reached: r70,
        notReached: nr70,
        reachedPct: totalGames > 0 ? parseFloat(((r70 / totalGames) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM70.toFixed(2)),
        median: m70Q.median,
        p25: m70Q.p25,
        p75: m70Q.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM70 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold75: {
        reached: r75,
        notReached: nr75,
        reachedPct: totalGames > 0 ? parseFloat(((r75 / totalGames) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM75.toFixed(2)),
        median: m75Q.median,
        p25: m75Q.p25,
        p75: m75Q.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM75 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold80: {
        reached: r80,
        notReached: nr80,
        reachedPct: totalGames > 0 ? parseFloat(((r80 / totalGames) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM80.toFixed(2)),
        median: m80Q.median,
        p25: m80Q.p25,
        p75: m80Q.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM80 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold90: {
        reached: r90,
        notReached: nr90,
        reachedPct: totalGames > 0 ? parseFloat(((r90 / totalGames) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM90.toFixed(2)),
        median: m90Q.median,
        p25: m90Q.p25,
        p75: m90Q.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM90 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold95: {
        reached: r95,
        notReached: nr95,
        reachedPct: totalGames > 0 ? parseFloat(((r95 / totalGames) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM95.toFixed(2)),
        median: m95Q.median,
        p25: m95Q.p25,
        p75: m95Q.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM95 / meanLength) * 100).toFixed(2)) : 0
      },
      histograms: {
        gameLength: Array.from(glHist),
        m70: Array.from(m70Hist),
        m75: Array.from(m75Hist),
        m80: Array.from(m80Hist),
        m90: Array.from(m90Hist),
        m95: Array.from(m95Hist)
      }
    };
  }
}
