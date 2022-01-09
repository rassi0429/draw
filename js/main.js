'use strict'

// Initialise application
Board.init('board');
Pen.init(Board.ctx);
FloatingButton.init();
FloatingButton.onClick = Board.clearMemory.bind(Board);
Pointer.onEmpty = _.debounce(Board.storeMemory.bind(Board), 1500);

let state = false
const searchParams = new URLSearchParams(window.location.search)
let ws_url = 'wss://wsecho.kokoa.dev/canvassync/' + (searchParams.get("name") || "test");

let sock;

function ws_connect(){
  sock = new WebSocket(ws_url);

  sock.onclose = function incoming(event) {
    ws_connect();
  };
}

// 最初につなげる
ws_connect();

// Attach event listener
var pointerDown = function pointerDown(e) {
  // Initialise pointer
  var pointer = new Pointer(e.pointerId);
  pointer.set(Board.getPointerPos(e));
  console.log(Board.getPointerPos(e))
  // Get function type
  Pen.setFuncType(e);
  if (Pen.funcType === Pen.funcTypes.menu) Board.clearMemory();
  else drawOnCanvas(e, pointer, Pen);
  state = true
}
var pointerMove = function pointerMove(e) {
  if (Pen.funcType && (Pen.funcType.indexOf(Pen.funcTypes.draw) !== -1)) {

    var x = Board.getPointerPos(e)
    var width = getLineWidth(e)
    sock.send( state+":" + x.x + ":" + x.y + ":" + width);

    var pointer = Pointer.get(e.pointerId);

    drawOnCanvas(e, pointer, Pen);
  }
}
var pointerCancel = function pointerLeave(e) {
  state = false
  var x = Board.getPointerPos(e)
  var width = getLineWidth(e)
  sock.send( state+":" + x.x + ":" + x.y + ":" + width);
  console.log(Board.getPointerPos(e))
  Pointer.destruct(e.pointerId);
}
Board.dom.addEventListener('pointerdown', pointerDown);
Board.dom.addEventListener('pointermove', pointerMove);
Board.dom.addEventListener('pointerup', pointerCancel);
Board.dom.addEventListener('pointerleave', pointerCancel);

// Draw method
function drawOnCanvas(e, pointerObj, Pen) {
  if (pointerObj) {
    pointerObj.set(Board.getPointerPos(e));
    Pen.setPen(Board.ctx, e);

    if (pointerObj.pos0.x < 0) {
      pointerObj.pos0.x = pointerObj.pos1.x - 1;
      pointerObj.pos0.y = pointerObj.pos1.y - 1;
    }
    Board.ctx.beginPath();
    Board.ctx.moveTo(pointerObj.pos0.x, pointerObj.pos0.y)
    Board.ctx.lineTo(pointerObj.pos1.x, pointerObj.pos1.y);
    Board.ctx.closePath();
    Board.ctx.stroke();

    pointerObj.pos0.x = pointerObj.pos1.x;
    pointerObj.pos0.y = pointerObj.pos1.y;
  }
}

var getLineWidth = function getLineWidth(e) {
  switch (e.pointerType) {
    case 'touch': {
      if (e.width < 10 && e.height < 10) {
        return (e.width + e.height) * 2 + 10;
      } else {
        return (e.width + e.height - 40) / 2;
      }
    }
    case 'pen': return e.pressure * 8;
    default: return (e.pressure) ? e.pressure * 8 : 4;
  }
}