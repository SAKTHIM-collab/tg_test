const board = document.getElementById("board");
const redScoreEl = document.getElementById("redScore");
const blueScoreEl = document.getElementById("blueScore");
const redTitansEl = document.getElementById("redTitans");
const blueTitansEl = document.getElementById("blueTitans");
const turnTimerEl = document.getElementById("turnTimer");
const gameTimerEl = document.getElementById("gameTimer");
const currentPlayerEl = document.getElementById("currentPlayer");
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
let totalTitans = 8;
let placementPhase = true;
let turnTimer, gameTimer;
let turnTimeLeft = 30, gameTimeLeft = 300;
let gamePaused = false;
let soundEnabled = true;
let gameMode = "normal"; 
let moveHistory = [];
let historyPointer = -1;
let selectedNode = null;

const connections = [
  [0, 1, 2],   
  [1, 2, 1],   
  [2, 3, 2],   
  [3, 4, 1],   
  [4, 5, 3],   
  [5, 0, 1],   

  [6, 7, 5],  
  [7, 8, 8],   
  [8, 9, 4],   
  [9, 10, 1],  
  [10, 11, 5], 
  [11, 6, 1],  

  [12, 13, 8],
  [13, 14, 9],
  [14, 15, 1], 
  [15, 16, 5],
  [16, 17, 1], 
  [17, 12, 6], 

  [6, 12, 1],

  [1, 7, 1],

  [8, 14, 1],

  [3, 9, 1],

  [10, 16, 1],

  [5, 11, 1],
];

function initGame() {
    createBoard();
    startTimers();
    updateUI();
    setupEventListeners();
    setGameMode('normal');
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
const centerX = 400;


function createBoard() {
    board.innerHTML = "";
    nodes = [];
    
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.width / 2;
    const centerY = boardRect.height / 2;
    const radii = [
        Math.min(centerX, centerY) * 0.3,  
        Math.min(centerX, centerY) * 0.6,
        Math.min(centerX, centerY) * 0.9
    ];
    
    const positions = generateHexPositions(centerX, centerY, radii);

    positions.forEach((pos, idx) => {
        const node = document.createElement("div");
        node.classList.add("node");
        node.dataset.index = idx;
        node.style.left = `${pos[0]}px`;
        node.style.top = `${pos[1]}px`;
        node.addEventListener("mouseenter", () => {
            if (!node.classList.contains("red") && !node.classList.contains("blue")) {
                node.style.transform = "translate(-50%, -50%) scale(1.1)";
                node.style.boxShadow = `0 0 15px ${currentPlayer === "red" ? "rgba(231, 76, 60, 0.7)" : "rgba(52, 152, 219, 0.7)"}`;
            }
        });

        node.addEventListener("mouseleave", () => {
            if (!node.classList.contains("red") && !node.classList.contains("blue")) {
                node.style.transform = "translate(-50%, -50%)";
                node.style.boxShadow = "none";
            }
        });

        node.addEventListener("click", () => handleNodeClick(idx));
        board.appendChild(node);
        nodes.push(node);
    });

    renderEdges();
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

        edges.push({ 
            from, 
            to, 
            weight, 
            controlledBy: null,
            element: edge
        });
    });
}

function handleNodeClick(index) {
    if (gamePaused) return;
    
    const node = nodes[index];
    
    if (node.classList.contains("red") || node.classList.contains("blue")) {
        if (!placementPhase && gameMode !== 'normal') {
            handleMovementSelection(index);
        }
        return;
    }

    if (placementPhase) {
        if ((currentPlayer === "red" && redTitans >= 4) || 
            (currentPlayer === "blue" && blueTitans >= 4)) return;

        if (gameMode !== 'normal') {
            saveGameState();
        }

        placeTitan(node, index);
        
        if (redTitans === 4 && blueTitans === 4) {
            placementPhase = false;
            board.classList.add("movement-phase");
            setTimeout(() => board.classList.remove("movement-phase"), 1000);
            
            if (gameMode !== 'normal') {
                addToHistory(`Placement phase ended`);
            }
        }
    } else {
        if (gameMode !== 'normal') {
            handleMovement(index);
        }
    }
    
    updateUI();
}

function placeTitan(node, index) {
    node.classList.add(currentPlayer);
    
    node.style.animation = "placeAnimation 0.3s forwards";
    setTimeout(() => {
        node.style.animation = "";
    }, 300);
    
    if (soundEnabled) {
        placeSound.currentTime = 0;
        placeSound.play();
    }
    
    if (currentPlayer === "red") redTitans++;
    else blueTitans++;
    
    updateEdges();
    
    if (gameMode !== 'normal') {
        addToHistory(`${currentPlayer} placed titan at position ${index}`);
    }
    
    switchPlayer();
}

function handleMovementSelection(index) {
    const node = nodes[index];
    
    if ((currentPlayer === "red" && node.classList.contains("red")) || 
        (currentPlayer === "blue" && node.classList.contains("blue"))) {
        
        if (selectedNode === index) {
            nodes[index].style.boxShadow = "none";
            selectedNode = null;
        } else {
            if (selectedNode !== null) {
                nodes[selectedNode].style.boxShadow = "none";
            }
            
            selectedNode = index;
            nodes[index].style.boxShadow = `0 0 20px ${currentPlayer === "red" ? "#e74c3c" : "#3498db"}`;
        }
    }
}

function handleMovement(targetIndex) {
    if (selectedNode === null) return;
    
    const sourceNode = nodes[selectedNode];
    const targetNode = nodes[targetIndex];
    
    const isValidMove = edges.some(edge => {
        return (edge.from === selectedNode && edge.to === targetIndex) || 
               (edge.to === selectedNode && edge.from === targetIndex);
    });
    
    if (!isValidMove) return;
    
    saveGameState();
    
    sourceNode.classList.remove(currentPlayer);
    targetNode.classList.add(currentPlayer);
    
    const x1 = parseFloat(sourceNode.style.left);
    const y1 = parseFloat(sourceNode.style.top);
    const x2 = parseFloat(targetNode.style.left);
    const y2 = parseFloat(targetNode.style.top);
    
    targetNode.style.setProperty('--from-x', `${x1 - x2}px`);
    targetNode.style.setProperty('--from-y', `${y1 - y2}px`);
    targetNode.style.animation = "moveAnimation 0.3s forwards";
    setTimeout(() => {
        targetNode.style.animation = "";
    }, 300);
    
    if (soundEnabled) {
        moveSound.currentTime = 0;
        moveSound.play();
    }
    
    checkForCaptures(targetIndex);
    
    updateEdges();
    
    addToHistory(`${currentPlayer} moved titan from ${selectedNode} to ${targetIndex}`);
    
    sourceNode.style.boxShadow = "none";
    selectedNode = null;
    
    switchPlayer();
}

function checkForCaptures(index) {
    if (gameMode === 'normal') return;
    
    const node = nodes[index];
    const neighbors = getNeighbors(index);
    
    if (neighbors.every(neighbor => {
        return nodes[neighbor].classList.contains(currentPlayer === "red" ? "blue" : "red");
    })) {
        node.classList.remove(currentPlayer);
        
        if (currentPlayer === "red") redTitans--;
        else blueTitans--;
        
        if (soundEnabled) {
            captureSound.currentTime = 0;
            captureSound.play();
        }
        
        addToHistory(`${currentPlayer === "red" ? "Blue" : "Red"} captured titan at ${index}`);
    }
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
        
        const aColor = nodeA.classList.contains("red") ? "red" : 
                      nodeA.classList.contains("blue") ? "blue" : null;
        const bColor = nodeB.classList.contains("red") ? "red" : 
                      nodeB.classList.contains("blue") ? "blue" : null;

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
    void currentPlayerEl.offsetWidth; 
    currentPlayerEl.classList.add(`${currentPlayer}-turn`);
}

function updateUI() {
    redScoreEl.textContent = redScore;
    blueScoreEl.textContent = blueScore;
    redTitansEl.textContent = redTitans;
    blueTitansEl.textContent = blueTitans;
    currentPlayerEl.textContent = `${currentPlayer === "red" ? "Red" : "Blue"}'s Turn`;
    currentPlayerEl.className = `${currentPlayer}-turn`;
    turnTimerEl.textContent = turnTimeLeft;
    gameTimerEl.textContent = gameTimeLeft;
}

function startTimers() {
    clearInterval(turnTimer);
    clearInterval(gameTimer);
    
    turnTimer = setInterval(() => {
        if (!gamePaused) {
            turnTimeLeft--;
            
            if (turnTimeLeft <= 0) {
                addToHistory(`${currentPlayer} ran out of time`);
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

function endGame(message) {
    clearInterval(turnTimer);
    clearInterval(gameTimer);
    
    let winner;
    if (redScore > blueScore) winner = "Red Titan wins!";
    else if (blueScore > redScore) winner = "Blue Titan wins!";
    else winner = "It's a tie!";
    
    setTimeout(() => {
        alert(`${message}\nFinal Score - Red: ${redScore}, Blue: ${blueScore}\n${winner}`);
    }, 500);
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
    clearInterval(turnTimer);
    clearInterval(gameTimer);
    
    redScore = blueScore = redTitans = blueTitans = 0;
    currentPlayer = "red";
    placementPhase = true;
    turnTimeLeft = 30;
    gameTimeLeft = 300;
    gamePaused = false;
    selectedNode = null;
    moveHistory = [];
    historyPointer = -1;
    
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    board.style.opacity = "1";
    board.classList.remove("movement-phase");
    
    historyList.innerHTML = "";
    
    createBoard();
    startTimers();
    updateUI();
}

function undoMove() {
    if (historyPointer < 0) return;
    
    const state = moveHistory[historyPointer];
    historyPointer--;
    
    currentPlayer = state.currentPlayer;
    redScore = state.redScore;
    blueScore = state.blueScore;
    redTitans = state.redTitans;
    blueTitans = state.blueTitans;
    placementPhase = state.placementPhase;
    turnTimeLeft = state.turnTimeLeft;
    gameTimeLeft = state.gameTimeLeft;
    
    state.nodes.forEach((nodeState, index) => {
        const node = nodes[index];
        node.className = "node";
        if (nodeState === "red") node.classList.add("red");
        if (nodeState === "blue") node.classList.add("blue");
    });
    
    edges.forEach((edge, index) => {
        edge.controlledBy = state.edges[index].controlledBy;
        edge.element.className = `edge ${edge.controlledBy ? 'controlled-' + edge.controlledBy : ''}`;
    });
    
    updateUI();
    addToHistory(`Undo: ${state.lastAction}`, true);
}

function redoMove() {
    if (historyPointer >= moveHistory.length - 1) return;
    
    historyPointer++;
    const state = moveHistory[historyPointer];
    
    currentPlayer = state.currentPlayer;
    redScore = state.redScore;
    blueScore = state.blueScore;
    redTitans = state.redTitans;
    blueTitans = state.blueTitans;
    placementPhase = state.placementPhase;
    turnTimeLeft = state.turnTimeLeft;
    gameTimeLeft = state.gameTimeLeft;
    
    state.nodes.forEach((nodeState, index) => {
        const node = nodes[index];
        node.className = "node";
        if (nodeState === "red") node.classList.add("red");
        if (nodeState === "blue") node.classList.add("blue");
    });
    
    edges.forEach((edge, index) => {
        edge.controlledBy = state.edges[index].controlledBy;
        edge.element.className = `edge ${edge.controlledBy ? 'controlled-' + edge.controlledBy : ''}`;
    });
    
    updateUI();
    addToHistory(`Redo: ${state.lastAction}`, true);
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
        controlledBy: edge.controlledBy
    }));
    
    moveHistory.push({
        nodes: nodeStates,
        edges: edgeStates,
        currentPlayer,
        redScore,
        blueScore,
        redTitans,
        blueTitans,
        placementPhase,
        turnTimeLeft,
        gameTimeLeft,
        lastAction: moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].lastAction : "Initial state"
    });
    
    historyPointer = moveHistory.length - 1;
}

function addToHistory(action, isSystemMessage = false) {
    if (gameMode === 'normal') return;
    
    const entry = document.createElement("div");
    entry.className = `history-item ${isSystemMessage ? 'system' : currentPlayer}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${action}`;
    historyList.appendChild(entry);
    historyList.scrollTop = historyList.scrollHeight;
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
}

function setGameMode(mode) {
    gameMode = mode;
    
    normalModeBtn.classList.remove("active");
    hackerModeBtn.classList.remove("active");
    hackerPlusModeBtn.classList.remove("active");
    
    document.getElementById(`${mode}Mode`).classList.add("active");
    
    document.getElementById("hacker-controls").classList.add("hidden");
    document.getElementById("hacker-plus-controls").classList.add("hidden");
    moveHistorySection.classList.add("hidden");
    
    if (mode === 'hacker') {
        document.getElementById("hacker-controls").classList.remove("hidden");
        moveHistorySection.classList.remove("hidden");
    } else if (mode === 'hacker++') {
        document.getElementById("hacker-controls").classList.remove("hidden");
        document.getElementById("hacker-plus-controls").classList.remove("hidden");
        moveHistorySection.classList.remove("hidden");
    }
    
    resetGame();
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
    normalModeBtn.addEventListener("click", () => setGameMode('normal'));
    hackerModeBtn.addEventListener("click", () => setGameMode('hacker'));
    hackerPlusModeBtn.addEventListener("click", () => setGameMode('hacker++'));
}

function usePowerup() {
    if (gameMode !== 'hacker++') return;
    alert("Power-up used! (Implementation would go here)");
    addToHistory(`${currentPlayer} used a power-up`);
}

function replayGame() {
    if (gameMode !== 'hacker++') return;
    alert("Game replay started! (Implementation would go here)");
}

function analyzeGame() {
    if (gameMode !== 'hacker++') return;
    alert("Game analysis displayed! (Implementation would go here)");
}

document.addEventListener('DOMContentLoaded', initGame);