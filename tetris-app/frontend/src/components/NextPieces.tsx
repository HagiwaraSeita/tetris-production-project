import React from 'react'
import { MINOS, PIECE_COLORS } from '../constants'

const CELL_SIZE = 20

interface Props {
  nextPieces: string[]
}

export const NextPieces: React.FC<Props> = ({ nextPieces }) => (
  <div>
    <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4, letterSpacing: 2 }}>
      NEXT
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {nextPieces.slice(0, 5).map((shape, i) => (
        <div
          key={i}
          style={{
            width: 4 * CELL_SIZE,
            height: 4 * CELL_SIZE,
            backgroundColor: '#111',
            border: '2px solid #444',
            position: 'relative',
          }}
        >
          {MINOS[shape][0].map((row, y) =>
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
                    backgroundColor: PIECE_COLORS[shape],
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxSizing: 'border-box',
                  }}
                />
              ) : null
            )
          )}
        </div>
      ))}
    </div>
  </div>
)
