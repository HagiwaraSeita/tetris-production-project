import { useState, useRef, useEffect } from 'react'
import { useGame } from './hooks/useGame'
import { Board } from './components/Board'
import { HoldPiece } from './components/HoldPiece'
import { NextPieces } from './components/NextPieces'
import { lockPiece } from './game/gameController'
import { PIECE_COLORS } from './constants'

const PREVIEW_CELL_SIZE = 8

export default function App() {
  const { gameState, placements } = useGame()
  const [aiHighlightCells, setAiHighlightCells] = useState<[number, number][] | null>(null)
  // ミノが設置されたら（盤面の埋まりセル数が変化したら）ハイライトを消す
  const prevFilledRef = useRef(0)
  useEffect(() => {
    if (!gameState) return
    const filled = gameState.board.flat().filter(c => c !== 0).length
    if (filled !== prevFilledRef.current) {
      prevFilledRef.current = filled
      setAiHighlightCells(null)
    }
  }, [gameState])

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
      }}
    >
      {/* Left panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <HoldPiece holdPieceShape={gameState.hold_piece_shape} />
        <div>
          <div style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>SCORE</div>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>
            {gameState.score}
          </div>
        </div>
        <div style={{ color: '#444', fontSize: 11, lineHeight: 2 }}>
          <div>A ← Left</div>
          <div>D → Right</div>
          <div>W ↓ Soft drop</div>
          <div>S ⇩ Hard drop</div>
          <div>J ↻ CW rotate</div>
          <div>L ↺ CCW rotate</div>
          <div>I ↕ 180 rotate</div>
          <div>K ⊟ Hold</div>
          <div>R 🔄 Restart</div>
          <div>G 🔍 Show placements</div>
        </div>
      </div>

      {/* Board */}
      <div style={{ position: 'relative' }}>
        <Board gameState={gameState} aiHighlightCells={aiHighlightCells} />
        {gameState.game_over && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.78)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold', letterSpacing: 4 }}>
              GAME OVER
            </div>
            <div style={{ color: '#aaa', fontSize: 16 }}>Score: {gameState.score}</div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ paddingTop: 4 }}>
        <NextPieces nextPieces={gameState.next_pieces} />
      </div>

      {/* Placements panel（Gキーで探索結果を表示） */}
      <div style={{ paddingTop: 4, width: 260 }}>
        <div style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
          PLACEMENTS
        </div>
        {placements === null ? (
          <div style={{ color: '#333', fontSize: 11 }}>
            「G」を押すと、現在のミノの置ける場所を全部表示します
          </div>
        ) : (
          <>
            <div style={{ color: 'white', fontSize: 12, marginBottom: 8 }}>
              {placements.length} 通り見つかりました
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                maxHeight: 600,
                overflowY: 'auto',
              }}
            >
              {placements.map((placement, i) => {
                const locked = lockPiece(placement)
                return (
                  <div key={i} style={{ border: '1px solid #333' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(10, ${PREVIEW_CELL_SIZE}px)`,
                      }}
                    >
                      {locked.board.map((row, y) =>
                        row.map((cell, x) => (
                          <div
                            key={`${y}-${x}`}
                            style={{
                              width: PREVIEW_CELL_SIZE,
                              height: PREVIEW_CELL_SIZE,
                              backgroundColor: cell ? (PIECE_COLORS[cell as string] ?? '#888') : '#111',
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}