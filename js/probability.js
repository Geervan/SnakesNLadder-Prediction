/**
 * Snakes & Ladders Lab: Exact Markov Chain Probability Engine
 * Computes exact single-player transient turn distributions and 2-player win probabilities.
 */

export class ProbabilityEngine {
  constructor(boardConfig, maxTurns = 300) {
    this.config = boardConfig;
    this.size = boardConfig.size || 100;
    this.maxTurns = maxTurns;
    this.snakes = boardConfig.snakes || {};
    this.ladders = boardConfig.ladders || {};
    
    // T[s][k] = probability that player starting at square s finishes exactly on turn k
    // C[s][k] = probability that player starting at square s finishes in <= k turns
    this.T = null;
    this.C = null;
    this.computeDistributions();
  }

  setBoard(boardConfig) {
    this.config = boardConfig;
    this.size = boardConfig.size || 100;
    this.snakes = boardConfig.snakes || {};
    this.ladders = boardConfig.ladders || {};
    this.computeDistributions();
  }

  /**
   * Precomputes transient turn distributions T[s][k] for all states s in [0..size]
   */
  computeDistributions() {
    const N = this.size;
    const K = this.maxTurns;
    const numStates = N + 1;

    // Transition map: from square s, roll d (1..6) leads to targetSquare
    const nextState = new Array(numStates);
    for (let s = 0; s <= N; s++) {
      nextState[s] = new Array(7);
      for (let d = 1; d <= 6; d++) {
        let dest = s + d;
        if (dest > N) {
          dest = s; // Standard rule: must land with exact roll
        } else {
          if (this.snakes[dest]) {
            dest = this.snakes[dest];
          } else if (this.ladders[dest]) {
            dest = this.ladders[dest];
          }
        }
        nextState[s][d] = dest;
      }
    }

    // dp[k][s] = probability of being at square s after k turns (with N as absorbing)
    // We compute turn distributions iteratively
    this.T = Array.from({ length: numStates }, () => new Float64Array(K + 1));
    this.C = Array.from({ length: numStates }, () => new Float64Array(K + 1));

    // For each possible start position s:
    for (let startS = 0; startS < N; startS++) {
      let stateProb = new Float64Array(numStates);
      stateProb[startS] = 1.0;

      let cumFinished = 0.0;

      for (let k = 1; k <= K; k++) {
        let nextProb = new Float64Array(numStates);
        let finishedThisTurn = 0.0;

        for (let s = 0; s < N; s++) {
          const p = stateProb[s];
          if (p <= 1e-12) continue;

          for (let d = 1; d <= 6; d++) {
            const dest = nextState[s][d];
            const transProb = p * (1.0 / 6.0);
            if (dest === N) {
              finishedThisTurn += transProb;
            } else {
              nextProb[dest] += transProb;
            }
          }
        }

        this.T[startS][k] = finishedThisTurn;
        cumFinished += finishedThisTurn;
        this.C[startS][k] = cumFinished;
        stateProb = nextProb;
      }
    }

    // Absorbing state N
    this.T[N][0] = 1.0;
    this.C[N].fill(1.0);
  }

  /**
   * Calculates exact probability of Player 1 and Player 2 eventually winning from state (s1, s2, currentTurn)
   * @param {number} s1 - Player 1 position (0 to size)
   * @param {number} s2 - Player 2 position (0 to size)
   * @param {number} turn - Whose turn it is next (1 or 2)
   * @returns {{ p1: number, p2: number, leader: number, confidence: number }}
   */
  getWinProbabilities(s1, s2, turn = 1) {
    const N = this.size;

    // Terminal check
    if (s1 >= N) return { p1: 1.0, p2: 0.0, leader: 1, confidence: 1.0 };
    if (s2 >= N) return { p1: 0.0, p2: 1.0, leader: 2, confidence: 1.0 };

    const K = this.maxTurns;
    let probP1Wins = 0.0;

    if (turn === 1) {
      // P1 rolls first. P1 wins if P1 finishes on roll k and P2 finishes on roll >= k
      // i.e. P2 has NOT finished in k-1 rolls: (1 - C[s2][k-1])
      for (let k = 1; k <= K; k++) {
        const p1FinishK = this.T[s1][k];
        if (p1FinishK <= 1e-12) continue;
        const p2SurvivesKMinus1 = 1.0 - this.C[s2][k - 1];
        probP1Wins += p1FinishK * p2SurvivesKMinus1;
      }
    } else {
      // P2 rolls first. P2 wins if P2 finishes on roll k and P1 has not finished in k-1 rolls
      let probP2Wins = 0.0;
      for (let k = 1; k <= K; k++) {
        const p2FinishK = this.T[s2][k];
        if (p2FinishK <= 1e-12) continue;
        const p1SurvivesKMinus1 = 1.0 - this.C[s1][k - 1];
        probP2Wins += p2FinishK * p1SurvivesKMinus1;
      }
      probP1Wins = 1.0 - probP2Wins;
    }

    // Clamp between [0, 1] for numerical precision
    probP1Wins = Math.max(0.0, Math.min(1.0, probP1Wins));
    const probP2Wins = Math.max(0.0, Math.min(1.0, 1.0 - probP1Wins));

    const leader = probP1Wins >= probP2Wins ? 1 : 2;
    const confidence = Math.max(probP1Wins, probP2Wins);

    return {
      p1: probP1Wins,
      p2: probP2Wins,
      leader,
      confidence
    };
  }

  /**
   * Checks which prediction thresholds (90%, 95%, 99%, 99.9%) have been reached
   */
  evaluateThresholds(confidence) {
    return {
      t90: confidence >= 0.90,
      t95: confidence >= 0.95,
      t99: confidence >= 0.99,
      t999: confidence >= 0.999
    };
  }
}
