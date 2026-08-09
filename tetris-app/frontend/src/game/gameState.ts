import { GameState } from "../hooks/useGame"

export type Position = [number, number]
export type Board = (string | 0)[][]
export const initialGameState: GameState = {
    board: new Array(20).fill(0).map(() => new Array(10).fill(0)),
    current_piece_shape: "",
    current_piece: [],
    current_piece_position: [0, 0],
    ghost_position: [0, 0],
    rot: 0,
    next_pieces: [],
    hold_piece_shape: null,
    score: 0,
    game_over: false,
}

