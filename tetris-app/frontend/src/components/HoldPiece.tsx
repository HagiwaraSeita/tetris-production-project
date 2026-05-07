import React from 'react'
import { MINOS, PIECE_COLORS } from '../constants'

const CELL_SIZE = 25

interface Props {
  holdPieceShape: string | null
}

export const HoldPiece: React.FC<Props> = ({ holdPieceShape }) => (
  <div>
    <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4, letterSpacing: 2 }}>
      HOLD
    </div>
    <div
      style={{
        width: 4 * CELL_SIZE,
        height: 4 * CELL_SIZE,
        backgroundColor: '#111',
        border: '2px solid #444',
        position: 'relative',
      }}
    >
      {holdPieceShape &&
        MINOS[holdPieceShape][0].map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <div
                key={`${y}-${x}`}
                style={{
                  position: 'absolute',
                  left: x * CELL_SIZE,
                  top: y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: PIECE_COLORS[holdPieceShape],
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxSizing: 'border-box',
                }}
              />
            ) : null
          )
        )}
    </div>
  </div>
)
