const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function setCustomDragImage(e, val) {
  try {
    if (!e || !e.dataTransfer || typeof e.dataTransfer.setDragImage !== 'function') return;

    const ghost = document.getElementById('drag-ghost');
    if (!ghost) return;

    ghost.textContent = String(val);

    ghost.style.left = '-9999px';
    ghost.style.top = '-9999px';
    ghost.style.display = 'flex';

    const w = ghost.offsetWidth || 40;
    const h = ghost.offsetHeight || 40;

    e.dataTransfer.setDragImage(ghost, Math.floor(w / 2), Math.floor(h / 2));
  } catch (err) {
  }
}

function baseGrid() {
  const g = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      g[r][c] = ((r % 3) * 3 + Math.floor(r / 3) + c) % 9 + 1;
    }
  }
  return g;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function permuteRows(g) {
  const bands = [0, 1, 2];
  shuffle(bands);
  const out = [];
  for (const b of bands) {
    const rows = [b * 3, b * 3 + 1, b * 3 + 2];
    shuffle(rows);
    out.push(...rows);
  }
  return out.map((r) => g[r].slice());
}

function permuteCols(g) {
  const stacks = [0, 1, 2];
  shuffle(stacks);
  const idx = [];
  for (const s of stacks) {
    const cols = [s * 3, s * 3 + 1, s * 3 + 2];
    shuffle(cols);
    idx.push(...cols);
  }
  return g.map((row) => idx.map((i) => row[i]));
}

function permuteDigits(g) {
  const map = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return g.map((row) => row.map((v) => map[v - 1]));
}

function transpose(g) {
  const t = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      t[c][r] = g[r][c];
    }
  }
  return t;
}

function randomSolution() {
  let g = baseGrid();
  if (Math.random() < 0.5) g = transpose(g);
  g = permuteRows(g);
  g = permuteCols(g);
  g = permuteDigits(g);
  if (Math.random() < 0.5) g = transpose(g);
  return g;
}

function candidates(grid, r, c) {
  if (grid[r][c] !== 0) return [];
  const used = new Set();

  for (let x = 0; x < 9; x++) {
    used.add(grid[r][x]);
    used.add(grid[x][c]);
  }

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let y = br; y < br + 3; y++) {
    for (let x = bc; x < bc + 3; x++) {
      used.add(grid[y][x]);
    }
  }

  const out = [];
  for (let v = 1; v <= 9; v++) {
    if (!used.has(v)) out.push(v);
  }
  return out;
}

function countSolutions(grid, limit = 2) {
  let rSel = -1;
  let cSel = -1;
  let cands = null;
  let best = 10;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const cs = candidates(grid, r, c);
        if (cs.length === 0) return 0;
        if (cs.length < best) {
          best = cs.length;
          rSel = r;
          cSel = c;
          cands = cs;
          if (best === 1) break;
        }
      }
    }
    if (best === 1) break;
  }

  if (rSel === -1) return 1; // solved

  let count = 0;
  for (const v of cands) {
    grid[rSel][cSel] = v;
    count += countSolutions(grid, limit - count);
    if (count >= limit) {
      grid[rSel][cSel] = 0;
      return count;
    }
  }
  grid[rSel][cSel] = 0;
  return count;
}

function generatePuzzle(difficulty) {
  const ranges = { easy: [41, 48], medium: [33, 40], hard: [25, 31], expert: [20, 23] };
  const [minClues, maxClues] = ranges[difficulty] || ranges.medium;

  let best = null;

  for (let attempt = 0; attempt < 30; attempt++) {
    const sol = randomSolution();
    const puz = sol.map((r) => r.slice());
    let clues = 81;

    const tryRemove = (cells) => {
      const saved = cells.map(([r, c]) => puz[r][c]);
      cells.forEach(([r, c]) => (puz[r][c] = 0));

      const test = puz.map((row) => row.slice());
      const ok = countSolutions(test, 2) === 1;

      if (!ok) {
        cells.forEach(([r, c], i) => (puz[r][c] = saved[i]));
      } else {
        clues -= cells.length;
      }
      return ok;
    };

    const target = Math.floor(Math.random() * (maxClues - minClues + 1)) + minClues;

    let order = shuffle([...Array(81).keys()]);
    let progress = true;

    while (progress && clues > target) {
      progress = false;

      for (const i of order) {
        if (clues <= target) break;

        const j = 80 - i;
        const r1 = Math.floor(i / 9);
        const c1 = i % 9;
        const r2 = Math.floor(j / 9);
        const c2 = j % 9;

        if (puz[r1][c1] === 0) continue;

        if (i === j) {
          if (clues - 1 >= minClues && tryRemove([[r1, c1]])) progress = true;
        } else if (puz[r2][c2] !== 0) {
          if (clues - 2 >= minClues && tryRemove([[r1, c1], [r2, c2]])) progress = true;
        }
      }

      order = shuffle(order);
    }

    let singles = shuffle([...Array(81).keys()]);
    let changed = true;

    while (changed && clues > maxClues) {
      changed = false;

      for (const i of singles) {
        if (clues <= maxClues) break;

        const r = Math.floor(i / 9);
        const c = i % 9;
        if (puz[r][c] === 0) continue;

        if (clues - 1 >= minClues && tryRemove([[r, c]])) changed = true;
      }

      singles = shuffle(singles);
    }

    if (clues >= minClues && clues <= maxClues) {
      return { puzzle: puz, solution: sol, clues };
    }

    if (clues >= minClues && (!best || clues < best.clues)) {
      best = { puzzle: puz.map((r) => r.slice()), solution: sol, clues };
    }
  }

  if (best) return best;

  const sol = randomSolution();
  return { puzzle: sol.map((r) => r.slice()), solution: sol, clues: 81 };
}

let solution, puzzle, boardState, givenMask, startState;
let difficulty = 'medium';
let draggingFromCell = null;
let notesMode = false;
let notesState = Array.from({ length: 9 }, () =>
  Array.from({ length: 9 }, () => new Set())
);

// Timer
let elapsed = 0;
let timerId = null;
let paused = false;

function startTimer() {
  stopTimer();
  paused = false;
  elapsed = 0;
  updateTimerUI();
  timerId = setInterval(() => {
    if (!paused) {
      elapsed++;
      updateTimerUI();
    }
  }, 1000);
  $('#pauseBtn').textContent = '⏸ Pause';
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function togglePause() {
  paused = !paused;
  $('#pauseBtn').textContent = paused ? '▶ Resume' : '⏸ Pause';
}

function updateTimerUI() {
  const t = $('#timer');
  if (t) t.textContent = fmtTime(elapsed);
}

function ensureCellStructure(cell) {
  let value = cell.querySelector('.value');
  let notes = cell.querySelector('.notes');

  if (!value) {
    value = document.createElement('span');
    value.className = 'value';
    cell.appendChild(value);
  }

  if (!notes) {
    notes = document.createElement('div');
    notes.className = 'notes';
    for (let i = 1; i <= 9; i++) {
      const s = document.createElement('span');
      s.className = 'n' + i;
      s.textContent = i;
      s.style.visibility = 'hidden';
      notes.appendChild(s);
    }
    cell.appendChild(notes);
  }

  return { value, notes };
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  boardEl.innerHTML = '';

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (c % 3 === 0) cell.classList.add('box-l');
      if (r % 3 === 0) cell.classList.add('box-t');
      if (c % 3 === 2) cell.classList.add('box-r');
      if (r % 3 === 2) cell.classList.add('box-b');

      ensureCellStructure(cell);
      updateCellView(r, c, cell);

      cell.addEventListener('dragover', (e) => {
        if (!givenMask[r][c]) e.preventDefault();
      });

      cell.addEventListener('drop', (e) => onDrop(e, cell));
      cell.addEventListener('mouseenter', () => highlightRelated(r, c, true));
      cell.addEventListener('mouseleave', () => highlightRelated(r, c, false));

      cell.addEventListener('dblclick', () => {
        if (givenMask[r][c]) return;

        if (boardState[r][c] !== 0) {
          setCell(r, c, 0, false);
          updateStatus('Cell cleared.');
        } else {
          notesState[r][c].clear();
          renderNotes(r, c, cell);
          updateStatus('Notes cleared.');
        }
      });

      boardEl.appendChild(cell);
    }
  }
}

function updateCellView(r, c, cellEl) {
  const boardEl = document.getElementById('board');
  const cell = cellEl || boardEl.children[r * 9 + c];

  const { value } = ensureCellStructure(cell);
  const val = boardState[r][c];

  cell.classList.toggle('has-value', !!val);
  value.textContent = val ? String(val) : '';
  cell.classList.toggle('user', !!val && !givenMask[r][c]);

  if (val && !givenMask[r][c]) {
    cell.setAttribute('draggable', 'true');
    cell.addEventListener('dragstart', onCellDragStart);
  } else {
    cell.removeAttribute('draggable');
  }

  renderNotes(r, c, cell);
}

function renderNotes(r, c, cellEl) {
  const boardEl = document.getElementById('board');
  const cell = cellEl || boardEl.children[r * 9 + c];
  const notes = cell.querySelector('.notes');

  if (boardState[r][c] !== 0) {
    notes.style.display = 'none';
    return;
  }

  notes.style.display = 'grid';
  for (let i = 1; i <= 9; i++) {
    const span = notes.children[i - 1];
    span.style.visibility = notesState[r][c].has(i) ? 'visible' : 'hidden';
  }
}

function highlightRelated(r, c, on) {
  const boardEl = document.getElementById('board');

  $$('.cell', boardEl).forEach((el) => {
    const rr = +el.dataset.row;
    const cc = +el.dataset.col;
    const sameBox =
      Math.floor(rr / 3) === Math.floor(r / 3) &&
      Math.floor(cc / 3) === Math.floor(c / 3);

    if (rr === r || cc === c || sameBox) {
      el.classList.toggle('highlight', on);
    }
  });
}

function onCellDragStart(e) {
  const r = +this.dataset.row;
  const c = +this.dataset.col;
  const val = boardState[r][c];

  e.dataTransfer.setData('text/plain', String(val));
  e.dataTransfer.effectAllowed = notesMode ? 'copy' : 'move';
  setCustomDragImage(e, val);
  draggingFromCell = this;
}

function createDigits() {
  const digitsEl = document.getElementById('digits');
  if (!digitsEl) return;

  digitsEl.innerHTML = '';

  for (let i = 1; i <= 9; i++) {
    const d = document.createElement('div');
    d.className = 'digit';
    d.textContent = i;
    d.dataset.value = i;
    d.setAttribute('draggable', 'true');

    d.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'copy';
      setCustomDragImage(e, i);
      draggingFromCell = null;
    });

    digitsEl.appendChild(d);
  }
}

function onDrop(e, cell) {
  e.preventDefault();

  const r = +cell.dataset.row;
  const c = +cell.dataset.col;

  if (givenMask[r][c]) return;

  const val = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (!val || val < 1 || val > 9) return;

  if (notesMode) {
    if (boardState[r][c] !== 0) {
      flashInvalid(cell);
      return;
    }

    const set = notesState[r][c];
    if (set.has(val)) set.delete(val);
    else set.add(val);

    renderNotes(r, c, cell);
    updateStatus('Note ' + val + (notesState[r][c].has(val) ? ' added.' : ' removed.'));
    return;
  }

  if (isConflict(boardState, r, c, val)) {
    flashInvalid(cell);
    updateStatus('That move conflicts with existing numbers.');
    return;
  }

  const fromCell = draggingFromCell;

  setCell(r, c, val, true);
  notesState[r][c].clear();
  renderNotes(r, c, cell);
  removeNoteFromPeers(r, c, val);

  if (fromCell && fromCell !== cell) {
    const rr = +fromCell.dataset.row;
    const cc = +fromCell.dataset.col;
    if (!givenMask[rr][cc]) setCell(rr, cc, 0, false);
  }

  if (!timerId) startTimer();

  if (isSolved()) {
    updateStatus('✔ Puzzle solved! Great job.', true);
    stopTimer();
  } else {
    updateStatus('Move accepted.');
  }
}

function removeNoteFromPeers(r, c, val) {
  for (let x = 0; x < 9; x++) {
    if (x !== c) {
      if (notesState[r][x].delete(val)) renderNotes(r, x);
    }
  }

  for (let y = 0; y < 9; y++) {
    if (y !== r) {
      if (notesState[y][c].delete(val)) renderNotes(y, c);
    }
  }

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;

  for (let y = br; y < br + 3; y++) {
    for (let x = bc; x < bc + 3; x++) {
      if (y === r && x === c) continue;
      if (notesState[y][x].delete(val)) renderNotes(y, x);
    }
  }
}

function setCell(r, c, val, user) {
  const boardEl = document.getElementById('board');
  boardState[r][c] = val;

  const cell = boardEl.children[r * 9 + c];
  cell.classList.toggle('user', !!val && !givenMask[r][c]);
  cell.classList.toggle('has-value', !!val);
  cell.querySelector('.value').textContent = val ? String(val) : '';

  if (val && !givenMask[r][c]) {
    cell.setAttribute('draggable', 'true');
    cell.addEventListener('dragstart', onCellDragStart);
  } else {
    cell.removeAttribute('draggable');
  }
}

function flashInvalid(cell) {
  cell.classList.remove('invalid');
  void cell.offsetWidth; // reflow
  cell.classList.add('invalid');
}

function updateStatus(text, ok = false) {
  const el = document.getElementById('status');
  if (el) {
    el.innerHTML = text;
    el.classList.toggle('ok', ok);
  }
}

function isConflict(grid, r, c, val) {
  for (let x = 0; x < 9; x++) {
    if (x !== c && grid[r][x] === val) return true;
  }
  for (let y = 0; y < 9; y++) {
    if (y !== r && grid[y][c] === val) return true;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let y = br; y < br + 3; y++) {
    for (let x = bc; x < bc + 3; x++) {
      if ((y !== r || x !== c) && grid[y][x] === val) return true;
    }
  }
  return false;
}

function isConflictEx(grid, r, c, val, exclusions = []) {
  const skip = (rr, cc) => exclusions.some(([er, ec]) => er === rr && ec === cc);

  for (let x = 0; x < 9; x++) {
    if (x !== c && !skip(r, x) && grid[r][x] === val) return true;
  }
  for (let y = 0; y < 9; y++) {
    if (y !== r && !skip(y, c) && grid[y][c] === val) return true;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let y = br; y < br + 3; y++) {
    for (let x = bc; x < bc + 3; x++) {
      if ((y !== r || x !== c) && !skip(y, x) && grid[y][x] === val) return true;
    }
  }
  return false;
}


function isSolved() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (boardState[r][c] === 0) return false;
    }
  }

  const setEq9 = (a) => a.slice().sort().join(',') === '1,2,3,4,5,6,7,8,9';

  for (let r = 0; r < 9; r++) {
    if (!setEq9(boardState[r])) return false;
  }
  for (let c = 0; c < 9; c++) {
    const col = [];
    for (let r = 0; r < 9; r++) col.push(boardState[r][c]);
    if (!setEq9(col)) return false;
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box = [];
      for (let y = br; y < br + 3; y++) {
        for (let x = bc; x < bc + 3; x++) {
          box.push(boardState[y][x]);
        }
      }
      if (!setEq9(box)) return false;
    }
  }
  return true;
}


function onDrop(e, cell) {
  e.preventDefault();

  const r = +cell.dataset.row;
  const c = +cell.dataset.col;

  if (givenMask[r][c]) return;

  const val = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (!val || val < 1 || val > 9) return;

  if (notesMode) {
    if (boardState[r][c] !== 0) { flashInvalid(cell); return; }
    const set = notesState[r][c];
    if (set.has(val)) set.delete(val); else set.add(val);
    renderNotes(r, c, cell);
    updateStatus('Note ' + val + (notesState[r][c].has(val) ? ' added.' : ' removed.'));
    return;
  }

  const fromCell = draggingFromCell;

  if (
    fromCell &&
    fromCell !== cell &&
    boardState[r][c] !== 0 &&
    !givenMask[r][c]
  ) {
    const rr = +fromCell.dataset.row;
    const cc = +fromCell.dataset.col;

    if (!givenMask[rr][cc] && boardState[rr][cc] !== 0) {
      const vSrc = boardState[rr][cc];
      const vDst = boardState[r][c];

      if (vSrc === vDst) { updateStatus('Numbers are the same — no swap needed.'); return; }

      const excl = [[rr, cc], [r, c]];
      const conflictA = isConflictEx(boardState, r,  c, vSrc, excl);
      const conflictB = isConflictEx(boardState, rr, cc, vDst, excl);
      if (conflictA || conflictB) { flashInvalid(cell); updateStatus('Swap would create a conflict.'); return; }

      // swap
      setCell(r,  c, vSrc, true);
      setCell(rr, cc, vDst, true);

      notesState[r][c].clear(); renderNotes(r, c, cell); removeNoteFromPeers(r, c, vSrc);
      const srcEl = document.getElementById('board').children[rr * 9 + cc];
      notesState[rr][cc].clear(); renderNotes(rr, cc, srcEl); removeNoteFromPeers(rr, cc, vDst);

      if (!timerId) startTimer();
      if (isSolved()) { updateStatus('✔ Puzzle solved! Great job.', true); stopTimer(); }
      else { updateStatus('Swap completed.'); }
      return;
    }
  }

  if (fromCell && fromCell !== cell) {
    const rr = +fromCell.dataset.row;
    const cc = +fromCell.dataset.col;
    if (isConflictEx(boardState, r, c, val, [[rr, cc]])) {
      flashInvalid(cell);
      updateStatus('That move conflicts with existing numbers.');
      return;
    }
  } else {
    if (isConflict(boardState, r, c, val)) {
      flashInvalid(cell);
      updateStatus('That move conflicts with existing numbers.');
      return;
    }
  }

  setCell(r, c, val, true);
  notesState[r][c].clear();
  renderNotes(r, c, cell);
  removeNoteFromPeers(r, c, val);

  if (fromCell && fromCell !== cell) {
    const rr = +fromCell.dataset.row;
    const cc = +fromCell.dataset.col;
    if (!givenMask[rr][cc]) setCell(rr, cc, 0, false);
  }

  if (!timerId) startTimer();
  if (isSolved()) { updateStatus('✔ Puzzle solved! Great job.', true); stopTimer(); }
  else { updateStatus('Move accepted.'); }
}



function newGame() {
  difficulty = $('#difficulty').value || 'medium';
  const gen = generatePuzzle(difficulty);

  solution = gen.solution;
  puzzle = gen.puzzle;

  boardState = puzzle.map((r) => r.slice());
  givenMask = puzzle.map((row) => row.map((v) => v !== 0));
  startState = boardState.map((r) => r.slice());
  notesState = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );

  renderBoard();
  updateStatus('New puzzle generated (' + difficulty + ` – ${gen.clues} clues).`);
  startTimer();
}

function restart() {
  boardState = startState.map((r) => r.slice());
  givenMask = puzzle.map((row) => row.map((v) => v !== 0));
  notesState = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );

  renderBoard();
  updateStatus('Board reset to start state.');
  startTimer();
}

function toggleNotes() {
  notesMode = !notesMode;
  const btn = $('#notesBtn');
  if (btn) {
    btn.classList.toggle('active', notesMode);
    btn.textContent = 'Notes: ' + (notesMode ? 'On' : 'Off');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const gen = generatePuzzle('medium');
    solution = gen.solution;
    puzzle = gen.puzzle;
    boardState = puzzle.map((r) => r.slice());
    givenMask = puzzle.map((row) => row.map((v) => v !== 0));
    startState = boardState.map((r) => r.slice());
  } catch (err) {
    console.error('Generator error', err);
    const sol = randomSolution();
    solution = sol;
    puzzle = sol.map((r) => r.slice());
    boardState = puzzle.map((r) => r.slice());
    givenMask = puzzle.map((row) => row.map((v) => v !== 0));
    startState = boardState.map((r) => r.slice());
  }

  createDigits();
  renderBoard();
  updateTimerUI();

  const $id = (id) => document.getElementById(id);
  $id('newBtn').addEventListener('click', newGame);
  $id('restartBtn').addEventListener('click', restart);
  $id('notesBtn').addEventListener('click', toggleNotes);
  $id('pauseBtn').addEventListener('click', () => togglePause());
});
