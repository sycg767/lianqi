import {GameManager} from "./vendor/2048.min.js"

let game;
window.requestAnimationFrame(() => {
  game = new GameManager(4);
  window.game = game;
});

const workers = [ new Worker("ai1.3.js"), new Worker("ai1.3.js"), new Worker("ai1.3.js"), new Worker("ai1.3.js")];

let working = 0;
let bestMove, bestResult;
let startTime, totalMove;
for (let i = 0; i < 4; ++i) {
  workers[i].onmessage = ({data}) => {
    working--;
    if (data > bestResult) {
      bestResult = data;
      bestMove = i;
    }
    if (working == 0) {
      game.move(bestMove);
	  getGrid(bestMove);
    }
  }
}
function currentState() {
  const result = new Uint16Array(4);
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      const tile = game.grid.cells[j][i];
      if (tile) result[i] = result[i] | ((Math.log2(tile.value) & 0xf) << (12 - 4 * j));
    }
  }
  return result;
}

function step() {
	let c = document.getElementsByClassName('cell n');
	if(c.length==0)
	{
		alert('还没有设置新的道具位置');
		return;
	}
	while(c.length>0)
	{
		c[0].classList.remove('n');
	}
	const board = currentState();
	bestResult = 0;
	working = 4;
	bestMove = 0 | 4 * Math.random();
	for (let dir = 0; dir < 4; ++dir) workers[dir].postMessage({board, dir});
}
document.querySelector("#go").addEventListener('click', () => step());
