/**
 * Snakes & Ladders Lab: Web Worker Simulation Engine
 * Performs high-throughput Monte Carlo simulations using exact Markov probability tables.
 * Tracks 70%, 75%, 80%, 90%, and 95% win probability thresholds.
 */

// Xoshiro128++ PRNG: high quality, uniform 32-bit state generator
class Xoshiro128PlusPlus {
  constructor(s0 = 123456789, s1 = 362436069, s2 = 521288629, s3 = 88675123) {
    this.s0 = (s0 >>> 0) || 123456789;
    this.s1 = (s1 >>> 0) || 362436069;
    this.s2 = (s2 >>> 0) || 521288629;
    this.s3 = (s3 >>> 0) || 88675123;
    if (this.s0 === 0 && this.s1 === 0 && this.s2 === 0 && this.s3 === 0) {
      this.s0 = 123456789;
    }
  }

  nextUint32() {
    const s0 = this.s0, s1 = this.s1, s2 = this.s2, s3 = this.s3;
    const result = (Math.imul((s0 + s3) >>> 0, 9) << 5) | (Math.imul((s0 + s3) >>> 0, 9) >>> 27);
    const t = (s1 << 9) >>> 0;
    this.s2 ^= s0;
    this.s3 ^= s1;
    this.s1 ^= s2;
    this.s0 ^= s3;
    this.s2 ^= t;
    this.s3 = (this.s3 << 11) | (this.s3 >>> 21);
    return (result >>> 0);
  }

  rollDie() {
    return ((this.nextUint32() % 6) + 1);
  }

  coinFlip() {
    return (this.nextUint32() & 1) === 1;
  }
}

/**
 * Computes exact Markov win probability table for a given board configuration.
 * State index: (p1 * 101 + p2) * 2 + (turn - 1)
 */
function buildProbabilityTable(boardConfig, maxTurns = 500) {
  const size = boardConfig.size || 100;
  const snakes = boardConfig.snakes || {};
  const ladders = boardConfig.ladders || {};
  const numStates = size + 1;
  const K = maxTurns;

  // 1. Transition map nextSquare[s * 7 + d]
  const nextSquare = new Int16Array(numStates * 7);
  for (let s = 0; s <= size; s++) {
    for (let d = 1; d <= 6; d++) {
      let dest = s + d;
      if (dest > size) {
        dest = s; // Standard rule: exact roll required
      } else {
        if (snakes[dest]) {
          dest = snakes[dest];
        } else if (ladders[dest]) {
          dest = ladders[dest];
        }
      }
      nextSquare[s * 7 + d] = dest;
    }
  }

  // 2. Single-player transient distributions T[s][k] and cumulative C[s][k]
  const T = Array.from({ length: numStates }, () => new Float64Array(K + 1));
  const C = Array.from({ length: numStates }, () => new Float64Array(K + 1));

  for (let startS = 0; startS < size; startS++) {
    let stateProb = new Float64Array(numStates);
    stateProb[startS] = 1.0;
    let cumFinished = 0.0;

    for (let k = 1; k <= K; k++) {
      const nextProb = new Float64Array(numStates);
      let finishedThisTurn = 0.0;

      for (let s = 0; s < size; s++) {
        const p = stateProb[s];
        if (p <= 1e-14) continue;

        for (let d = 1; d <= 6; d++) {
          const dest = nextSquare[s * 7 + d];
          const transProb = p * (1.0 / 6.0);
          if (dest === size) {
            finishedThisTurn += transProb;
          } else {
            nextProb[dest] += transProb;
          }
        }
      }

      T[startS][k] = finishedThisTurn;
      cumFinished += finishedThisTurn;
      C[startS][k] = cumFinished;
      stateProb = nextProb;
    }
  }

  T[size][0] = 1.0;
  C[size].fill(1.0);

  // 3. Flat probability table: (s1 * 101 + s2) * 2 + (turn - 1)
  const totalTableEntries = numStates * numStates * 2;
  const probTable = new Float32Array(totalTableEntries);

  for (let s1 = 0; s1 <= size; s1++) {
    for (let s2 = 0; s2 <= size; s2++) {
      // Turn 1 (P1 to move)
      let p1WinsTurn1 = 0.0;
      if (s1 >= size) {
        p1WinsTurn1 = 1.0;
      } else if (s2 >= size) {
        p1WinsTurn1 = 0.0;
      } else {
        for (let k = 1; k <= K; k++) {
          const p1FinishK = T[s1][k];
          if (p1FinishK <= 1e-14) continue;
          const p2SurvivesKMinus1 = 1.0 - C[s2][k - 1];
          p1WinsTurn1 += p1FinishK * p2SurvivesKMinus1;
        }
      }
      p1WinsTurn1 = Math.max(0.0, Math.min(1.0, p1WinsTurn1));
      probTable[(s1 * numStates + s2) * 2 + 0] = p1WinsTurn1;

      // Turn 2 (P2 to move)
      let p1WinsTurn2 = 0.0;
      if (s1 >= size) {
        p1WinsTurn2 = 1.0;
      } else if (s2 >= size) {
        p1WinsTurn2 = 0.0;
      } else {
        let p2WinsTurn2 = 0.0;
        for (let k = 1; k <= K; k++) {
          const p2FinishK = T[s2][k];
          if (p2FinishK <= 1e-14) continue;
          const p1SurvivesKMinus1 = 1.0 - C[s1][k - 1];
          p2WinsTurn2 += p2FinishK * p1SurvivesKMinus1;
        }
        p1WinsTurn2 = 1.0 - p2WinsTurn2;
      }
      p1WinsTurn2 = Math.max(0.0, Math.min(1.0, p1WinsTurn2));
      probTable[(s1 * numStates + s2) * 2 + 1] = p1WinsTurn2;
    }
  }

  return { probTable, nextSquare, numStates, size };
}

// Statistical collector with high-resolution histogram bins
class ExperimentAggregator {
  constructor(maxBins = 300) {
    this.maxBins = maxBins;
    this.gamesCount = 0;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.p1Starts = 0;
    this.p2Starts = 0;

    // Histogram bins (index = move number, 0 to maxBins)
    this.gameLengthHist = new Uint32Array(maxBins + 1);
    this.m70Hist = new Uint32Array(maxBins + 1);
    this.m75Hist = new Uint32Array(maxBins + 1);
    this.m80Hist = new Uint32Array(maxBins + 1);
    this.m90Hist = new Uint32Array(maxBins + 1);
    this.m95Hist = new Uint32Array(maxBins + 1);

    this.reached70 = 0;
    this.notReached70 = 0;
    this.reached75 = 0;
    this.notReached75 = 0;
    this.reached80 = 0;
    this.notReached80 = 0;
    this.reached90 = 0;
    this.notReached90 = 0;
    this.reached95 = 0;
    this.notReached95 = 0;

    // Sums for mean calculation
    this.sumGameLength = 0;
    this.sumM70 = 0;
    this.sumM75 = 0;
    this.sumM80 = 0;
    this.sumM90 = 0;
    this.sumM95 = 0;
  }

  recordGame(length, winner, starter, m70, m75, m80, m90, m95) {
    this.gamesCount++;
    if (winner === 1) this.p1Wins++;
    else this.p2Wins++;

    if (starter === 1) this.p1Starts++;
    else this.p2Starts++;

    // Game length
    const lBin = Math.min(length, this.maxBins);
    this.gameLengthHist[lBin]++;
    this.sumGameLength += length;

    // 70% threshold
    if (m70 > 0) {
      this.reached70++;
      const bin = Math.min(m70, this.maxBins);
      this.m70Hist[bin]++;
      this.sumM70 += m70;
    } else {
      this.notReached70++;
    }

    // 75% threshold
    if (m75 > 0) {
      this.reached75++;
      const bin = Math.min(m75, this.maxBins);
      this.m75Hist[bin]++;
      this.sumM75 += m75;
    } else {
      this.notReached75++;
    }

    // 80% threshold
    if (m80 > 0) {
      this.reached80++;
      const bin = Math.min(m80, this.maxBins);
      this.m80Hist[bin]++;
      this.sumM80 += m80;
    } else {
      this.notReached80++;
    }

    // 90% threshold
    if (m90 > 0) {
      this.reached90++;
      const bin = Math.min(m90, this.maxBins);
      this.m90Hist[bin]++;
      this.sumM90 += m90;
    } else {
      this.notReached90++;
    }

    // 95% threshold
    if (m95 > 0) {
      this.reached95++;
      const bin = Math.min(m95, this.maxBins);
      this.m95Hist[bin]++;
      this.sumM95 += m95;
    } else {
      this.notReached95++;
    }
  }

  merge(other) {
    this.gamesCount += other.gamesCount;
    this.p1Wins += other.p1Wins;
    this.p2Wins += other.p2Wins;
    this.p1Starts += other.p1Starts;
    this.p2Starts += other.p2Starts;

    this.reached70 += other.reached70;
    this.notReached70 += other.notReached70;
    this.reached75 += other.reached75;
    this.notReached75 += other.notReached75;
    this.reached80 += other.reached80;
    this.notReached80 += other.notReached80;
    this.reached90 += other.reached90;
    this.notReached90 += other.notReached90;
    this.reached95 += other.reached95;
    this.notReached95 += other.notReached95;

    this.sumGameLength += other.sumGameLength;
    this.sumM70 += other.sumM70;
    this.sumM75 += other.sumM75;
    this.sumM80 += other.sumM80;
    this.sumM90 += other.sumM90;
    this.sumM95 += other.sumM95;

    for (let i = 0; i <= this.maxBins; i++) {
      this.gameLengthHist[i] += other.gameLengthHist[i];
      this.m70Hist[i] += other.m70Hist[i];
      this.m75Hist[i] += other.m75Hist[i];
      this.m80Hist[i] += other.m80Hist[i];
      this.m90Hist[i] += other.m90Hist[i];
      this.m95Hist[i] += other.m95Hist[i];
    }
  }

  static calcQuantiles(hist, totalCount) {
    if (totalCount === 0) {
      return { min: 0, p25: 0, median: 0, p75: 0, max: 0 };
    }

    let min = -1;
    let max = 0;
    let acc = 0;
    let p25 = 0;
    let median = 0;
    let p75 = 0;

    const t25 = totalCount * 0.25;
    const t50 = totalCount * 0.50;
    const t75 = totalCount * 0.75;

    for (let i = 1; i < hist.length; i++) {
      const count = hist[i];
      if (count > 0) {
        if (min === -1) min = i;
        max = i;

        const prevAcc = acc;
        acc += count;

        if (prevAcc < t25 && acc >= t25 && p25 === 0) p25 = i;
        if (prevAcc < t50 && acc >= t50 && median === 0) median = i;
        if (prevAcc < t75 && acc >= t75 && p75 === 0) p75 = i;
      }
    }

    return {
      min: min === -1 ? 0 : min,
      p25: p25 || min,
      median: median || min,
      p75: p75 || max,
      max: max || min
    };
  }

  toReport() {
    const glQuant = ExperimentAggregator.calcQuantiles(this.gameLengthHist, this.gamesCount);
    const m70Quant = ExperimentAggregator.calcQuantiles(this.m70Hist, this.reached70);
    const m75Quant = ExperimentAggregator.calcQuantiles(this.m75Hist, this.reached75);
    const m80Quant = ExperimentAggregator.calcQuantiles(this.m80Hist, this.reached80);
    const m90Quant = ExperimentAggregator.calcQuantiles(this.m90Hist, this.reached90);
    const m95Quant = ExperimentAggregator.calcQuantiles(this.m95Hist, this.reached95);

    const meanLength = this.gamesCount > 0 ? (this.sumGameLength / this.gamesCount) : 0;
    const meanM70 = this.reached70 > 0 ? (this.sumM70 / this.reached70) : 0;
    const meanM75 = this.reached75 > 0 ? (this.sumM75 / this.reached75) : 0;
    const meanM80 = this.reached80 > 0 ? (this.sumM80 / this.reached80) : 0;
    const meanM90 = this.reached90 > 0 ? (this.sumM90 / this.reached90) : 0;
    const meanM95 = this.reached95 > 0 ? (this.sumM95 / this.reached95) : 0;

    return {
      gamesSimulated: this.gamesCount,
      p1Wins: this.p1Wins,
      p2Wins: this.p2Wins,
      p1WinRate: this.gamesCount > 0 ? (this.p1Wins / this.gamesCount) : 0,
      p2WinRate: this.gamesCount > 0 ? (this.p2Wins / this.gamesCount) : 0,
      p1Starts: this.p1Starts,
      p2Starts: this.p2Starts,
      p1StartRate: this.gamesCount > 0 ? (this.p1Starts / this.gamesCount) : 0,
      gameLength: {
        mean: parseFloat(meanLength.toFixed(2)),
        median: glQuant.median,
        p25: glQuant.p25,
        p75: glQuant.p75,
        min: glQuant.min,
        max: glQuant.max
      },
      threshold70: {
        reached: this.reached70,
        notReached: this.notReached70,
        reachedPct: this.gamesCount > 0 ? parseFloat(((this.reached70 / this.gamesCount) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM70.toFixed(2)),
        median: m70Quant.median,
        p25: m70Quant.p25,
        p75: m70Quant.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM70 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold75: {
        reached: this.reached75,
        notReached: this.notReached75,
        reachedPct: this.gamesCount > 0 ? parseFloat(((this.reached75 / this.gamesCount) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM75.toFixed(2)),
        median: m75Quant.median,
        p25: m75Quant.p25,
        p75: m75Quant.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM75 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold80: {
        reached: this.reached80,
        notReached: this.notReached80,
        reachedPct: this.gamesCount > 0 ? parseFloat(((this.reached80 / this.gamesCount) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM80.toFixed(2)),
        median: m80Quant.median,
        p25: m80Quant.p25,
        p75: m80Quant.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM80 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold90: {
        reached: this.reached90,
        notReached: this.notReached90,
        reachedPct: this.gamesCount > 0 ? parseFloat(((this.reached90 / this.gamesCount) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM90.toFixed(2)),
        median: m90Quant.median,
        p25: m90Quant.p25,
        p75: m90Quant.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM90 / meanLength) * 100).toFixed(2)) : 0
      },
      threshold95: {
        reached: this.reached95,
        notReached: this.notReached95,
        reachedPct: this.gamesCount > 0 ? parseFloat(((this.reached95 / this.gamesCount) * 100).toFixed(2)) : 0,
        mean: parseFloat(meanM95.toFixed(2)),
        median: m95Quant.median,
        p25: m95Quant.p25,
        p75: m95Quant.p75,
        horizonRatio: meanLength > 0 ? parseFloat(((meanM95 / meanLength) * 100).toFixed(2)) : 0
      },
      histograms: {
        gameLength: Array.from(this.gameLengthHist),
        m70: Array.from(this.m70Hist),
        m75: Array.from(this.m75Hist),
        m80: Array.from(this.m80Hist),
        m90: Array.from(this.m90Hist),
        m95: Array.from(this.m95Hist)
      }
    };
  }
}

// Global state in worker instance
let currentJob = null;
let isPaused = false;
let isCancelled = false;

// Worker message handler
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = function(e) {
    const msg = e.data;
    if (!msg) return;

    switch (msg.action) {
      case 'start':
        isPaused = false;
        isCancelled = false;
        runJob(msg.job);
        break;

      case 'pause':
        isPaused = true;
        break;

      case 'resume':
        isPaused = false;
        if (currentJob) {
          executeSimulationLoop();
        }
        break;

      case 'cancel':
        isCancelled = true;
        isPaused = false;
        currentJob = null;
        break;
    }
  };
}

function runJob(job) {
  const { boardConfig, gamesTarget, seed, workerId, batchSize = 50000 } = job;
  
  // Build lookup table
  const { probTable, nextSquare, numStates, size } = buildProbabilityTable(boardConfig, 500);
  
  const s0 = (seed || Date.now()) ^ (workerId * 104729);
  const s1 = (s0 ^ 0x6a09e667) >>> 0;
  const s2 = (s0 ^ 0xbb67ae85) >>> 0;
  const s3 = (s0 ^ 0x3c6ef372) >>> 0;
  const rng = new Xoshiro128PlusPlus(s0, s1, s2, s3);
  const aggregator = new ExperimentAggregator(300);

  currentJob = {
    jobId: job.jobId || boardConfig.id,
    boardId: boardConfig.id,
    workerId,
    gamesTarget,
    gamesCompleted: 0,
    batchSize,
    probTable,
    nextSquare,
    numStates,
    size,
    rng,
    aggregator
  };

  executeSimulationLoop();
}

function executeSimulationLoop() {
  if (!currentJob || isCancelled) return;

  const job = currentJob;
  const {
    jobId,
    boardId,
    workerId,
    gamesTarget,
    batchSize,
    probTable,
    nextSquare,
    numStates,
    size,
    rng,
    aggregator
  } = job;

  const remaining = gamesTarget - job.gamesCompleted;
  const currentBatch = Math.min(batchSize, remaining);

  for (let g = 0; g < currentBatch; g++) {
    const startingPlayer = rng.coinFlip() ? 1 : 2;
    let turn = startingPlayer;
    let p1 = 0;
    let p2 = 0;
    let move = 0;

    let m70 = 0;
    let m75 = 0;
    let m80 = 0;
    let m90 = 0;
    let m95 = 0;

    // Simulation loop
    while (p1 < size && p2 < size && move < 500) {
      move++;
      const roll = rng.rollDie();

      if (turn === 1) {
        p1 = nextSquare[p1 * 7 + roll];
        if (p1 >= size) break;
        turn = 2;
      } else {
        p2 = nextSquare[p2 * 7 + roll];
        if (p2 >= size) break;
        turn = 1;
      }

      // Check win probabilities for non-terminal state
      const stateIdx = (p1 * numStates + p2) * 2 + (turn - 1);
      const p1Prob = probTable[stateIdx];
      const p2Prob = 1.0 - p1Prob;
      const leaderProb = p1Prob >= p2Prob ? p1Prob : p2Prob;

      // First crossing detection for 70%, 75%, 80%, 90%, 95%
      if (m70 === 0 && leaderProb >= 0.70) m70 = move;
      if (m75 === 0 && leaderProb >= 0.75) m75 = move;
      if (m80 === 0 && leaderProb >= 0.80) m80 = move;
      if (m90 === 0 && leaderProb >= 0.90) m90 = move;
      if (m95 === 0 && leaderProb >= 0.95) m95 = move;
    }

    const winner = p1 >= size ? 1 : 2;
    aggregator.recordGame(move, winner, startingPlayer, m70, m75, m80, m90, m95);
  }

  job.gamesCompleted += currentBatch;

  // Post progress
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.postMessage({
      type: 'progress',
      jobId,
      boardId,
      workerId,
      gamesCompleted: job.gamesCompleted,
      gamesTarget,
      batchDone: currentBatch
    });
  }

  // Check completion
  if (job.gamesCompleted >= gamesTarget) {
    const finalReport = aggregator.toReport();
    if (typeof self !== 'undefined' && typeof window === 'undefined') {
      self.postMessage({
        type: 'complete',
        jobId,
        boardId,
        workerId,
        report: finalReport
      });
    }
    currentJob = null;
    return;
  }

  // Continue next batch if not paused or cancelled
  if (!isPaused && !isCancelled) {
    setTimeout(executeSimulationLoop, 0);
  }
}

// Export for ESM and Node.js
export {
  Xoshiro128PlusPlus,
  buildProbabilityTable,
  ExperimentAggregator
};
