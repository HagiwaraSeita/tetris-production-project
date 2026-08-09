export interface GameState {
  board: Board
  current_piece_shape: string
  current_piece: number[][]
  current_piece_position: Position
  ghost_position: Position
  rot: number
  next_pieces: string[]
  hold_piece_shape: string | null
  score: number
  game_over: boolean
}

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