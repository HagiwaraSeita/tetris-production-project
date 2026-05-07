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
  i: 'rotate_180',
}

// 長押しリピートを有効にするアクション
const DAS_ACTIONS = new Set(['move_left', 'move_right', 'move_down'])
const DAS_FRAMES = 6  // 長押し開始までのフレーム数

export function useGame(wsUrl: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const ws = useRef<WebSocket | null>(null)
  // action -> 押し始めてからのフレーム数
  const held = useRef<Map<string, number>>(new Map())
  const rafRef = useRef<number>(0)

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

  // DAS: 毎フレーム held を走査し、DAS_FRAMES 経過後は毎フレーム送信
  useEffect(() => {
    const tick = () => {
      const leftF = held.current.get('move_left')
      const rightF = held.current.get('move_right')

      // 両方押されているとき: フレーム数が少ない（より最近押した）ほうだけ動かす
      const skipLeft  = leftF !== undefined && rightF !== undefined && rightF < leftF
      const skipRight = leftF !== undefined && rightF !== undefined && leftF <= rightF

      held.current.forEach((frames, action) => {
        const skipped =
          (action === 'move_left'  && skipLeft) ||
          (action === 'move_right' && skipRight)
        if (!skipped && frames >= DAS_FRAMES) sendAction(action)
        held.current.set(action, frames + 1)
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [sendAction])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return  // ブラウザ側のキーリピートは使わない
      const action = KEY_MAP[e.key]
      if (!action) return
      e.preventDefault()
      sendAction(action)  // 最初の押下は即時送信
      if (DAS_ACTIONS.has(action)) {
        held.current.set(action, 0)  // DAS カウント開始
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key]
      if (action) held.current.delete(action)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [sendAction])

  return { gameState, sendAction }
}
