import React from 'react'
import { GameState } from '../game/gameState'
import { PIECE_COLORS } from '../constants'

const CELL_SIZE = 30

interface Props {
  gameState: GameState
  aiHighlightCells?: [number, number][] | null
}

export const Board: React.FC<Props> = ({ gameState, aiHighlightCells }) => {
  const {
    board,
    current_piece,
    current_piece_position,
    current_piece_shape,
    ghost_position,
  } = gameState

  const aiCellSet = new Set((aiHighlightCells ?? []).map(([r, c]) => `${r}-${c}`))

  type Cell = { shape: string | 0; isGhost: boolean }
  const display: Cell[][] = board.map(row =>
    row.map(cell => ({ shape: cell, isGhost: false }))
  )

  // Ghost piece (semi-transparent outline)
  for (let y = 0; y < current_piece.length; y++) {
    for (let x = 0; x < current_piece[y].length; x++) {
      if (current_piece[y][x]) {
        const ny = ghost_position[0] + y
        const nx = ghost_position[1] + x
        if (ny >= 0 && ny < 20 && nx >= 0 && nx < 10 && !display[ny][nx].shape) {
          display[ny][nx] = { shape: current_piece_shape, isGhost: true }
        }
      }
    }
  }

  // Active piece
  for (let y = 0; y < current_piece.length; y++) {
    for (let x = 0; x < current_piece[y].length; x++) {
      if (current_piece[y][x]) {
        const ny = current_piece_position[0] + y
        const nx = current_piece_position[1] + x
        if (ny >= 0 && ny < 20 && nx >= 0 && nx < 10) {
          display[ny][nx] = { shape: current_piece_shape, isGhost: false }
        }
      }
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(10, ${CELL_SIZE}px)`,
        border: '2px solid #444',
        backgroundColor: '#222',
      }}
    >
      {display.map((row, y) =>
        row.map(({ shape, isGhost }, x) => {
          const isAICell = !shape && aiCellSet.has(`${y}-${x}`)
          const color = shape ? PIECE_COLORS[shape as string] : '#111'
          return (
            <div
              key={`${y}-${x}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: isGhost || isAICell ? 'transparent' : color,
                border: isGhost
                  ? `2px solid ${PIECE_COLORS[shape as string]}`
                  : isAICell
                  ? '2px solid #ff69b4'
                  : '1px solid #2a2a2a',
                boxSizing: 'border-box',
              }}
            />
          )
        })
      )}
    </div>
  )
}
