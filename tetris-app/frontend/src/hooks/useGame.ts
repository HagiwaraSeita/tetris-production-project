import { useState, useEffect, useRef, useCallback } from 'react'

export interface GameState {
  board: (string | 0)[][]
  current_piece_shape: string
  current_piece: number[][]
  current_piece_position: [number, number]
  ghost_position: [number, number]
  rot: number
  next_pieces: string[]
  hold_piece_shape: string | null
  score: number
  game_over: boolean
}

const KEY_MAP: Record<string, string> = {
  a: 'move_left',
  d: 'move_right',
  w: 'move_down',
  s: 'hard_drop',
  k: 'hold',
  l: 'rotate_counterclockwise',
  j: 'rotate_clockwise',
}

export function useGame(wsUrl: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    const socket = new WebSocket(wsUrl)
    ws.current = socket
    socket.onmessage = (e) => setGameState(JSON.parse(e.data) as GameState)
    return () => socket.close()
  }, [wsUrl])

  const sendAction = useCallback((action: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action }))
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key]
      if (action) {
        e.preventDefault()
        sendAction(action)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sendAction])

  return { gameState, sendAction }
}
