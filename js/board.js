/**
 * Snakes & Ladders Lab: Board Rendering & Motion Engine
 * Programmatic SVG & HTML grid generation, boustrophedon coordinate mapping, and smooth piece animations.
 */

export class BoardRenderer {
  constructor(containerId, boardConfig) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.config = boardConfig;
    this.rows = boardConfig.rows || 10;
    this.cols = boardConfig.cols || 10;
    this.size = boardConfig.size || (this.rows * this.cols);
    this.tokenPositions = { 1: 0, 2: 0 };
    this.init();
  }

  setBoard(boardConfig) {
    this.config = boardConfig;
    this.rows = boardConfig.rows || 10;
    this.cols = boardConfig.cols || 10;
    this.size = boardConfig.size || (this.rows * this.cols);
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.className = `board-container`;

    // 1. Create Grid Layer
    const gridEl = document.createElement('div');
    gridEl.className = `board-grid board-grid-${this.cols}`;
    
    // Generate tiles in top-to-bottom rendering order
    const tileGrid = this.generateTileGrid();
    tileGrid.forEach(tileData => {
      const squareEl = document.createElement('div');
      const isEven = (tileData.row + tileData.col) % 2 === 0;
      let colorClass = isEven ? 'tile-cream' : 'tile-sage';
      if (tileData.num % 7 === 0) colorClass = 'tile-terracotta';
      else if (tileData.num % 5 === 0) colorClass = 'tile-ochre';

      squareEl.className = `board-square ${colorClass}`;
      squareEl.dataset.square = tileData.num;

      if (tileData.num === this.size) squareEl.classList.add('is-finish');
      if (tileData.num === 1) squareEl.classList.add('is-start');

      squareEl.innerHTML = `
        <span class="square-number">${tileData.num}</span>
      `;
      gridEl.appendChild(squareEl);
    });
    this.container.appendChild(gridEl);

    // 2. Create SVG Overlay for Snakes & Ladders
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('class', 'board-svg-overlay');
    svgEl.setAttribute('viewBox', '0 0 1000 1000');
    svgEl.setAttribute('preserveAspectRatio', 'none');
    
    // Add Defs for Gradients and Shadows
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="svg-snake-shadow-filter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="4" dy="5" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.45"/>
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="ladder-rung-wood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5cf7a" />
        <stop offset="50%" stop-color="#ab7033" />
        <stop offset="100%" stop-color="#643b17" />
      </linearGradient>
    `;
    svgEl.appendChild(defs);
    this.svgOverlay = svgEl;
    this.container.appendChild(svgEl);

    // 3. Create Player Tokens Layer
    const tokensLayer = document.createElement('div');
    tokensLayer.className = 'board-tokens-layer';
    tokensLayer.innerHTML = `
      <div class="player-token token-p1" id="token-p1" style="display:none;">1</div>
      <div class="player-token token-p2" id="token-p2" style="display:none;">2</div>
    `;
    this.tokensLayer = tokensLayer;
    this.container.appendChild(tokensLayer);

    this.tokenP1 = tokensLayer.querySelector('#token-p1');
    this.tokenP2 = tokensLayer.querySelector('#token-p2');

    // Draw SVG Elements
    this.drawLadders();
    this.drawSnakes();
  }

  /**
   * Generates 2D array of squares in display order (row 0 = top, row N-1 = bottom)
   */
  generateTileGrid() {
    const tiles = [];
    const isLeftToRight = this.config.gridType === 'left-to-right';

    for (let r = 0; r < this.rows; r++) {
      const rowFromBottom = (this.rows - 1) - r;
      const isReversed = isLeftToRight ? false : (rowFromBottom % 2 === 1);

      for (let c = 0; c < this.cols; c++) {
        const colIndex = isReversed ? (this.cols - 1 - c) : c;
        const squareNum = (rowFromBottom * this.cols) + colIndex + 1;
        tiles.push({
          row: r,
          col: c,
          num: squareNum
        });
      }
    }
    return tiles;
  }

  /**
   * Gets center coordinates (0 to 1000 viewBox scale) for a given square number
   */
  getSquareCoords(squareNum) {
    if (squareNum <= 0) return { x: 50, y: 950 };
    if (squareNum > this.size) squareNum = this.size;

    const isLeftToRight = this.config.gridType === 'left-to-right';
    const zeroIndexed = squareNum - 1;
    const rowFromBottom = Math.floor(zeroIndexed / this.cols);
    const colInRow = zeroIndexed % this.cols;
    
    const isReversed = isLeftToRight ? false : (rowFromBottom % 2 === 1);
    const colIndex = isReversed ? (this.cols - 1 - colInRow) : colInRow;
    const rowIndex = (this.rows - 1) - rowFromBottom;

    const cellWidth = 1000 / this.cols;
    const cellHeight = 1000 / this.rows;

    return {
      x: (colIndex + 0.5) * cellWidth,
      y: (rowIndex + 0.5) * cellHeight
    };
  }

  drawLadders() {
    const ladders = this.config.ladders || {};
    const svg = this.svgOverlay;

    Object.entries(ladders).forEach(([startStr, endNum]) => {
      const startNum = parseInt(startStr, 10);
      const start = this.getSquareCoords(startNum);
      const end = this.getSquareCoords(endNum);

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) return;

      const angle = Math.atan2(dy, dx);
      const perpX = -Math.sin(angle) * 16;
      const perpY = Math.cos(angle) * 16;

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'svg-ladder-item');

      // Drop Shadows for both rails
      const shadowStile1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      shadowStile1.setAttribute('x1', `${start.x - perpX + 6}`);
      shadowStile1.setAttribute('y1', `${start.y - perpY + 6}`);
      shadowStile1.setAttribute('x2', `${end.x - perpX + 6}`);
      shadowStile1.setAttribute('y2', `${end.y - perpY + 6}`);
      shadowStile1.setAttribute('stroke', 'rgba(25,12,5,0.32)');
      shadowStile1.setAttribute('stroke-width', '8');
      shadowStile1.setAttribute('stroke-linecap', 'round');
      group.appendChild(shadowStile1);

      const shadowStile2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      shadowStile2.setAttribute('x1', `${start.x + perpX + 6}`);
      shadowStile2.setAttribute('y1', `${start.y + perpY + 6}`);
      shadowStile2.setAttribute('x2', `${end.x + perpX + 6}`);
      shadowStile2.setAttribute('y2', `${end.y + perpY + 6}`);
      shadowStile2.setAttribute('stroke', 'rgba(25,12,5,0.32)');
      shadowStile2.setAttribute('stroke-width', '8');
      shadowStile2.setAttribute('stroke-linecap', 'round');
      group.appendChild(shadowStile2);

      // Wooden Left & Right Stiles
      const stile1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stile1.setAttribute('x1', `${start.x - perpX}`);
      stile1.setAttribute('y1', `${start.y - perpY}`);
      stile1.setAttribute('x2', `${end.x - perpX}`);
      stile1.setAttribute('y2', `${end.y - perpY}`);
      stile1.setAttribute('stroke', '#ab7033');
      stile1.setAttribute('stroke-width', '7');
      stile1.setAttribute('stroke-linecap', 'round');
      group.appendChild(stile1);

      const stile2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stile2.setAttribute('x1', `${start.x + perpX}`);
      stile2.setAttribute('y1', `${start.y + perpY}`);
      stile2.setAttribute('x2', `${end.x + perpX}`);
      stile2.setAttribute('y2', `${end.y + perpY}`);
      stile2.setAttribute('stroke', '#6f421a');
      stile2.setAttribute('stroke-width', '7');
      stile2.setAttribute('stroke-linecap', 'round');
      group.appendChild(stile2);

      // Wooden Rungs with Warm Highlight (Solid Wood - visible on all angles and vertical rails)
      const numRungs = Math.max(3, Math.floor(length / 32));
      for (let i = 1; i <= numRungs; i++) {
        const t = i / (numRungs + 1);
        const rx = start.x + dx * t;
        const ry = start.y + dy * t;

        // Shadow under rung
        const rungShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rungShadow.setAttribute('x1', `${rx - perpX + 3}`);
        rungShadow.setAttribute('y1', `${ry - perpY + 3}`);
        rungShadow.setAttribute('x2', `${rx + perpX + 3}`);
        rungShadow.setAttribute('y2', `${ry + perpY + 3}`);
        rungShadow.setAttribute('stroke', 'rgba(25, 12, 5, 0.35)');
        rungShadow.setAttribute('stroke-width', '6');
        rungShadow.setAttribute('stroke-linecap', 'round');
        group.appendChild(rungShadow);

        // Core Wood Rung
        const rung = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rung.setAttribute('x1', `${rx - perpX}`);
        rung.setAttribute('y1', `${ry - perpY}`);
        rung.setAttribute('x2', `${rx + perpX}`);
        rung.setAttribute('y2', `${ry + perpY}`);
        rung.setAttribute('stroke', '#a0682f');
        rung.setAttribute('stroke-width', '5.5');
        rung.setAttribute('stroke-linecap', 'round');
        group.appendChild(rung);

        // Top Light Wooden Accent
        const rungLight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rungLight.setAttribute('x1', `${rx - perpX}`);
        rungLight.setAttribute('y1', `${ry - perpY}`);
        rungLight.setAttribute('x2', `${rx + perpX}`);
        rungLight.setAttribute('y2', `${ry + perpY}`);
        rungLight.setAttribute('stroke', '#e4b665');
        rungLight.setAttribute('stroke-width', '2.5');
        rungLight.setAttribute('stroke-linecap', 'round');
        group.appendChild(rungLight);
      }

      svg.appendChild(group);
    });
  }

  drawSnakes() {
    const snakes = this.config.snakes || {};
    const svg = this.svgOverlay;
    let snakeIdx = 0;

    // Matte, earthy natural pigments (vintage storybook / woodblock aesthetic)
    const snakePalettes = [
      {
        body: '#3f6d48',
        border: '#1b3322',
        belly: '#f5e8c8',
        tongue: '#c43333',
        eyePupil: '#1b261d'
      },
      {
        body: '#be4e35',
        border: '#4a190f',
        belly: '#fbe9cf',
        tongue: '#c43333',
        eyePupil: '#30120b'
      },
      {
        body: '#2d6270',
        border: '#102d35',
        belly: '#e5f2f5',
        tongue: '#c43333',
        eyePupil: '#0c1f24'
      },
      {
        body: '#bd8026',
        border: '#472d07',
        belly: '#fdf2d6',
        tongue: '#c43333',
        eyePupil: '#261804'
      }
    ];

    Object.entries(snakes).forEach(([headStr, tailNum]) => {
      const headNum = parseInt(headStr, 10);
      const head = this.getSquareCoords(headNum);
      const tail = this.getSquareCoords(tailNum);
      const pal = snakePalettes[snakeIdx % snakePalettes.length];
      snakeIdx++;

      const dx = tail.x - head.x;
      const dy = tail.y - head.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;

      // Natural organic S-curve
      const waveAmp = Math.min(65, dist * 0.25);
      const cp1x = head.x + (dx * 0.3) + Math.cos(perpAngle) * waveAmp;
      const cp1y = head.y + (dy * 0.3) + Math.sin(perpAngle) * waveAmp;
      const cp2x = head.x + (dx * 0.7) - Math.cos(perpAngle) * waveAmp;
      const cp2y = head.y + (dy * 0.7) - Math.sin(perpAngle) * waveAmp;

      const pathData = `M ${head.x} ${head.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tail.x} ${tail.y}`;

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'svg-snake-item');

      // 1. Soft Matte Ground Shadow
      const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      shadowPath.setAttribute('d', `M ${head.x + 5} ${head.y + 6} C ${cp1x + 5} ${cp1y + 6}, ${cp2x + 5} ${cp2y + 6}, ${tail.x + 5} ${tail.y + 6}`);
      shadowPath.setAttribute('stroke', 'rgba(25, 12, 5, 0.2)');
      shadowPath.setAttribute('stroke-width', '22');
      shadowPath.setAttribute('fill', 'none');
      shadowPath.setAttribute('stroke-linecap', 'round');
      group.appendChild(shadowPath);

      // 2. Hand-Inked Dark Border Contour
      const outerBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      outerBody.setAttribute('d', pathData);
      outerBody.setAttribute('stroke', pal.border);
      outerBody.setAttribute('stroke-width', '19');
      outerBody.setAttribute('fill', 'none');
      outerBody.setAttribute('stroke-linecap', 'round');
      group.appendChild(outerBody);

      // 3. Matte Solid Body
      const mainSkin = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mainSkin.setAttribute('d', pathData);
      mainSkin.setAttribute('stroke', pal.body);
      mainSkin.setAttribute('stroke-width', '13');
      mainSkin.setAttribute('fill', 'none');
      mainSkin.setAttribute('stroke-linecap', 'round');
      group.appendChild(mainSkin);

      // 4. Matte Underbelly Woodblock Segment Stripes
      const bellyStripe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bellyStripe.setAttribute('d', pathData);
      bellyStripe.setAttribute('stroke', pal.belly);
      bellyStripe.setAttribute('stroke-width', '5');
      bellyStripe.setAttribute('fill', 'none');
      bellyStripe.setAttribute('stroke-dasharray', '8 8');
      bellyStripe.setAttribute('stroke-linecap', 'round');
      group.appendChild(bellyStripe);

      // 5. Tapered Tail Tip with Concentric Rings
      const tailRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      tailRing.setAttribute('cx', `${tail.x}`);
      tailRing.setAttribute('cy', `${tail.y}`);
      tailRing.setAttribute('r', '6');
      tailRing.setAttribute('fill', pal.belly);
      tailRing.setAttribute('stroke', pal.border);
      tailRing.setAttribute('stroke-width', '2');
      group.appendChild(tailRing);

      const tailDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      tailDot.setAttribute('cx', `${tail.x}`);
      tailDot.setAttribute('cy', `${tail.y}`);
      tailDot.setAttribute('r', '2.5');
      tailDot.setAttribute('fill', pal.body);
      group.appendChild(tailDot);

      // 6. Tangent Angle for Head
      const headAngle = Math.atan2(cp1y - head.y, cp1x - head.x);

      // 7. Hand-Drawn Matte Character Head
      const headGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      headGroup.setAttribute('transform', `translate(${head.x}, ${head.y}) rotate(${headAngle * 180 / Math.PI - 90})`);

      // Forked Tongue
      const tongueGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tongueGroup.setAttribute('class', 'svg-animated-tongue');
      const tonguePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tonguePath.setAttribute('d', 'M 0,-10 L 0,-20 L -4,-26 M 0,-20 L 4,-26');
      tonguePath.setAttribute('stroke', pal.tongue);
      tonguePath.setAttribute('stroke-width', '2.5');
      tonguePath.setAttribute('stroke-linecap', 'round');
      tonguePath.setAttribute('stroke-linejoin', 'round');
      tonguePath.setAttribute('fill', 'none');
      tongueGroup.appendChild(tonguePath);
      headGroup.appendChild(tongueGroup);

      // Head Base Oval / Cobra Contour
      const headBase = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      headBase.setAttribute('d', 'M 0,-14 C 11,-14 16,-4 15,9 C 13,16 6,17 0,17 C -6,17 -13,16 -15,9 C -16,-4 -11,-14 0,-14 Z');
      headBase.setAttribute('fill', pal.body);
      headBase.setAttribute('stroke', pal.border);
      headBase.setAttribute('stroke-width', '2.5');
      headGroup.appendChild(headBase);

      // Matte Nostril Dots
      const nosL = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      nosL.setAttribute('cx', '-3');
      nosL.setAttribute('cy', '-10');
      nosL.setAttribute('r', '1');
      nosL.setAttribute('fill', pal.border);
      headGroup.appendChild(nosL);

      const nosR = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      nosR.setAttribute('cx', '3');
      nosR.setAttribute('cy', '-10');
      nosR.setAttribute('r', '1');
      nosR.setAttribute('fill', pal.border);
      headGroup.appendChild(nosR);

      // Matte Hand-Drawn Eyes (Cream sclera + Dark pupil)
      const eyeL = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      eyeL.setAttribute('cx', '-7');
      eyeL.setAttribute('cy', '-2');
      eyeL.setAttribute('r', '5');
      eyeL.setAttribute('fill', '#faf5ea');
      eyeL.setAttribute('stroke', pal.border);
      eyeL.setAttribute('stroke-width', '1.8');
      headGroup.appendChild(eyeL);

      const eyeR = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      eyeR.setAttribute('cx', '7');
      eyeR.setAttribute('cy', '-2');
      eyeR.setAttribute('r', '5');
      eyeR.setAttribute('fill', '#faf5ea');
      eyeR.setAttribute('stroke', pal.border);
      eyeR.setAttribute('stroke-width', '1.8');
      headGroup.appendChild(eyeR);

      // Pupils with simple clean glint dot
      const pupilL = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupilL.setAttribute('cx', '-6.5');
      pupilL.setAttribute('cy', '-2.5');
      pupilL.setAttribute('r', '2.6');
      pupilL.setAttribute('fill', pal.eyePupil);
      headGroup.appendChild(pupilL);

      const pupilR = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupilR.setAttribute('cx', '7.5');
      pupilR.setAttribute('cy', '-2.5');
      pupilR.setAttribute('r', '2.6');
      pupilR.setAttribute('fill', pal.eyePupil);
      headGroup.appendChild(pupilR);

      const dotL = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotL.setAttribute('cx', '-7.5');
      dotL.setAttribute('cy', '-3.5');
      dotL.setAttribute('r', '0.9');
      dotL.setAttribute('fill', '#ffffff');
      headGroup.appendChild(dotL);

      const dotR = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotR.setAttribute('cx', '6.5');
      dotR.setAttribute('cy', '-3.5');
      dotR.setAttribute('r', '0.9');
      dotR.setAttribute('fill', '#ffffff');
      headGroup.appendChild(dotR);

      group.appendChild(headGroup);
      svg.appendChild(group);
    });
  }

  updateTokens(p1Pos, p2Pos) {
    this.tokenPositions[1] = p1Pos;
    this.tokenPositions[2] = p2Pos;

    const coordsP1 = this.getSquareCoords(p1Pos);
    const coordsP2 = this.getSquareCoords(p2Pos);

    if (this.tokenP1) {
      if (p1Pos > 0) {
        this.tokenP1.style.display = 'flex';
        this.tokenP1.style.left = `${coordsP1.x / 10}%`;
        this.tokenP1.style.top = `${coordsP1.y / 10}%`;
      } else {
        this.tokenP1.style.display = 'none';
      }
    }

    if (this.tokenP2) {
      if (p2Pos > 0) {
        this.tokenP2.style.display = 'flex';
        // Offset slightly if both are on the same square
        const offsetX = (p1Pos === p2Pos && p1Pos > 0) ? 1.8 : 0;
        const offsetY = (p1Pos === p2Pos && p1Pos > 0) ? 1.8 : 0;
        this.tokenP2.style.left = `${(coordsP2.x / 10) + offsetX}%`;
        this.tokenP2.style.top = `${(coordsP2.y / 10) + offsetY}%`;
      } else {
        this.tokenP2.style.display = 'none';
      }
    }
  }

  animateMove(player, fromPos, toPos, eventType = 'normal') {
    return new Promise(resolve => {
      const token = player === 1 ? this.tokenP1 : this.tokenP2;
      if (!token) return resolve();

      token.style.display = 'flex';
      const targetCoords = this.getSquareCoords(toPos);

      token.classList.remove('is-moving', 'is-climbing', 'is-sliding');

      if (eventType === 'ladder') {
        token.classList.add('is-climbing');
      } else if (eventType === 'snake') {
        token.classList.add('is-sliding');
      } else {
        token.classList.add('is-moving');
      }

      token.style.left = `${targetCoords.x / 10}%`;
      token.style.top = `${targetCoords.y / 10}%`;

      const duration = eventType === 'normal' ? 350 : 850;
      setTimeout(() => {
        token.classList.remove('is-moving', 'is-climbing', 'is-sliding');
        resolve();
      }, duration);
    });
  }

  async animateStepByStep(player, fromPos, toPos, stepDelay = 110) {
    if (fromPos === toPos) return;
    const direction = toPos > fromPos ? 1 : -1;
    let curr = fromPos;
    while (curr !== toPos) {
      curr += direction;
      this.highlightSquare(curr);
      await this.animateMove(player, curr - direction, curr, 'normal');
      if (stepDelay > 0) {
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }
  }

  async animateClimb(player, fromPos, toPos) {
    this.highlightSquare(toPos);
    await this.animateMove(player, fromPos, toPos, 'ladder');
  }

  async animateSlide(player, fromPos, toPos) {
    this.highlightSquare(toPos);
    await this.animateMove(player, fromPos, toPos, 'snake');
  }

  highlightSquare(squareNum) {
    if (!this.container) return;
    const tile = this.container.querySelector(`[data-square="${squareNum}"]`);
    if (tile) {
      tile.classList.add('tile-highlight');
      setTimeout(() => tile.classList.remove('tile-highlight'), 500);
    }
  }
}
