/**
 * Snakes & Ladders Lab: Simulation Engine
 * Handles live animated autoplay as well as high-throughput Monte Carlo experimental runs.
 */

export class SimulationController {
  constructor(gameEngine, boardRenderer, diceRoller, options = {}) {
    this.game = gameEngine;
    this.board = boardRenderer;
    this.dice = diceRoller;
    this.speed = 1; // 1 = normal, 2 = fast, 5 = very fast, 10 = instant
    this.isPlaying = false;
    this.isStepInProgress = false;

    this.onSimulationEnd = options.onSimulationEnd || null;
    this.onStatusChange = options.onStatusChange || null;
  }

  setSpeed(speedVal) {
    this.speed = Math.max(0.5, Math.min(20, speedVal));
  }

  async start() {
    if (this.isPlaying) return;
    if (this.game.isOver) {
      this.reset();
    }
    this.isPlaying = true;
    if (this.onStatusChange) this.onStatusChange({ isPlaying: true });

    while (this.isPlaying && !this.game.isOver) {
      await this.step();
      if (!this.isPlaying || this.game.isOver) break;
      const pauseDuration = Math.max(50, Math.floor(600 / this.speed));
      await new Promise(r => setTimeout(r, pauseDuration));
    }

    this.isPlaying = false;
    if (this.onStatusChange) this.onStatusChange({ isPlaying: false });
    if (this.game.isOver && this.onSimulationEnd) {
      this.onSimulationEnd(this.game.getState());
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.onStatusChange) this.onStatusChange({ isPlaying: false });
  }

  reset() {
    this.pause();
    this.game.reset();
    this.board.updateTokens(0, 0);
  }

  async step() {
    if (this.isStepInProgress || this.game.isOver) return;
    this.isStepInProgress = true;

    // 1. Roll the die
    const roll = Math.floor(Math.random() * 6) + 1;
    const animDiceTime = this.speed > 4 ? 80 : Math.max(150, 450 / this.speed);
    
    if (this.dice) {
      await this.dice.roll(roll, animDiceTime);
    }

    // 2. Execute Game Turn
    const turnResult = this.game.executeTurn(roll);
    if (!turnResult) {
      this.isStepInProgress = false;
      return;
    }

    // 3. Animate on the Board
    if (this.board) {
      const stepDelay = this.speed > 5 ? 0 : Math.max(20, Math.floor(100 / this.speed));

      // Step by step
      if (turnResult.intermediate !== turnResult.from) {
        await this.board.animateStepByStep(
          turnResult.player,
          turnResult.from,
          turnResult.intermediate,
          stepDelay
        );
      }

      // Check ladder or snake animation
      if (turnResult.isLadder) {
        if (this.speed <= 5) {
          await this.board.animateClimb(turnResult.player, turnResult.intermediate, turnResult.to);
        } else {
          this.board.updateTokens(this.game.p1Pos, this.game.p2Pos);
        }
      } else if (turnResult.isSnake) {
        if (this.speed <= 5) {
          await this.board.animateSlide(turnResult.player, turnResult.intermediate, turnResult.to);
        } else {
          this.board.updateTokens(this.game.p1Pos, this.game.p2Pos);
        }
      } else {
        this.board.updateTokens(this.game.p1Pos, this.game.p2Pos);
      }
    }

    this.isStepInProgress = false;
  }

  /**
   * High-throughput offline batch simulator for analysis
   * Simulates N complete games without DOM rendering to extract empirical distributions
   */
  static runBatch(boardConfig, numGames = 5000, progressCallback = null) {
    const size = boardConfig.size || 100;
    const snakes = boardConfig.snakes || {};
    const ladders = boardConfig.ladders || {};

    const thresholdCrossings = {
      90: [],
      95: [],
      99: [],
      99.9: []
    };

    const totalMovesList = [];
    let p1WinsCount = 0;
    let p2WinsCount = 0;

    // Fast Next State lookup table
    const nextSquare = new Int16Array((size + 1) * 7);
    for (let s = 0; s <= size; s++) {
      for (let d = 1; d <= 6; d++) {
        let dest = s + d;
        if (dest > size) {
          dest = s;
        } else if (snakes[dest]) {
          dest = snakes[dest];
        } else if (ladders[dest]) {
          dest = ladders[dest];
        }
        nextSquare[s * 7 + d] = dest;
      }
    }

    for (let g = 0; g < numGames; g++) {
      let p1 = 0;
      let p2 = 0;
      let move = 0;
      let turn = Math.random() < 0.5 ? 1 : 2;

      let crossed90 = false;
      let crossed95 = false;
      let crossed99 = false;
      let crossed999 = false;

      while (p1 < size && p2 < size && move < 500) {
        move++;
        const d = (Math.floor(Math.random() * 6) + 1);

        if (turn === 1) {
          p1 = nextSquare[p1 * 7 + d];
          turn = 2;
        } else {
          p2 = nextSquare[p2 * 7 + d];
          turn = 1;
        }

        // Empirical lead threshold estimator
        const leadDiff = Math.abs(p1 - p2);
        const maxPos = Math.max(p1, p2);

        if (!crossed90 && (leadDiff >= 28 || maxPos >= size - 4)) {
          thresholdCrossings[90].push(move);
          crossed90 = true;
        }
        if (!crossed95 && (leadDiff >= 38 || maxPos >= size - 2)) {
          thresholdCrossings[95].push(move);
          crossed95 = true;
        }
        if (!crossed99 && (leadDiff >= 52 || maxPos >= size - 1)) {
          thresholdCrossings[99].push(move);
          crossed99 = true;
        }
        if (!crossed999 && maxPos === size) {
          thresholdCrossings[99.9].push(move);
          crossed999 = true;
        }
      }

      totalMovesList.push(move);
      if (p1 >= size) p1WinsCount++;
      else p2WinsCount++;

      if (progressCallback && g % 500 === 0) {
        progressCallback(g / numGames);
      }
    }

    return {
      numGames,
      p1WinRate: p1WinsCount / numGames,
      p2WinRate: p2WinsCount / numGames,
      totalMoves: totalMovesList,
      thresholds: thresholdCrossings
    };
  }
}
