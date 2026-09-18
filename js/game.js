/**
 * Snakes & Ladders Lab: Game Engine
 * Manages player state, turn alternation, 50/50 starting player, piece movement, and threshold milestones.
 */

import { ProbabilityEngine } from './probability.js';

export class GameEngine {
  constructor(boardConfig, options = {}) {
    this.config = boardConfig;
    this.size = boardConfig.size || 100;
    this.snakes = boardConfig.snakes || {};
    this.ladders = boardConfig.ladders || {};
    this.probEngine = new ProbabilityEngine(boardConfig);

    this.onStateChange = options.onStateChange || null;
    this.onThresholdCrossed = options.onThresholdCrossed || null;
    this.onGameEnd = options.onGameEnd || null;

    this.reset();
  }

  setBoard(boardConfig) {
    this.config = boardConfig;
    this.size = boardConfig.size || 100;
    this.snakes = boardConfig.snakes || {};
    this.ladders = boardConfig.ladders || {};
    this.probEngine.setBoard(boardConfig);
    this.reset();
  }

  reset() {
    this.moveCount = 0;
    this.p1Pos = 0;
    this.p2Pos = 0;
    this.lastRoll = null;
    this.lastRolledBy = null;
    this.winner = null;
    this.isOver = false;

    // 50/50 random starting player selection
    this.startingPlayer = Math.random() < 0.5 ? 1 : 2;
    this.currentTurn = this.startingPlayer;

    // Threshold tracking for the current game
    this.thresholdsCrossed = {
      70: null,  // { move: N, leader: 1|2, prob: 0.7X }
      75: null,
      80: null,
      90: null,
      95: null
    };

    this.history = [];
    this.notifyState();
  }

  getState() {
    const prob = this.probEngine.getWinProbabilities(this.p1Pos, this.p2Pos, this.currentTurn);
    return {
      moveCount: this.moveCount,
      p1Pos: this.p1Pos,
      p2Pos: this.p2Pos,
      currentTurn: this.currentTurn,
      startingPlayer: this.startingPlayer,
      lastRoll: this.lastRoll,
      lastRolledBy: this.lastRolledBy,
      winner: this.winner,
      isOver: this.isOver,
      probabilities: prob,
      thresholds: this.thresholdsCrossed
    };
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  /**
   * Executes a roll for the active player
   * Returns step details for animation
   */
  executeTurn(rollValue) {
    if (this.isOver) return null;

    const player = this.currentTurn;
    const fromPos = player === 1 ? this.p1Pos : this.p2Pos;
    let intermediatePos = fromPos + rollValue;

    // Check exact finish bounce/stay rule
    if (intermediatePos > this.size) {
      intermediatePos = fromPos;
    }

    let finalPos = intermediatePos;
    let isLadder = false;
    let isSnake = false;

    if (this.ladders[intermediatePos]) {
      finalPos = this.ladders[intermediatePos];
      isLadder = true;
    } else if (this.snakes[intermediatePos]) {
      finalPos = this.snakes[intermediatePos];
      isSnake = true;
    }

    // Update positions
    if (player === 1) {
      this.p1Pos = finalPos;
    } else {
      this.p2Pos = finalPos;
    }

    this.moveCount++;
    this.lastRoll = rollValue;
    this.lastRolledBy = player;

    // Check winner
    if (finalPos === this.size) {
      this.winner = player;
      this.isOver = true;
    }

    // Switch turn
    const nextTurn = player === 1 ? 2 : 1;
    this.currentTurn = nextTurn;

    // Check Win Probabilities & Thresholds
    const prob = this.probEngine.getWinProbabilities(this.p1Pos, this.p2Pos, this.currentTurn);

    this.checkThresholds(prob);

    // Save history record
    this.history.push({
      move: this.moveCount,
      player,
      roll: rollValue,
      from: fromPos,
      intermediate: intermediatePos,
      to: finalPos,
      p1Pos: this.p1Pos,
      p2Pos: this.p2Pos,
      probP1: prob.p1,
      probP2: prob.p2,
      confidence: prob.confidence,
      leader: prob.leader
    });

    this.notifyState();

    if (this.isOver && this.onGameEnd) {
      this.onGameEnd(this.getState());
    }

    return {
      player,
      roll: rollValue,
      from: fromPos,
      intermediate: intermediatePos,
      to: finalPos,
      isLadder,
      isSnake,
      winner: this.winner
    };
  }

  checkThresholds(prob) {
    // Only track prediction thresholds WHILE the game is actively in progress.
    // Crossing a threshold on the final winning roll is a conclusion, not an advance prediction.
    if (this.isOver) return;

    const thresholds = [
      { key: 70, val: 0.70 },
      { key: 75, val: 0.75 },
      { key: 80, val: 0.80 },
      { key: 90, val: 0.90 },
      { key: 95, val: 0.95 }
    ];

    thresholds.forEach(t => {
      if (!this.thresholdsCrossed[t.key] && prob.confidence >= t.val) {
        this.thresholdsCrossed[t.key] = {
          move: this.moveCount,
          leader: prob.leader,
          prob: prob.confidence
        };

        if (this.onThresholdCrossed) {
          this.onThresholdCrossed({
            threshold: t.key,
            move: this.moveCount,
            leader: prob.leader,
            confidence: prob.confidence
          });
        }
      }
    });
  }
}
