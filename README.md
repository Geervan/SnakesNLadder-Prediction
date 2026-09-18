# Snakes & Ladders Prediction Lab

> A high-performance mathematical simulation and Markov chain prediction engine analyzing when randomness turns into statistical certainty across 100,000,000 simulated games.

**Live Demo (GitHub Pages):** [https://geervan.github.io/SnakesNLadder-Prediction/](https://geervan.github.io/SnakesNLadder-Prediction/)

---

## The Core Question

*Snakes & Ladders is universally considered a game of pure luck. But after how many moves can we mathematically predict who will win?*

By combining exact **absorbing Markov chain transition matrices** with **100,000,000 Monte Carlo game simulations** across 10 distinct board topologies, this research identifies the exact tipping point where random dice rolls transform into statistical predictability.

---

## Key Findings & Breakthroughs

1. **The Move 31 Milestone**:
   * While an average full match of Classic 100 lasts **36.2 moves**, by **Move 31** the leading player reaches at least a **75% win probability (3:1 favorite odds)** in **91.4% of all games**.
   * Prior to Move 20, outcome variance is high (win odds fluctuate between 45% and 55%).
   * Between Move 25 and Move 31, upper-tier ladder ascents create irreversible lead states.

2. **Why 70%, 75%, and 80% Share Move 31**:
   * Late-stage ladders cause discrete leaps in state space. Ascending a ladder from square 71 to 91 catapults a player's win probability from 68% past 80% on a single turn.

3. **The 90% Horizon Paradox**:
   * A **90% certainty threshold** is only reached in **30.6% of games** before the final turn.
   * Severe snakes on the top row (square 98 to 78 and square 95 to 56) preserve comeback risk until the final roll is executed.

4. **Law of Large Numbers Verification**:
   * Simulating 100,000,000 games yields a standard error of $SE = \sqrt{\frac{p(1-p)}{N}} \approx 0.00005$ ($<\pm 0.016\%$ margin of error at a 99.9% confidence interval).
   * Empirical Monte Carlo win frequencies match analytical Markov chain probabilities with less than **0.03% total discrepancy**.

---

## Mathematical Architecture

### Absorbing Markov Chain Model

Snakes & Ladders is modeled as a discrete-time Markov chain with a state space $S = \{0, 1, 2, \dots, 100\}$, where 0 is the starting state and 100 is the absorbing finish state.

* **Transition Matrix $P$**: A $101 \times 101$ stochastic matrix where $P_{i,j}$ represents the probability of transitioning from square $i$ to square $j$ on a single roll $d \in \{1, 2, 3, 4, 5, 6\}$.
* **2-Player Exact Win Formula**:

$$P(P_1 \text{ wins} \mid s_1, s_2, \text{turn}=1) = \sum_{k=1}^{\infty} \left[ T(s_1, k) \cdot S(s_2, k-1) \right]$$

Where:
* $T(s, k) = (P^k)_{s, 100} - (P^{k-1})_{s, 100}$ is the probability that a player starting at square $s$ finishes on exactly turn $k$.
* $S(s, k) = 1 - (P^k)_{s, 100}$ is the survival probability that a player starting at square $s$ has not finished after $k$ turns.

---

## System Features

* **Real-time Live Simulator**: Play manually or run auto-simulations with real-time Markov probability gauges for every single roll.
* **8-Thread Parallel Web Worker Suite**: Computes millions of simulations per second in the background without freezing the UI.
* **Deterministic Xoshiro128++ PRNG**: High-speed 128-bit pseudo-random number generator for uniform distribution and minimal CPU cycle overhead.
* **Interactive Boards Gallery**: Explore 10 distinct board configurations with dynamic SVG path rendering, snake animations, and metric comparisons.
* **Methodology Deep-Dive**: Comprehensive educational breakdown of Markov models, transition matrices, the Law of Large Numbers, and topological dynamics.
* **Aesthetic 3D Neo-Brutalism**: Tactile carved wood desk and aged parchment interface with smooth micro-animations, custom SVG assets, and zero external UI bloat.

---

## Local Development & Setup

To run the project locally without any dependencies:

```bash
# 1. Clone the repository
git clone https://github.com/Geervan/SnakesNLadder-Prediction.git
cd SnakesNLadder-Prediction

# 2. Serve using any local static server
python -m http.server 8080
# Or using Node:
npx serve .
```

---

## Author & Credits

Researched & Built by **Geervan**

* **LinkedIn**: [linkedin.com/in/geervan](https://www.linkedin.com/in/geervan/)
* **GitHub**: [github.com/geervan](https://github.com/geervan)
