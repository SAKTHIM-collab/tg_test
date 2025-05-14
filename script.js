const board = document.getElementById("board");
const redScoreEl = document.getElementById("redScore");
const blueScoreEl = document.getElementById("blueScore");
const redTitansEl = document.getElementById("redTitans");
const blueTitansEl = document.getElementById("blueTitans");
const turnTimerEl = document.getElementById("turnTimer");
const gameTimerEl = document.getElementById("gameTimer");
const currentPlayerEl = document.getElementById("currentPlayer");
const phaseIndicator = document.getElementById("phaseIndicator");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const resetBtn = document.getElementById("resetBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const soundBtn = document.getElementById("soundBtn");
const powerupBtn = document.getElementById("powerupBtn");
const replayBtn = document.getElementById("replayBtn");
const analysisBtn = document.getElementById("analysisBtn");
const normalModeBtn = document.getElementById("normalMode");
const hackerModeBtn = document.getElementById("hackerMode");
const hackerPlusModeBtn = document.getElementById("hackerPlusMode");
const historyList = document.getElementById("history-list");
const moveHistorySection = document.getElementById("move-history");
const placeSound = document.getElementById("placeSound");
const moveSound = document.getElementById("moveSound");
const captureSound = document.getElementById("captureSound");

let nodes = [];
let edges = [];
let currentPlayer = "red";
let redScore = 0, blueScore = 0;
let redTitans = 0, blueTitans = 0;
let redAvailable = 4, blueAvailable = 4; 
const maxTitansPerPlayer = 4;
let placementPhase = true;
let unlockedCircuit = 0; 
let turnTimer, gameTimer;
let turnTimeLeft = 30, gameTimeLeft = 300;
let gamePaused = false;
let soundEnabled = true;
let gameMode = "normal";
let moveHistory = [];
let historyPointer = -1;
let selectedNode = null;
let availableMoves = [];
let leaderboard = JSON.parse(localStorage.getItem('titanLeaderboard')) || [];


const connections = [
  [0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 3], [5, 0, 1],
  [6, 7, 5], [7, 8, 8], [8, 9, 4], [9, 10, 1], [10, 11, 5], [11, 6, 1],
  [12, 13, 8], [13, 14, 9], [14, 15, 1], [15, 16, 5], [16, 17, 1], [17, 12, 6],
  [6, 12, 1], [1, 7, 1], [8, 14, 1], [3, 9, 1], [10, 16, 1], [5, 11, 1]
];

const popupOverlay = document.createElement('div');
popupOverlay.id = 'popupOverlay';
const popupContent = document.createElement('div');
popupContent.id = 'popupContent';
popupOverlay.appendChild(popupContent);
document.body.appendChild(popupOverlay);

function showPopup(message, duration = 1500) {
  popupContent.textContent = message;
  popupOverlay.classList.add('show');
  setTimeout(() => {
    popupOverlay.classList.remove('show');
  }, duration);
}

function initGame() {
  createBoard();
  startTimers();
  updateUI();
  setupEventListeners();
  setGameMode('normal');
  setupHackerMode(); // Add this line
  updateLeaderboardDisplay();

}

function createBoard() {
  board.innerHTML = "";
  nodes = [];
  availableMoves = [];

  const rect = board.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const radii = [
    Math.min(centerX, centerY) * 0.9,
    Math.min(centerX, centerY) * 0.6,
    Math.min(centerX, centerY) * 0.3
  ];

  const positions = generateHexPositions(centerX, centerY, radii);

  positions.forEach((pos, idx) => {
    const node = document.createElement("div");
    node.classList.add("node");
    node.dataset.index = idx;
    node.dataset.circuit = Math.floor(idx / 6);
    node.style.left = `${pos[0]}px`;
    node.style.top = `${pos[1]}px`;

    node.addEventListener("mouseenter", () => handleNodeHover(idx));
    node.addEventListener("mouseleave", () => handleNodeHoverEnd(idx));
    node.addEventListener("click", () => handleNodeClick(idx));

    board.appendChild(node);
    nodes.push(node);
  });

  renderEdges();
}

function generateHexPositions(centerX, centerY, radii, sides = 6) {
  const positions = [];
  const angleOffset = -Math.PI / 3;

  radii.forEach(radius => {
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides + angleOffset;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.push([x, y]);
    }
  });
  return positions;
}

function renderEdges() {
  edges = [];
  connections.forEach(([from, to, weight]) => {
    const nodeA = nodes[from];
    const nodeB = nodes[to];
    const edge = document.createElement("div");
    edge.className = "edge";

    const x1 = parseFloat(nodeA.style.left);
    const y1 = parseFloat(nodeA.style.top);
    const x2 = parseFloat(nodeB.style.left);
    const y2 = parseFloat(nodeB.style.top);

    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

    edge.style.width = `${length}px`;
    edge.style.left = `${x1}px`;
    edge.style.top = `${y1}px`;
    edge.style.transform = `rotate(${angle}deg)`;
    board.appendChild(edge);

    const label = document.createElement("div");
    label.className = "edge-label";
    label.innerText = weight;
    label.style.left = `${(x1 + x2) / 2}px`;
    label.style.top = `${(y1 + y2) / 2}px`;
    board.appendChild(label);

    edges.push({ from, to, weight, controlledBy: null, element: edge });
  });
}

function handleNodeHover(index) {
  if (gamePaused) return;

  const node = nodes[index];

  if (placementPhase) {
    if (!node.classList.contains("red") && !node.classList.contains("blue")) {
      if (parseInt(node.dataset.circuit) === unlockedCircuit) {
        node.style.transform = "translate(-50%, -50%) scale(1.1)";
        node.style.boxShadow = `0 0 15px ${currentPlayer === "red" ? "rgba(231, 76, 60, 0.7)" : "rgba(52, 152, 219, 0.7)"}`;
      }
    }
  } else {
    // Movement phase hover effects
    if (selectedNode !== null) {
      if (availableMoves.includes(index)) {
        node.style.transform = "translate(-50%, -50%) scale(1.2)";
        node.style.boxShadow = `0 0 20px ${currentPlayer === "red" ? "rgba(231, 76, 60, 0.9)" : "rgba(52, 152, 219, 0.9)"}`;
      }
    } else if ((currentPlayer === "red" && node.classList.contains("red")) ||
               (currentPlayer === "blue" && node.classList.contains("blue"))) {
      node.style.transform = "translate(-50%, -50%) scale(1.1)";
      node.style.boxShadow = `0 0 15px ${currentPlayer === "red" ? "rgba(231, 76, 60, 0.7)" : "rgba(52, 152, 219, 0.7)"}`;
    }
  }
}

function handleNodeHoverEnd(index) {
  const node = nodes[index];
  if (!node.classList.contains("red") && !node.classList.contains("blue") && !node.classList.contains("available-move")) {
    node.style.transform = "translate(-50%, -50%)";
    node.style.boxShadow = "none";
  } else if (node.classList.contains("available-move")) {
    node.style.transform = "translate(-50%, -50%) scale(1.1)";
    node.style.boxShadow = `0 0 15px rgba(46, 204, 113, 0.7)`;
  } else if ((currentPlayer === "red" && node.classList.contains("red")) ||
             (currentPlayer === "blue" && node.classList.contains("blue"))) {
    node.style.transform = "translate(-50%, -50%)";
    if (selectedNode === index) {
      node.style.boxShadow = `0 0 20px ${currentPlayer === "red" ? "#e74c3c" : "#3498db"}`;
    } else {
      node.style.boxShadow = "none";
    }
  }
}

function handleNodeClick(index) {
  if (gamePaused) return;

  if (placementPhase) {
    handlePlacementPhaseClick(index);
  } else {
    handleMovementPhaseClick(index);
  }
  updateUI();
}

function handlePlacementPhaseClick(index) {
  const node = nodes[index];
  const circuit = parseInt(node.dataset.circuit);

  if (circuit !== unlockedCircuit) return;

  if (node.classList.contains("red") || node.classList.contains("blue")) {
    if (gameMode !== "normal" &&
        ((currentPlayer === "red" && node.classList.contains("red")) ||
        (currentPlayer === "blue" && node.classList.contains("blue")))) {
      handleMovementSelection(index);
    }
    return;
  }

  const canPlace = (currentPlayer === "red" && redAvailable > 0) || (currentPlayer === "blue" && blueAvailable > 0);
  if (!canPlace) {
    if (currentPlayer === "red" && blueAvailable > 0) {
      currentPlayer = "blue";
      updateUI();
    } else if (currentPlayer === "blue" && redAvailable > 0) {
      currentPlayer = "red";
      updateUI();
    }
    return; 
  }

  if (gameMode !== "normal") saveGameState();
  placeTitan(node, index);


  const allInitialTitansPlaced = (redAvailable === 0 && blueAvailable === 0);
  if (!allInitialTitansPlaced) {
    if (isCircuitFull(unlockedCircuit)) {
      if (unlockedCircuit < 2) {
        unlockedCircuit++;
        addToHistory(`Circuit ${unlockedCircuit + 1} unlocked`);
        showPopup(`Circuit ${unlockedCircuit + 1} unlocked`);
        updateUI();
      }
    }
  } else {
    
    endPlacementPhase();
  }
}


function handleMovementPhaseClick(index) {
  const node = nodes[index];

  if (node.classList.contains("locked")) return;

  if (selectedNode === null) {
    if ((currentPlayer === "red" && node.classList.contains("red")) ||
        (currentPlayer === "blue" && node.classList.contains("blue"))) {
      selectNodeForMovement(index);
    }
    return;
  }

  if (selectedNode === index) {
    clearAvailableMoves();
    selectedNode = null;
    return;
  }

  if (availableMoves.includes(index)) {
    moveTitan(selectedNode, index);
    selectedNode = null;
    clearAvailableMoves();


    if (isCircuitFull(1) && unlockedCircuit === 1) {
      unlockedCircuit = 2;
      showPopup("Inner Circuit Unlocked!", 1500);
      addToHistory("Inner circuit unlocked in movement phase");
      updateUI();
    }
    return;
  }

  if ((currentPlayer === "red" && node.classList.contains("red")) ||
      (currentPlayer === "blue" && node.classList.contains("blue"))) {
    clearAvailableMoves();
    selectNodeForMovement(index);
  }
}

function selectNodeForMovement(index) {
  selectedNode = index;
  nodes[index].classList.add("selected");


  availableMoves = getAvailableMoves(index);
  availableMoves.forEach(moveIndex => {
    nodes[moveIndex].classList.add("available-move");
  });

  if (gameMode !== "normal") {
    addToHistory(`${currentPlayer} selected titan at position ${index} for movement`);
  }
}

function getAvailableMoves(fromIndex) {
  const moves = [];
  edges.forEach(edge => {
    if (edge.from === fromIndex && !nodes[edge.to].classList.contains("red") &&
        !nodes[edge.to].classList.contains("blue") &&
        parseInt(nodes[edge.to].dataset.circuit) <= unlockedCircuit) {
      moves.push(edge.to);
    }
    if (edge.to === fromIndex && !nodes[edge.from].classList.contains("red") &&
        !nodes[edge.from].classList.contains("blue") &&
        parseInt(nodes[edge.from].dataset.circuit) <= unlockedCircuit) {
      moves.push(edge.from);
    }
  });
  return moves;
}

function clearAvailableMoves() {
  availableMoves.forEach(index => {
    nodes[index].classList.remove("available-move");
    nodes[index].style.transform = "translate(-50%, -50%)";
    nodes[index].style.boxShadow = "none";
  });
  if (selectedNode !== null) {
    nodes[selectedNode].classList.remove("selected");
  }
  availableMoves = [];
}

function isValidMove(fromIndex, toIndex) {
  if (nodes[toIndex].classList.contains("red") || nodes[toIndex].classList.contains("blue")) return false;
  return edges.some(edge => (edge.from === fromIndex && edge.to === toIndex) || (edge.to === fromIndex && edge.from === toIndex));
}

function setupHackerMode() {
  // Add undo/redo functionality
  document.addEventListener('keydown', (e) => {
    if (gameMode === "normal") return;
    if (e.ctrlKey && e.key === 'z') undoMove();
    if (e.ctrlKey && e.key === 'y') redoMove();
  });


  soundBtn.innerHTML = `<i class="fas fa-volume-up"></i> Sound: ON`;
  soundEnabled = true;
}

function placeTitan(node, index) {
  node.classList.add(currentPlayer);
  node.style.animation = "placeAnimation 0.3s forwards";
  setTimeout(() => { node.style.animation = ""; }, 300);

  if (soundEnabled) placeSound.play();

  if (currentPlayer === "red") {
    redTitans++;
    if (gameMode === "hacker" || gameMode === "hacker++") redAvailable--;
  } else {
    blueTitans++;
    if (gameMode === "hacker" || gameMode === "hacker++") blueAvailable--;
  }

  updateEdges();
  updateUI();

  let captureOccurred = false;
  if (gameMode === "hacker" || gameMode === "hacker++") {
    captureOccurred = checkForCaptures(index);
  }

  if (gameMode !== "normal") {
    addToHistory(`${currentPlayer} placed titan at position ${index}`);
  }


  if ((gameMode === "hacker" || gameMode === "hacker++") && isCircuitFull(2)) {
    endGame("Innermost circuit fully occupied!");
    return;
  }


  if ((currentPlayer === "red" && redAvailable > 0) || (currentPlayer === "blue" && blueAvailable > 0)) {
    switchPlayer();
  } else {

    if (currentPlayer === "red" && blueAvailable > 0) {
      currentPlayer = "blue";
      updateUI();
    } else if (currentPlayer === "blue" && redAvailable > 0) {
      currentPlayer = "red";
      updateUI();
    }
  }


  if ((gameMode === "normal" && redTitans === maxTitansPerPlayer && blueTitans === maxTitansPerPlayer) ||
      (gameMode === "hacker" || gameMode === "hacker++") && redAvailable === 0 && blueAvailable === 0) {
    endPlacementPhase();
  }
}


function checkForGameEndAfterCapture() {
  if (redTitans === 0) {
    endGame(`${bluePlayerName} eliminated all ${redPlayerName} titans!`);
    return true;
  } else if (blueTitans === 0) {
    endGame(`${redPlayerName} eliminated all ${bluePlayerName} titans!`);
    return true;
  }
  return false;
}

function moveTitan(fromIndex, toIndex) {
  if (!isValidMove(fromIndex, toIndex)) return;

  if (gameMode !== "normal") saveGameState();

  const sourceNode = nodes[fromIndex];
  const targetNode = nodes[toIndex];

  sourceNode.classList.remove(currentPlayer);
  targetNode.classList.add(currentPlayer);


  const x1 = parseFloat(sourceNode.style.left);
  const y1 = parseFloat(sourceNode.style.top);
  const x2 = parseFloat(targetNode.style.left);
  const y2 = parseFloat(targetNode.style.top);

  targetNode.style.setProperty("--from-x", `${x1 - x2}px`);
  targetNode.style.setProperty("--from-y", `${y1 - y2}px`);
  targetNode.style.animation = "moveAnimation 0.3s forwards";
  setTimeout(() => { targetNode.style.animation = ""; }, 300);

  if (soundEnabled) {
    moveSound.currentTime = 0;
    moveSound.play();
  }

  updateEdges();


  let gameEnded = false;
  if (gameMode === "hacker" || gameMode === "hacker++") {
    gameEnded = checkForCaptures(toIndex);
  }


  if ((gameMode === "hacker" || gameMode === "hacker++") && isCircuitFull(2)) {
    endGame("Innermost circuit fully occupied!");
    return;
  }

  if (!gameEnded) {
 
    if (isCircuitFull(1) && unlockedCircuit === 1) {
      unlockedCircuit = 2;
      showPopup("Inner Circuit Unlocked!", 1500);
      addToHistory("Inner circuit unlocked in movement phase");
      updateUI();
    }


    if (isCircuitFull(2)) {
      endGame("Inner circuit fully occupied!");
      return;
    }

    if (gameMode !== "normal") {
      addToHistory(`${currentPlayer === "red" ? redPlayerName : bluePlayerName} moved titan from ${fromIndex} to ${toIndex}`);
    }

    switchPlayer();
  }
} 


function isCircuitFull(circuit) {
  const circuitNodes = nodes.filter((_, idx) => Math.floor(idx / 6) === circuit);
  return circuitNodes.every(node => node.classList.contains("red") || node.classList.contains("blue"));
}

function endPlacementPhase() {
  placementPhase = false;
  phaseIndicator.textContent = "Phase: Movement";


  if (isCircuitFull(1)) {
    unlockedCircuit = 2;
    showPopup("All circuits unlocked! Movement phase begins", 2000);
    addToHistory("All circuits unlocked at start of movement phase");
  } else {
    showPopup("Movement Phase Begins", 2000);
    addToHistory("Movement phase begins");
  }


  turnTimeLeft = 30;
  updateUI();
}


function checkForCaptures(index) {
  if (gameMode !== "hacker" && gameMode !== "hacker++") return false;

  const node = nodes[index];
  const neighbors = getNeighbors(index);
  const opponent = currentPlayer === "red" ? "blue" : "red";
  let captureOccurred = false;


  if (neighbors.length > 0 && neighbors.every(nIdx => nodes[nIdx].classList.contains(opponent))) {
    if (node.classList.contains(currentPlayer)) {
      node.classList.remove(currentPlayer);
      if (currentPlayer === "red") {
        redTitans--;
        if (placementPhase) redAvailable = Math.max(0, redAvailable);
        addToHistory(`${bluePlayerName} captured ${redPlayerName}'s titan`);
      } else {
        blueTitans--;
        if (placementPhase) blueAvailable = Math.max(0, blueAvailable);
        addToHistory(`${redPlayerName} captured ${bluePlayerName}'s titan`);
      }

      if (soundEnabled) captureSound.play();
      captureOccurred = true;
      updateEdges();
      updateUI();


      if (checkForGameEndAfterCapture()) return true;
    }
  }


  neighbors.forEach(nIdx => {
    const neighbor = nodes[nIdx];
    if (neighbor.classList.contains(opponent)) {
      const neighborNeighbors = getNeighbors(nIdx);
      if (neighborNeighbors.every(nnIdx => nodes[nnIdx].classList.contains(currentPlayer))) {
        neighbor.classList.remove(opponent);
        if (opponent === "red") {
          redTitans--;
          if (placementPhase) redAvailable = Math.max(0, redAvailable);
          addToHistory(`${currentPlayer === "red" ? redPlayerName : bluePlayerName} captured ${redPlayerName}'s titan`);
        } else {
          blueTitans--;
          if (placementPhase) blueAvailable = Math.max(0, blueAvailable);
          addToHistory(`${currentPlayer === "red" ? redPlayerName : bluePlayerName} captured ${bluePlayerName}'s titan`);
        }

        if (soundEnabled) captureSound.play();
        captureOccurred = true;
        updateEdges();
        updateUI();

        if (checkForGameEndAfterCapture()) return true;
      }
    }
  });

  return captureOccurred;
}


function getNeighbors(index) {
  const neighbors = [];
  edges.forEach(edge => {
    if (edge.from === index) neighbors.push(edge.to);
    if (edge.to === index) neighbors.push(edge.from);
  });
  return neighbors;
}

function updateEdges() {
  edges.forEach(edge => {
    const nodeA = nodes[edge.from];
    const nodeB = nodes[edge.to];
    const aColor = nodeA.classList.contains("red") ? "red" : nodeA.classList.contains("blue") ? "blue" : null;
    const bColor = nodeB.classList.contains("red") ? "red" : nodeB.classList.contains("blue") ? "blue" : null;

    if (aColor && aColor === bColor) {
      if (edge.controlledBy !== aColor) {
        if (edge.controlledBy === "red") redScore -= edge.weight;
        if (edge.controlledBy === "blue") blueScore -= edge.weight;

        edge.controlledBy = aColor;

        if (aColor === "red") redScore += edge.weight;
        else blueScore += edge.weight;

        edge.element.className = `edge controlled-${aColor}`;
      }
    } else {
      if (edge.controlledBy) {
        if (edge.controlledBy === "red") redScore -= edge.weight;
        else blueScore -= edge.weight;
        edge.controlledBy = null;
        edge.element.className = "edge";
      }
    }
  });
}

function switchPlayer() {
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  turnTimeLeft = 30;
  updateUI();

  currentPlayerEl.classList.remove("red-turn", "blue-turn");
  void currentPlayerEl.offsetWidth; // Trigger reflow to restart animation
  currentPlayerEl.classList.add(`${currentPlayer}-turn`);

  checkGameEnd();
}

function checkGameEnd() {

  if (gameMode === "hacker" || gameMode === "hacker++") {
    if (isCircuitFull(2)) {
      endGame("Innermost circuit fully occupied!");
      return;
    }
  }

  else if (gameMode === "normal" && isCircuitFull(2)) {
    endGame("Inner circuit fully occupied!");
    return;
  }


  if (!placementPhase && (redTitans === 0 || blueTitans === 0)) {
    endGame("A player has no titans left!");
    return;
  }


  if (gameTimeLeft <= 0) {
    endGame("Time's up!");
    return;
  }
}


function endGame(message) {
  clearInterval(turnTimer);
  clearInterval(gameTimer);


  if (message.includes("circuit") || message.includes("Time's up")) {
    showWinnerPopup(message);
  }
}
function showWinnerPopup(message) {
  let winner;
  let winnerColor;
  
  if (redScore > blueScore) {
    winner = "Red Wins!";
    winnerColor = "red";
    updateLeaderboard(redScore, blueScore, "red");
  } else if (blueScore > redScore) {
    winner = "Blue Wins!";
    winnerColor = "blue";
    updateLeaderboard(redScore, blueScore, "blue");
  } else {
    winner = "It's a Tie!";
    winnerColor = "blue"; // Using blue style for tie
  }


  const popup = document.createElement('div');
  popup.className = `winner-popup ${winnerColor}`;
  popup.innerHTML = `
    <h2>${winner}</h2>
    <div class="winner-scores">
      <div class="score red-score">Red: ${redScore}</div>
      <div class="score blue-score">Blue: ${blueScore}</div>
    </div>
    <p>${message}</p>
    <button class="play-again-btn">Play Again</button>
  `;
  

  const playAgainBtn = popup.querySelector('.play-again-btn');
  playAgainBtn.addEventListener('click', () => {
    popup.remove();
    resetGame();
  });

  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('show'), 100);
}

function updateUI() {
  redScoreEl.textContent = redScore;
  blueScoreEl.textContent = blueScore;

  if (gameMode === "hacker" || gameMode === "hacker++") {
    document.getElementById('redTitans').textContent = redTitans;
    document.getElementById('blueTitans').textContent = blueTitans;
    document.getElementById('redAvailable').textContent = redAvailable;
    document.getElementById('blueAvailable').textContent = blueAvailable;
  } else {
    redTitansEl.textContent = `<span class="math-inline">\{redTitans\}/</span>{maxTitansPerPlayer}`;
    blueTitansEl.textContent = `<span class="math-inline">\{blueTitans\}/</span>{maxTitansPerPlayer}`;
  }

  currentPlayerEl.textContent = `${currentPlayer === "red" ? "Red" : "Blue"}'s Turn`;
  currentPlayerEl.className = `${currentPlayer}-turn`;
  turnTimerEl.textContent = turnTimeLeft;
  gameTimerEl.textContent = gameTimeLeft;
  phaseIndicator.textContent = placementPhase ? "Phase: Placement" : "Phase: Movement";
}

function startTimers() {
  clearInterval(turnTimer);
  clearInterval(gameTimer);

  turnTimer = setInterval(() => {
    if (!gamePaused) {
      turnTimeLeft--;
      if (turnTimeLeft <= 0) {
        if (gameMode !== "normal") addToHistory(`${currentPlayer} ran out of time`);
        switchPlayer();
      }
      updateUI();
    }
  }, 1000);

  gameTimer = setInterval(() => {
    if (!gamePaused) {
      gameTimeLeft--;
      if (gameTimeLeft <= 0) {
        endGame("Time's up! Game Over.");
      }
      updateUI();
    }
  }, 1000);
}

function pauseGame() {
  gamePaused = true;
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  board.style.opacity = "0.5";
  currentPlayerEl.textContent = "Game Paused";
  currentPlayerEl.classList.remove("red-turn", "blue-turn");
}

function resumeGame() {
  gamePaused = false;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  board.style.opacity = "1";
  updateUI();
}

function resetGame() {
  // Clear timers
  clearInterval(turnTimer);
  clearInterval(gameTimer);

  // Reset game state variables
  redScore = 0;
  blueScore = 0;
  redTitans = 0;
  blueTitans = 0;

  // Reset available titans only in Hacker mode
  if (gameMode === "hacker" || gameMode === "hacker++") {
    redAvailable = 4;
    blueAvailable = 4;
  }

  currentPlayer = "red";
  placementPhase = true;
  unlockedCircuit = 0;
  turnTimeLeft = 30;
  gameTimeLeft = 300;
  gamePaused = false;
  selectedNode = null;
  availableMoves = [];
  moveHistory = [];
  historyPointer = -1;

  // Reset UI elements
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  board.style.opacity = "1";
  board.classList.remove("movement-phase");
  historyList.innerHTML = "";

 
  board.innerHTML = "";
  nodes = [];
  edges = [];


  createBoard();


  startTimers();


  updateUI();


  clearAvailableMoves();


  if (gameMode === "hacker" || gameMode === "hacker++") {
    document.getElementById('redTitans').textContent = redTitans;
    document.getElementById('blueTitans').textContent = blueTitans;
    document.getElementById('redAvailable').textContent = redAvailable;
    document.getElementById('blueAvailable').textContent = blueAvailable;
  } else {
    redTitansEl.textContent = `<span class="math-inline">\{redTitans\}/</span>{maxTitansPerPlayer}`;
    blueTitansEl.textContent = `<span class="math-inline">\{blueTitans\}/</span>{maxTitansPerPlayer}`;
  }
}

function undoMove() {
  if (historyPointer < 0) return;
  const state = moveHistory[historyPointer];
  historyPointer--;
  restoreState(state);
  addToHistory(`Undo: ${state.lastAction}`, true);
}

function redoMove() {
  if (historyPointer >= moveHistory.length - 1) return;
  historyPointer++;
  const state = moveHistory[historyPointer];
  restoreState(state);
  addToHistory(`Redo: ${state.lastAction}`, true);
}

function restoreState(state) {
  currentPlayer = state.currentPlayer;
  redScore = state.redScore;
  blueScore = state.blueScore;
  redTitans = state.redTitans;
  blueTitans = state.blueTitans;
  placementPhase = state.placementPhase;
  unlockedCircuit = state.unlockedCircuit;
  turnTimeLeft = state.turnTimeLeft;
  gameTimeLeft = state.gameTimeLeft;


  if (gameMode === "hacker" || gameMode === "hacker++") {
    redAvailable = state.redAvailable !== undefined ? state.redAvailable : 4;
    blueAvailable = state.blueAvailable !== undefined ? state.blueAvailable : 4;
  }


  board.innerHTML = "";
  nodes = [];
  edges = [];


  createBoard();


  state.nodes.forEach((nodeState, index) => {
    if (nodeState === "red") nodes[index].classList.add("red");
    if (nodeState === "blue") nodes[index].classList.add("blue");
  });


  edges.forEach((edge, index) => {
    edge.controlledBy = state.edges[index].controlledBy;
    if (edge.controlledBy) {
      edge.element.className = `edge controlled-${edge.controlledBy}`;
    } else {
      edge.element.className = "edge";
    }
  });


  selectedNode = null;
  clearAvailableMoves();


  updateUI();
}

function saveGameState() {
  if (historyPointer < moveHistory.length - 1) {
    moveHistory = moveHistory.slice(0, historyPointer + 1);
  }

  const nodeStates = nodes.map(node => {
    if (node.classList.contains("red")) return "red";
    if (node.classList.contains("blue")) return "blue";
    return null;
  });

  const edgeStates = edges.map(edge => ({
    controlledBy: edge.controlledBy,
    weight: edge.weight
  }));

  const lastAction = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].lastAction : "Initial state";

  const newState = {
    nodes: nodeStates,
    edges: edgeStates,
    currentPlayer,
    redScore,
    blueScore,
    redTitans,
    blueTitans,
    placementPhase,
    unlockedCircuit,
    turnTimeLeft,
    gameTimeLeft,
    lastAction,

    ...((gameMode === "hacker" || gameMode === "hacker++") && {
      redAvailable,
      blueAvailable
    })
  };

  moveHistory.push(newState);
  historyPointer = moveHistory.length - 1;
}


function addToHistory(action, isSystemMessage = false) {
  if (gameMode === "normal") return;
  const entry = document.createElement("div");
  entry.className = `history-item ${isSystemMessage ? "system" : currentPlayer}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${action}`;
  historyList.appendChild(entry);
  historyList.scrollTop = historyList.scrollHeight;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = `Sound: ${soundEnabled ? "ON" : "OFF"}`;
}

function setGameMode(mode) {
  gameMode = mode;
  normalModeBtn.classList.remove("active");
  hackerModeBtn.classList.remove("active");
  hackerPlusModeBtn.classList.remove("active");
  document.getElementById(`${mode}Mode`).classList.add("active");


  document.getElementById("hacker-controls").classList.toggle("hidden", mode !== "hacker" && mode !== "hacker++");
  document.getElementById("hacker-plus-controls").classList.toggle("hidden", mode !== "hacker++");
  moveHistorySection.classList.toggle("hidden", mode === "normal");
  document.getElementById("leaderboard").classList.toggle("hidden", mode === "normal");

  resetGame();

  if (mode !== "normal") {
    setupPlayerNames();
  }
}

function updateLeaderboard(redScore, blueScore, winner) {

  let leaderboard = JSON.parse(localStorage.getItem('titanLeaderboard')) || [];
  

  leaderboard.push({
    date: new Date().toLocaleString(),
    redScore,
    blueScore,
    winner
  });
  

  leaderboard.sort((a, b) => (b.redScore + b.blueScore) - (a.redScore + a.blueScore));
  

  leaderboard = leaderboard.slice(0, 5);
  

  localStorage.setItem('titanLeaderboard', JSON.stringify(leaderboard));
  

  updateLeaderboardDisplay();
}

function updateLeaderboardDisplay() {
  const leaderboard = JSON.parse(localStorage.getItem('titanLeaderboard')) || [];
  const leaderboardEl = document.getElementById('leaderboard-list');
  
  if (!leaderboardEl) return;
  
  leaderboardEl.innerHTML = '';
  
  leaderboard.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = `leaderboard-item ${entry.winner}`;
    item.innerHTML = `
      <span class="rank">${index + 1}.</span>
      <span class="scores">
        <span class="red">Red: ${entry.redScore}</span> | 
        <span class="blue">Blue: ${entry.blueScore}</span>
      </span>
      <span class="date">${entry.date}</span>
    `;
    leaderboardEl.appendChild(item);
  });
}

function usePowerup() {
  if (gameMode !== "hacker++") return;
  alert("Power-up used! (Implementation would go here)");
  addToHistory(`${currentPlayer} used a power-up`);
}

function replayGame() {
  if (gameMode !== "hacker++") return;
  alert("Game replay started! (Implementation would go here)");
}

function analyzeGame() {
  if (gameMode !== "hacker++") return;
  alert("Game analysis displayed! (Implementation would go here)");
}



function setupEventListeners() {
  pauseBtn.addEventListener("click", pauseGame);
  resumeBtn.addEventListener("click", resumeGame);
  resetBtn.addEventListener("click", resetGame);
  undoBtn.addEventListener("click", undoMove);
  redoBtn.addEventListener("click", redoMove);
  soundBtn.addEventListener("click", toggleSound);
  powerupBtn.addEventListener("click", usePowerup);
  replayBtn.addEventListener("click", replayGame);
  analysisBtn.addEventListener("click", analyzeGame);
  normalModeBtn.addEventListener("click", () => setGameMode("normal"));
  hackerModeBtn.addEventListener("click", () => setGameMode("hacker"));
  hackerPlusModeBtn.addEventListener("click", () => setGameMode("hacker++"));
  window.addEventListener("resize", () => { createBoard(); updateUI(); });
}

document.addEventListener("DOMContentLoaded", initGame);