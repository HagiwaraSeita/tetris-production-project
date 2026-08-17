// placementSolver.ts の先頭で、必要なものをimportします
import { GameState } from "./gameState"
import { PieceShape, MINOS } from "./pieces"
import {
    isValidPosition,
    moveLeft,
    moveRight,
    moveDown,
    rotateClockwise,
    rotateCounterClockwise,
    rotate180,
    isGrounded,
} from "./gameController"



export function getAllValidPlacements(state: GameState): Set<string> {
    const pieceType = state.current_piece_shape
    const pieceShapes = MINOS[pieceType]
    const visited = new Set<string>() // "rot, x, y" の形式で訪問済みの状態を記録するセット
    const queue: GameState[] = []
    const board = state.board
    let current = { ...state }

    if ( !board[15].some(cell => cell !== 0) ){
        // 4方向全てで試す
        for (let rot = 0; rot < 4; rot++) {
            // 一番左に移動
            while (true) {
                const next = moveLeft
                if (next === null)
                    break
                current = next
            }
        }
    }
    
    queue.push(state)
    while ( queue.length > 0) {

    }
    
        
    return visited
}