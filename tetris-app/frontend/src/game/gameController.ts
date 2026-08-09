import { PIECES, INITIAL_PIECE_POSITION, PieceShape, GRID_WIDTH, GRID_HEIGHT, SRS_JLSTZ, SRS_I, MINOS, NUM_NEXT_PIECES, SRS_180 } from "./pieces"
import { Board, Position, initialGameState } from "./gameState"
import { GameState } from "./../hooks/useGame"
import { shuffle } from "lodash"

type ClearLinesResult = { board: Board, clearedCount: number }

// --- internal helpers ---

export function isValidPosition(piece: PieceShape, pos: Position, board: Board): boolean {
  for (let y = 0; y < piece.length; y++) {
    for (let x = 0; x < piece[y].length; x++) {
      const cell = piece[y][x]
      if (cell) {
        const nx = pos[1] + x
        const ny = pos[0] + y
        if (nx < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) {
          return false
        }
        if (ny >= 0 && board[ny][nx]) {
          return false
        }
      }
    }
  }
  return true
}

export function updateGhost(piece: PieceShape, pos: Position, board: Board): Position {
  const ghostpos: Position = [...pos]
  while (isValidPosition(piece, ghostpos, board)) {
    ghostpos[0] += 1
  }
  ghostpos[0] -= 1
  return ghostpos
}

export function lockPiece(state: GameState): GameState {
  const shape = state.current_piece_shape
  const pos = state.current_piece_position
  const piece = state.current_piece

  const newBoard = state.board.map(row => [...row])

  for (let y = 0; y < piece.length; y++) {
    for (let x = 0; x < piece[y].length; x++) {
      const cell = piece[y][x]
      if (cell) {
        newBoard[pos[0] + y][pos[1] + x] = shape
      }
    }
  }

  return { ...state, board: newBoard }
}

export function clearLines(state: GameState): ClearLinesResult {
  let newBoard = state.board.filter((row) => row.some(cell => cell === 0))
  const cleared = GRID_HEIGHT - newBoard.length
  newBoard = [...new Array(cleared).fill(0).map(() => new Array(10).fill(0)), ...newBoard]
  return { board: newBoard, clearedCount: cleared }
}

// SRSに基づいて回転する
function tryRotate(state: GameState, newRot: number): GameState | null {
  const board = state.board
  const shape = state.current_piece_shape
  const newPiece = MINOS[shape][newRot]
  const oldPos = state.current_piece_position

  if (shape === "O") {
    return { ...state, rot: newRot }
  }

  const kicks = shape === "I" ? SRS_I : SRS_JLSTZ
  const key = state.rot + "," + newRot
  const kickList = kicks[key] ?? [[0, 0]]

  for (const [dx, dy] of kickList) {
    const testPos: Position = [oldPos[0] - dy, oldPos[1] + dx]
    if (isValidPosition(newPiece, testPos, board)) {
      const newGhost = updateGhost(newPiece, testPos, board)
      return {
        ...state,
        current_piece: newPiece,
        current_piece_position: testPos,
        rot: newRot,
        ghost_position: newGhost,
      }
    }
  }
  return null
}

// ネクストの補充（毎回ランダムにして入れている。50手ぐらい先まで入れておいてもいいかも？）
export function refillNext(nextPieces: string[]): string[] {
  if (nextPieces.length <= NUM_NEXT_PIECES) {
    const bag = shuffle([...PIECES])
    return [...nextPieces, ...bag]
  }
  return nextPieces
}

// ネクストの先頭を取り出して、次のミノをセットする
export function popNextPiece(state: GameState): GameState {
  let gameOver = false
  const refilled = refillNext(state.next_pieces)
  const newRot: number = 0
  const [newPieceShape, ...nextPieces] = refilled

  // 分割代入の結果が string | undefined のため
  if (newPieceShape === undefined) {
    throw new Error("next_pieces が空です。refillNext が正しく動いていない可能性があります")
  }

  const newPiece = MINOS[newPieceShape][newRot]
  const newPos: Position = [...INITIAL_PIECE_POSITION]
  const newGhost = updateGhost(newPiece, newPos, state.board)

  if (!isValidPosition(newPiece, newPos, state.board)) {
    gameOver = true
  }

  return {
    ...state,
    current_piece_shape: newPieceShape,
    current_piece: newPiece,
    current_piece_position: newPos,
    ghost_position: newGhost,
    rot: newRot,
    next_pieces: nextPieces,
    game_over: gameOver,
  }
}

// --- public actions ---

export function isGrounded(state: GameState): boolean {
  const testPos: Position = [state.current_piece_position[0] + 1, state.current_piece_position[1]]
  return !isValidPosition(state.current_piece, testPos, state.board)
}

export function forceLock(state: GameState): GameState {
  let newState = lockPiece(state)
  const { board, clearedCount } = clearLines(newState)
  newState = { ...newState, board: board }
  newState = popNextPiece(newState)
  return newState
}

export function moveLeft(state: GameState): GameState | null {
  const board = state.board
  const piece = state.current_piece
  const testPos: Position = [...state.current_piece_position]
  testPos[1] -= 1

  if (!isValidPosition(piece, testPos, board)) {
    return null
  }
  const newGhostPos = updateGhost(piece, testPos, board)
  return {
    ...state,
    current_piece_position: testPos,
    ghost_position: newGhostPos,
  }
}

export function moveRight(state: GameState): GameState | null {
  const board = state.board
  const piece = state.current_piece
  const testPos: Position = [...state.current_piece_position]
  testPos[1] += 1

  if (!isValidPosition(piece, testPos, board)) {
    return null
  }
  const newGhostPos = updateGhost(piece, testPos, board)
  return {
    ...state,
    current_piece_position: testPos,
    ghost_position: newGhostPos,
  }
}

export function moveDown(state: GameState): GameState | null {
  const board = state.board
  const piece = state.current_piece
  const testPos: Position = [...state.current_piece_position]
  testPos[0] += 1
  if (!isValidPosition(piece, testPos, board)) {
    return null
  }
  return {
    ...state,
    current_piece_position: testPos,
  }
}

// 今のミノを下に落として固定する
export function hardDrop(state: GameState): GameState {
  const dropPos = state.ghost_position
  let newState = lockPiece({ ...state, current_piece_position: dropPos })
  const { board, clearedCount } = clearLines(newState)
  newState = { ...newState, board: board }
  newState = popNextPiece(newState)
  return newState
}

// ホールド機能
export function hold(state: GameState): GameState {
  if (state.hold_piece_shape === null) {
    const newState = { ...state, hold_piece_shape: state.current_piece_shape }
    return popNextPiece(newState)
  } else {
    const newPieceShape = state.hold_piece_shape
    const newPiece = MINOS[newPieceShape][0]
    const newPos: Position = [...INITIAL_PIECE_POSITION]
    const newGhost = updateGhost(newPiece, newPos, state.board)
    return {
      ...state,
      current_piece_shape: newPieceShape,
      current_piece: newPiece,
      current_piece_position: newPos,
      ghost_position: newGhost,
      rot: 0,
      hold_piece_shape: state.current_piece_shape,
    }
  }
}

export function rotateClockwise(state: GameState): GameState | null {
  const newRot = (state.rot + 1) % 4
  return tryRotate(state, newRot)
}

export function rotateCounterClockwise(state: GameState): GameState | null {
  const newRot = (state.rot - 1 + 4) % 4
  return tryRotate(state, newRot)
}

// 180度回転はSRSに含まれていないため、独自に実装する（面倒な実装）
export function rotate180(state: GameState): GameState | null {
  const shape = state.current_piece_shape
  if (shape === "O") {
    return null
  }

  const newRot = (state.rot + 2) % 4
  const newPiece = MINOS[shape][newRot]
  const oldPos = state.current_piece_position

  for (const [dx, dy] of SRS_180) {
    const testPos: Position = [oldPos[0] - dy, oldPos[1] + dx]
    if (isValidPosition(newPiece, testPos, state.board)) {
      const newGhost = updateGhost(newPiece, testPos, state.board)
      return {
        ...state,
        current_piece: newPiece,
        current_piece_position: testPos,
        rot: newRot,
        ghost_position: newGhost,
      }
    }
  }
  return null
}

export function gravityTick(state: GameState): GameState | null {
  return moveDown(state)
}

export function restart(): GameState {
  let newState = { ...initialGameState }
  newState = {
    ...newState,
    next_pieces: refillNext(newState.next_pieces),
  }
  newState = popNextPiece(newState)
  return newState
}