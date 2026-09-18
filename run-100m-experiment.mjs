import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BOARDS } from './data/boards.js';
import { Xoshiro128PlusPlus, buildProbabilityTable, ExperimentAggregator } from './js/sim-worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!isMainThread) {
  // Worker thread code
  const { boardConfig, gamesTarget, seed, workerId } = workerData;
  const { probTable, nextSquare, numStates, size } = buildProbabilityTable(boardConfig, 500);

  const s0 = (seed || 123456789) ^ (workerId * 104729);
  const s1 = (s0 ^ 0x6a09e667) >>> 0;
  const s2 = (s0 ^ 0xbb67ae85) >>> 0;
  const s3 = (s0 ^ 0x3c6ef372) >>> 0;
  const rng = new Xoshiro128PlusPlus(s0, s1, s2, s3);
  const aggregator = new ExperimentAggregator(300);

  const batchSize = 100000;
  let completed = 0;

  while (completed < gamesTarget) {
    const currentBatch = Math.min(batchSize, gamesTarget - completed);

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

        const stateIdx = (p1 * numStates + p2) * 2 + (turn - 1);
        const p1Prob = probTable[stateIdx];
        const p2Prob = 1.0 - p1Prob;
        const leaderProb = p1Prob >= p2Prob ? p1Prob : p2Prob;

        if (m70 === 0 && leaderProb >= 0.70) m70 = move;
        if (m75 === 0 && leaderProb >= 0.75) m75 = move;
        if (m80 === 0 && leaderProb >= 0.80) m80 = move;
        if (m90 === 0 && leaderProb >= 0.90) m90 = move;
        if (m95 === 0 && leaderProb >= 0.95) m95 = move;
      }

      const winner = p1 >= size ? 1 : 2;
      aggregator.recordGame(move, winner, startingPlayer, m70, m75, m80, m90, m95);
    }

    completed += currentBatch;
    parentPort.postMessage({ type: 'progress', gamesDone: currentBatch });
  }

  // Send back raw aggregator data to main thread
  parentPort.postMessage({
    type: 'complete',
    aggregator: {
      gamesCount: aggregator.gamesCount,
      p1Wins: aggregator.p1Wins,
      p2Wins: aggregator.p2Wins,
      p1Starts: aggregator.p1Starts,
      p2Starts: aggregator.p2Starts,
      reached70: aggregator.reached70,
      notReached70: aggregator.notReached70,
      reached75: aggregator.reached75,
      notReached75: aggregator.notReached75,
      reached80: aggregator.reached80,
      notReached80: aggregator.notReached80,
      reached90: aggregator.reached90,
      notReached90: aggregator.notReached90,
      reached95: aggregator.reached95,
      notReached95: aggregator.notReached95,
      sumGameLength: aggregator.sumGameLength,
      sumM70: aggregator.sumM70,
      sumM75: aggregator.sumM75,
      sumM80: aggregator.sumM80,
      sumM90: aggregator.sumM90,
      sumM95: aggregator.sumM95,
      gameLengthHist: Array.from(aggregator.gameLengthHist),
      m70Hist: Array.from(aggregator.m70Hist),
      m75Hist: Array.from(aggregator.m75Hist),
      m80Hist: Array.from(aggregator.m80Hist),
      m90Hist: Array.from(aggregator.m90Hist),
      m95Hist: Array.from(aggregator.m95Hist)
    }
  });

} else {
  // Main Thread orchestrator
  async function run100MillionExperiment() {
    const NUM_THREADS = Math.min(10, os.cpus().length || 4);
    const GAMES_PER_BOARD = 10000000;
    const TOTAL_BOARDS = BOARDS.length;
    const TOTAL_GAMES_TARGET = GAMES_PER_BOARD * TOTAL_BOARDS;

    console.log(`=============================================================`);
    console.log(`SNAKES & LADDERS LAB: 100,000,000 EXPERIMENT ENGINE (70, 75, 80%)`);
    console.log(`=============================================================`);
    console.log(`Target: ${TOTAL_BOARDS} Boards × ${GAMES_PER_BOARD.toLocaleString()} Games = ${TOTAL_GAMES_TARGET.toLocaleString()} Games Total`);
    console.log(`Hardware: ${os.cpus().length} logical cores (using ${NUM_THREADS} worker threads)`);
    console.log(`Seed: 123456789 (Deterministic & Reproducible)\n`);

    const experimentStartTime = Date.now();
    const boardResults = [];
    const pooledAggregator = new ExperimentAggregator(300);

    let totalGamesCompleted = 0;

    for (let bIdx = 0; bIdx < TOTAL_BOARDS; bIdx++) {
      const board = BOARDS[bIdx];
      const boardStartTime = Date.now();
      console.log(`\n-------------------------------------------------------------`);
      console.log(`[${bIdx + 1}/${TOTAL_BOARDS}] Running Board: "${board.name}" (${board.id})`);
      console.log(`Target: ${GAMES_PER_BOARD.toLocaleString()} games...`);

      const gamesPerThread = Math.floor(GAMES_PER_BOARD / NUM_THREADS);
      const boardAggregator = new ExperimentAggregator(300);
      let boardGamesDone = 0;

      const workers = [];
      const workerPromises = [];

      for (let t = 0; t < NUM_THREADS; t++) {
        const targetForThisThread = (t === NUM_THREADS - 1)
          ? (GAMES_PER_BOARD - (gamesPerThread * (NUM_THREADS - 1)))
          : gamesPerThread;

        const p = new Promise((resolve, reject) => {
          const worker = new Worker(__filename, {
            workerData: {
              boardConfig: board,
              gamesTarget: targetForThisThread,
              seed: 123456789 + (bIdx * 1000) + t,
              workerId: t + 1
            }
          });

          worker.on('message', (msg) => {
            if (msg.type === 'progress') {
              boardGamesDone += msg.gamesDone;
              totalGamesCompleted += msg.gamesDone;
              const pct = ((boardGamesDone / GAMES_PER_BOARD) * 100).toFixed(1);
              const totalPct = ((totalGamesCompleted / TOTAL_GAMES_TARGET) * 100).toFixed(1);
              const elapsedSec = (Date.now() - experimentStartTime) / 1000;
              const rate = Math.round(totalGamesCompleted / elapsedSec);
              process.stdout.write(`\r  Board: ${boardGamesDone.toLocaleString()} / ${GAMES_PER_BOARD.toLocaleString()} (${pct}%) | Overall: ${totalGamesCompleted.toLocaleString()} / ${TOTAL_GAMES_TARGET.toLocaleString()} (${totalPct}%) | Speed: ${rate.toLocaleString()} games/sec`);
            } else if (msg.type === 'complete') {
              const raw = msg.aggregator;
              const tempAgg = new ExperimentAggregator(300);
              tempAgg.gamesCount = raw.gamesCount;
              tempAgg.p1Wins = raw.p1Wins;
              tempAgg.p2Wins = raw.p2Wins;
              tempAgg.p1Starts = raw.p1Starts;
              tempAgg.p2Starts = raw.p2Starts;
              tempAgg.reached70 = raw.reached70;
              tempAgg.notReached70 = raw.notReached70;
              tempAgg.reached75 = raw.reached75;
              tempAgg.notReached75 = raw.notReached75;
              tempAgg.reached80 = raw.reached80;
              tempAgg.notReached80 = raw.notReached80;
              tempAgg.reached90 = raw.reached90;
              tempAgg.notReached90 = raw.notReached90;
              tempAgg.reached95 = raw.reached95;
              tempAgg.notReached95 = raw.notReached95;
              tempAgg.sumGameLength = raw.sumGameLength;
              tempAgg.sumM70 = raw.sumM70;
              tempAgg.sumM75 = raw.sumM75;
              tempAgg.sumM80 = raw.sumM80;
              tempAgg.sumM90 = raw.sumM90;
              tempAgg.sumM95 = raw.sumM95;
              tempAgg.gameLengthHist.set(raw.gameLengthHist);
              tempAgg.m70Hist.set(raw.m70Hist);
              tempAgg.m75Hist.set(raw.m75Hist);
              tempAgg.m80Hist.set(raw.m80Hist);
              tempAgg.m90Hist.set(raw.m90Hist);
              tempAgg.m95Hist.set(raw.m95Hist);

              boardAggregator.merge(tempAgg);
              resolve();
            }
          });

          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
          });

          workers.push(worker);
        });

        workerPromises.push(p);
      }

      await Promise.all(workerPromises);
      const boardElapsedSec = ((Date.now() - boardStartTime) / 1000).toFixed(2);
      const boardReport = boardAggregator.toReport();

      console.log(`\n  Board "${board.name}" Completed in ${boardElapsedSec}s.`);
      console.log(`  Mean Game Length: ${boardReport.gameLength.mean} moves (Median: ${boardReport.gameLength.median})`);
      console.log(`  70% Advantage: Mean ${boardReport.threshold70.mean} moves (${boardReport.threshold70.reachedPct}% reached)`);
      console.log(`  75% Strong Favorite: Mean ${boardReport.threshold75.mean} moves (${boardReport.threshold75.reachedPct}% reached)`);
      console.log(`  80% Heavy Favorite: Mean ${boardReport.threshold80.mean} moves (${boardReport.threshold80.reachedPct}% reached)`);

      boardResults.push({
        boardId: board.id,
        boardName: board.name,
        subtitle: board.subtitle,
        snakesCount: Object.keys(board.snakes || {}).length,
        laddersCount: Object.keys(board.ladders || {}).length,
        report: boardReport
      });

      pooledAggregator.merge(boardAggregator);
    }

    const totalElapsedSec = ((Date.now() - experimentStartTime) / 1000).toFixed(2);
    const pooledReport = pooledAggregator.toReport();

    console.log(`\n=============================================================`);
    console.log(`EXPERIMENT COMPLETE: 100,000,000 TOTAL GAMES SIMULATED`);
    console.log(`=============================================================`);
    console.log(`Total Time: ${totalElapsedSec}s (${(totalGamesCompleted / totalElapsedSec).toFixed(0)} games/sec average)`);
    console.log(`Cross-Board Pooled Results (100,000,000 games):`);
    console.log(`  Mean Game Length: ${pooledReport.gameLength.mean} moves (Median: ${pooledReport.gameLength.median})`);
    console.log(`  Mean 70% Horizon: ${pooledReport.threshold70.mean} moves (${pooledReport.threshold70.reachedPct}% reached)`);
    console.log(`  Mean 75% Horizon: ${pooledReport.threshold75.mean} moves (${pooledReport.threshold75.reachedPct}% reached)`);
    console.log(`  Mean 80% Horizon: ${pooledReport.threshold80.mean} moves (${pooledReport.threshold80.reachedPct}% reached)`);

    const finalOutput = {
      meta: {
        title: "Snakes & Ladders Lab: 100-Million-Game Predictability Dataset",
        experimenter: "Geervan",
        date: "2026-09-19",
        version: "2.1.0",
        seed: 123456789,
        prng: "Xoshiro128++ (Deterministic Uniform 32-bit)",
        totalBoards: TOTAL_BOARDS,
        gamesPerBoard: GAMES_PER_BOARD,
        totalGames: TOTAL_GAMES_TARGET,
        executionTimeSeconds: parseFloat(totalElapsedSec),
        thresholds: [0.70, 0.75, 0.80, 0.90, 0.95],
        primaryThresholds: [0.70, 0.75, 0.80],
        rules: {
          gridSize: 100,
          dice: "1-6 uniform",
          bounceRule: "exact landing required (overshoot remains in place)",
          startingTurn: "independent unbiased 50/50 coin flip per game",
          moveDefinition: "one player dice roll and resulting state transition"
        }
      },
      pooledSummary: pooledReport,
      boards: boardResults
    };

    const outPath = path.join(__dirname, 'data', 'results.json');
    fs.writeFileSync(outPath, JSON.stringify(finalOutput, null, 2), 'utf8');
    console.log(`\nDataset successfully exported to: ${outPath}`);
  }

  run100MillionExperiment().catch(err => {
    console.error('Fatal error in experiment run:', err);
    process.exit(1);
  });
}
