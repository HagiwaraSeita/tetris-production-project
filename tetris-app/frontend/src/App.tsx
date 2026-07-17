import { useState, useRef, useEffect } from 'react'
import { useGame } from './hooks/useGame'
import { Board } from './components/Board'
import { Chat } from './components/Chat'
import { HoldPiece } from './components/HoldPiece'
import { NextPieces } from './components/NextPieces'

export default function App() {
  const { gameState } = useGame('ws://localhost:8000/ws')
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

  if (!gameState) {
    return (
      <div
        style={{
          color: '#aaa',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        Connecting...
      </div>
    )
  }

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

      {/* Chat panel */}
      <div style={{ paddingTop: 4 }}>
        <Chat gameState={gameState} onAIPlacement={setAiHighlightCells} />
      </div>
    </div>
  )
}
