/**
 * Snakes & Ladders Lab: Tactile Dice Controller
 * Handles animated 3D/tactile rolling dice, pip patterns, and roll results.
 */

export class DiceRoller {
  constructor(elementId, onRollComplete) {
    this.container = document.getElementById(elementId);
    this.onRollComplete = onRollComplete;
    this.isRolling = false;
    this.lastValue = 1;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="dice-face-flat" id="dice-face" title="Click to Roll">
        ${Array.from({ length: 9 }).map((_, i) => `<div class="pip" id="pip-${i}"></div>`).join('')}
      </div>
      <div style="font-family: var(--font-heading); font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-top: 8px;" id="dice-value-text">
        Click to Roll
      </div>
    `;

    this.diceFace = this.container.querySelector('#dice-face');
    this.valueText = this.container.querySelector('#dice-value-text');
    
    this.diceFace.addEventListener('click', () => {
      if (!this.isRolling) {
        this.roll();
      }
    });

    this.displayValue(1);
  }

  // Map 1-6 dice values to 3x3 grid pips (indices 0 to 8)
  getPattern(val) {
    switch (val) {
      case 1: return [4];
      case 2: return [2, 6];
      case 3: return [2, 4, 6];
      case 4: return [0, 2, 6, 8];
      case 5: return [0, 2, 4, 6, 8];
      case 6: return [0, 2, 3, 5, 6, 8];
      default: return [4];
    }
  }

  displayValue(val) {
    const activePips = this.getPattern(val);
    const pips = this.container.querySelectorAll('.pip');
    pips.forEach((pip, idx) => {
      if (activePips.includes(idx)) {
        pip.classList.add('visible');
      } else {
        pip.classList.remove('visible');
      }
    });
    this.lastValue = val;
  }

  roll(forcedValue = null, animationDuration = 550) {
    if (this.isRolling) return Promise.resolve(this.lastValue);
    this.isRolling = true;

    const result = forcedValue || Math.floor(Math.random() * 6) + 1;
    this.diceFace.classList.add('rolling');
    this.valueText.textContent = "Rolling...";

    // Rapidly change faces during the roll
    let elapsed = 0;
    const interval = 70;
    const timer = setInterval(() => {
      const randFace = Math.floor(Math.random() * 6) + 1;
      this.displayValue(randFace);
      elapsed += interval;
    }, interval);

    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(timer);
        this.displayValue(result);
        this.diceFace.classList.remove('rolling');
        this.valueText.textContent = `Rolled: ${result}`;
        this.isRolling = false;
        if (this.onRollComplete) {
          this.onRollComplete(result);
        }
        resolve(result);
      }, animationDuration);
    });
  }
}
