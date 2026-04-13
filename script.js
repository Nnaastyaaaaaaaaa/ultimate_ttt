const socket = io(); // Подключаемся к серверу
let myRole = ''; // Наша роль (X или O)

const mySymbolElement = document.getElementById('my-symbol');

socket.on('assignRole', (role) => {
    myRole = role;
    
    if (role === 'viewer') {
        statusElement.innerText = 'ВЫ ЗРИТЕЛЬ';
        mySymbolElement.innerText = 'ЗРИТЕЛЬ';
    } else {
        // Устанавливаем символ (используем те же × и ○ для красоты)
        const displaySymbol = (role === 'X') ? 'X' : 'O';
        mySymbolElement.innerText = displaySymbol;
        
        // Красим надпись в нужный цвет
        mySymbolElement.className = (role === 'X') ? 'role-x' : 'role-o';
    }
    console.log('Назначена роль:', role);
});

// Слушаем ходы от противника
socket.on('moveMade', (data) => {
    const { bigIdx, smallIdx } = data;
    
    // Находим нужный большой квадрат, а в нем — нужную по счету клетку (cell)
    const bigSquare = document.getElementById(`big-${bigIdx}`);
    const targetCell = bigSquare.querySelectorAll('.cell')[smallIdx];
    
    // Выполняем ход (currentPlayer уже переключится сам внутри функции)
    executeMove(bigIdx, smallIdx, targetCell);
});

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const svgLayer = document.getElementById('win-lines-svg');

let currentPlayer = 'X';
let activeBigSquare = -1;
let bigBoardStatus = Array(9).fill(null);
let fullBoard = Array(9).fill(null).map(() => Array(9).fill(null));

function createBoard() {
    boardElement.innerHTML = '';
    svgLayer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const bigSquare = document.createElement('div');
        bigSquare.className = 'big-square';
        bigSquare.id = `big-${i}`;
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => handleMove(i, j, cell);
            bigSquare.appendChild(cell);
        }
        boardElement.appendChild(bigSquare);
    }
}

function handleMove(bigIdx, smallIdx, cellElement) {
    // 1. Проверка очереди (ходим только в свой ход)
    if (currentPlayer !== myRole) {
        console.log("Сейчас не ваш ход!");
        return;
    }

    // 2. Стандартные проверки правил Ultimate Tic-Tac-Toe
    if (fullBoard[bigIdx][smallIdx] || 
       (activeBigSquare !== -1 && activeBigSquare !== bigIdx) || 
       bigBoardStatus[bigIdx]) {
        return;
    }

    // 3. Если всё ок — сообщаем серверу о ходе
    socket.emit('makeMove', { bigIdx, smallIdx });

    // 4. Выполняем ход у себя локально
    executeMove(bigIdx, smallIdx, cellElement);
}

function executeMove(bigIdx, smallIdx, cellElement) {
    // Записываем ход в массив
    fullBoard[bigIdx][smallIdx] = currentPlayer;
    
    // Визуально ставим символ в клетку
    cellElement.classList.add(currentPlayer.toLowerCase());

    // Проверяем, захвачено ли малое поле
    if (checkWinner(fullBoard[bigIdx])) {
        bigBoardStatus[bigIdx] = currentPlayer;
        drawBigSymbol(bigIdx, currentPlayer);
    }

    // Определяем следующее активное поле
    activeBigSquare = (bigBoardStatus[smallIdx] || isSquareFull(smallIdx)) ? -1 : smallIdx;

    // Проверяем победу во всей игре
    const winLine = checkWinner(bigBoardStatus);
    if (winLine) {
        statusElement.innerText = `ИГРОК ${currentPlayer} ПОБЕДИЛ!`;
        drawWinLine(winLine);
        activeBigSquare = -2; // Блокируем поле
        resetBtn.style.display = 'block';
    } else {
        // Передаем ход
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateVisuals();
    }
}

function drawBigSymbol(idx, player) {
    const el = document.createElement('div');
    el.className = `big-symbol ${player.toLowerCase()}`;
    if (player === 'X') {
        el.innerText = '×';
    } else {
        el.innerText = '○';
    }
    document.getElementById(`big-${idx}`).appendChild(el);
}

function drawWinLine(line) {
    const squares = line.map(i => document.getElementById(`big-${i}`));
    const containerRect = boardElement.getBoundingClientRect();

    const rects = squares.map(s => s.getBoundingClientRect());
    
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linePath.setAttribute("x1", rects[0].left + rects[0].width/2 - containerRect.left);
    linePath.setAttribute("y1", rects[0].top + rects[0].height/2 - containerRect.top);
    linePath.setAttribute("x2", rects[2].left + rects[2].width/2 - containerRect.left);
    linePath.setAttribute("y2", rects[2].top + rects[2].height/2 - containerRect.top);
    linePath.setAttribute("class", "winning-line-path");
    
    svgLayer.appendChild(linePath);
}

function updateVisuals() {
    statusElement.innerText = `ХОД ИГРОКА: ${currentPlayer}`;
    statusElement.style.color = currentPlayer === 'X' ? '#e94560' : '#08d9d6';
    
    document.querySelectorAll('.big-square').forEach((sq, idx) => {
        sq.classList.remove('active-square', 'inactive-square');
        if (activeBigSquare === -2) return;
        const isAvailable = (activeBigSquare === -1 && !bigBoardStatus[idx]) || (activeBigSquare === idx);
        sq.classList.add(isAvailable ? 'active-square' : 'inactive-square');
    });
}

function checkWinner(b) {
    const l = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return l.find(a => b[a[0]] && b[a[0]] === b[a[1]] && b[a[0]] === b[a[2]]);
}

function isSquareFull(idx) { return fullBoard[idx].every(c => c !== null); }

// Обработка кнопок
document.getElementById('info-btn').onclick = () => document.getElementById('rules-modal').style.display = 'block';
document.querySelector('.close').onclick = () => document.getElementById('rules-modal').style.display = 'none';
window.onclick = (e) => { if(e.target.className === 'modal') document.getElementById('rules-modal').style.display = 'none'; }

resetBtn.onclick = () => {
    fullBoard = Array(9).fill(null).map(() => Array(9).fill(null));
    bigBoardStatus = Array(9).fill(null);
    currentPlayer = 'X';
    activeBigSquare = -1;
    resetBtn.style.display = 'none';
    createBoard();
    updateVisuals();
};

createBoard();
updateVisuals();