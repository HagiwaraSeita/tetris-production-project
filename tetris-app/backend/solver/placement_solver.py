from model.pieces import MINOS, GRID_WIDTH, GRID_HEIGHT

# ヒューリスティック重み
W_HEIGHT    = -0.510066
W_LINES     = +0.760666   # LINE_SCORE に乗算
W_HOLES     = -0.720000   # 穴ペナルティ強化（テトリス狙い時の穴生成を抑制）
W_BUMPINESS = -0.184483

# 消去ライン数 → スコア倍率（1:2:3:10）
LINE_SCORE = {0: 0, 1: 1, 2: 2, 3: 3, 4: 10}


def _is_valid(piece, pos, board):
    for y, row in enumerate(piece):
        for x, cell in enumerate(row):
            if cell:
                nx, ny = pos[1] + x, pos[0] + y
                if nx < 0 or nx >= GRID_WIDTH or ny >= GRID_HEIGHT:
                    return False
                if ny >= 0 and board[ny][nx]:
                    return False
    return True


def _drop(piece, col, board):
    """指定した列にピースを落とした最終位置を返す。置けない場合は None"""
    pos = [0, col]
    if not _is_valid(piece, pos, board):
        return None
    while _is_valid(piece, [pos[0] + 1, pos[1]], board):
        pos[0] += 1
    return pos[:]


def _place_and_clear(board, piece, pos, shape):
    """ピースを設置してライン消去した盤面と消去ライン数を返す"""
    new_board = [list(row) for row in board]
    for y, row in enumerate(piece):
        for x, cell in enumerate(row):
            if cell:
                ny, nx = pos[0] + y, pos[1] + x
                if 0 <= ny < GRID_HEIGHT and 0 <= nx < GRID_WIDTH:
                    new_board[ny][nx] = shape
    filled = [row for row in new_board if all(c != 0 for c in row)]
    lines = len(filled)
    rest = [row for row in new_board if any(c == 0 for c in row)]
    return [[0] * GRID_WIDTH for _ in range(lines)] + rest, lines


def _column_heights(board):
    heights = []
    for col in range(GRID_WIDTH):
        h = 0
        for row in range(GRID_HEIGHT):
            if board[row][col]:
                h = GRID_HEIGHT - row
                break
        heights.append(h)
    return heights


def _count_holes(board):
    holes = 0
    for col in range(GRID_WIDTH):
        found = False
        for row in range(GRID_HEIGHT):
            if board[row][col]:
                found = True
            elif found:
                holes += 1
    return holes


def _evaluate(board, lines_cleared):
    heights = _column_heights(board)
    agg_height = sum(heights)
    holes = _count_holes(board)
    bumpiness = sum(abs(heights[i] - heights[i + 1]) for i in range(len(heights) - 1))
    score = (
        W_HEIGHT    * agg_height
        + W_LINES   * LINE_SCORE[lines_cleared]
        + W_HOLES   * holes
        + W_BUMPINESS * bumpiness
    )
    return {
        "score":            round(score, 2),
        "lines_cleared":    lines_cleared,
        "holes":            holes,
        "bumpiness":        bumpiness,
        "aggregate_height": agg_height,
    }


def board_to_text(board):
    """盤面をASCIIで返す（列番号ヘッダー付き）"""
    header = "1234567890"
    rows = ["".join(str(c)[0] if c else "." for c in row) for row in board]
    return header + "\n" + "\n".join(rows)


def _placements_for_shape(board, shape):
    """指定したshapeの全配置候補を列挙する"""
    seen = set()
    placements = []
    for rot in range(4):
        piece = MINOS[shape][rot]
        for col in range(-1, GRID_WIDTH):
            pos = _drop(piece, col, board)
            if pos is None:
                continue
            key = (rot, pos[0], pos[1])
            if key in seen:
                continue
            seen.add(key)
            new_board, lines = _place_and_clear(board, piece, pos, shape)
            features = _evaluate(new_board, lines)
            cells = [
                [pos[0] + y, pos[1] + x]
                for y, row in enumerate(piece)
                for x, cell in enumerate(row)
                if cell
            ]
            placements.append({
                **features,
                "rot": rot,
                "col": pos[1] + 1,
                "cells": cells,
                "board_after": board_to_text(new_board),
            })
    return placements


def get_top_placements(board, shape, hold_shape=None, top_n=5):
    """
    現在のミノ（およびホールドのミノ）を置ける全パターンを探索し、スコア上位を返す。
    use_hold=True のエントリはホールドキーを押してから設置することを意味する。
    """
    placements = []
    for p in _placements_for_shape(board, shape):
        placements.append({**p, "use_hold": False})
    if hold_shape:
        for p in _placements_for_shape(board, hold_shape):
            placements.append({**p, "use_hold": True})
    placements.sort(key=lambda p: p["score"], reverse=True)
    return placements[:top_n]
