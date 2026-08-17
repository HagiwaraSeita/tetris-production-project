import { useState, useEffect, useRef, useCallback } from 'react'
import { GameState } from '../game/gameState'
import { getAllValidPlacements } from '../game/placementSolver'
import {
  moveLeft,
  moveRight,
  moveDown,
  hardDrop,
  hold,
  rotateClockwise,
  rotateCounterClockwise,
  rotate180,
  restart,
} from '../game/gameController'

const KEY_MAP: Record<string, string> = {
  a: 'move_left',
  d: 'move_right',
  w: 'move_down',
  s: 'hard_drop',
  k: 'hold',
  l: 'rotate_counterclockwise',
  j: 'rotate_clockwise',
  i: 'rotate_180',
  r: 'restart',
}

// action文字列 -> gameController.tsの関数、への対応表
const ACTION_MAP: Record<string, (state: GameState) => GameState | null> = {
  move_left: moveLeft,
  move_right: moveRight,
  move_down: moveDown,
  hard_drop: hardDrop,
  hold: hold,
  rotate_clockwise: rotateClockwise,
  rotate_counterclockwise: rotateCounterClockwise,
  rotate_180: rotate180,
}

// 長押しリピートを有効にするアクション
const DAS_ACTIONS = new Set(['move_left', 'move_right', 'move_down'])
const DAS_FRAMES = 6  // 長押し開始までのフレーム数

export function useGame() {
  const [gameState, setGameState] = useState<GameState>(() => restart())
  const [placements, setPlacements] = useState<GameState[] | null>(null)
  // action -> 押し始めてからのフレーム数
  const held = useRef<Map<string, number>>(new Map())
  const rafRef = useRef<number>(0)

  const sendAction = useCallback((action: string) => {
    if (action === 'restart') {
      setGameState(restart())
      setPlacements(null)  // リスタートしたら探索結果はリセットする
      return
    }

    const fn = ACTION_MAP[action]
    if (!fn) return

    setGameState((prev) => {
      const next = fn(prev)
      return next ?? prev  // 失敗(null)なら元の状態を維持
    })
  }, [])

  // DAS: 毎フレーム held を走査し、DAS_FRAMES 経過後は毎フレーム実行
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

      if (e.key === 'g') {
        e.preventDefault()
        setPlacements((prev) => (prev ? null : getAllValidPlacements(gameState)))
        return
      }

      const action = KEY_MAP[e.key]
      if (!action) return
      e.preventDefault()
      sendAction(action)  // 最初の押下は即時実行
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
  }, [sendAction, gameState])

  return { gameState, sendAction, placements }
}