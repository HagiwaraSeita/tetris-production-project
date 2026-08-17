import { GameState } from "./gameState"
import { INITIAL_PIECE_POSITION, MINOS } from "./pieces"
import {
  moveLeft,
  moveRight,
  moveDown,
  moveLeftEdge,
  rotateClockwise,
  rotateCounterClockwise,
  // rotate180,  // 180度回転はゲームによって存在しないので、追加は要検討   
  isGrounded,
} from "./gameController"

function stateKey(state: GameState): string {
  const [y, x] = state.current_piece_position
  return `${state.rot},${y},${x}`
}

// 1手で試す操作の一覧（純粋関数を値として並べているだけ）
const MOVES = [
  moveLeft,
  moveRight,
  moveDown,
  rotateClockwise,
  rotateCounterClockwise,
  // rotate180,  // 180度回転はゲームによって存在しないので、追加は要検討
]

export function getAllValidPlacements(state: GameState): GameState[] {
  const pieceType = state.current_piece_shape
  const board = state.board

  const visited = new Set<string>()
  const queue: GameState[] = []
  const placements: GameState[] = []

  function tryAdd(candidate: GameState) {
    const key = stateKey(candidate)
    if (visited.has(key)) return
    visited.add(key)
    queue.push(candidate)
    if (isGrounded(candidate)) {
      placements.push(candidate)
    }
  }

  // --- 出発点をqueueに追加 ---
  const boardIsLow = !board[15].some(cell => cell !== 0)
  const rotationCount = pieceType === "O" ? 1 : 4 // Oミノは1回だけで十分

  if (boardIsLow) {
    // 各回転について、列を左端から右端まで動かしながら一気に落として出発点にする
    for (let rot = 0; rot < rotationCount; rot++) {
      let current: GameState = {
        ...state,
        rot,
        current_piece: MINOS[pieceType][rot],
        current_piece_position: [...INITIAL_PIECE_POSITION],
      }
      current = moveLeftEdge(current)

      while (true) {
        let dropped: GameState = current
        while (true) {
          const next = moveDown(dropped)
          if (next === null) break
          dropped = next
        }
        tryAdd(dropped)

        const next = moveRight(current)
        if (next === null) break
        current = next
      }
    }
  } else {
    // 積み上がっている場合は、spawn位置だけから素直にBFSを始める
    tryAdd({ ...state, current_piece_position: [...INITIAL_PIECE_POSITION] })
  }

  // --- BFS本体 ---
  let head = 0
  while (head < queue.length) {
    const current = queue[head]
    head++

    for (const move of MOVES) {
      const next = move(current)
      if (next !== null) {
        tryAdd(next)
      }
    }
  }

  return placements
}