import tkinter as tk
import random

# グリッドのサイズ
GRID_WIDTH = 10
GRID_HEIGHT = 20
CELL_SIZE = 30
NUM_NEXT_PIECES = 5

PIECES = ['T', 'O', 'I', 'Z', 'S', 'J', 'L']

# SRS wall kick data: (from_rot, to_rot) -> list of (dx, dy) offsets
# dy is positive-upward (wiki convention); applied as position[0] -= dy in code
SRS_JLSTZ = {
    (0, 1): [(0, 0), (-1, 0), (-1,  1), (0, -2), (-1, -2)],
    (1, 0): [(0, 0), ( 1, 0), ( 1, -1), (0,  2), ( 1,  2)],
    (1, 2): [(0, 0), ( 1, 0), ( 1, -1), (0,  2), ( 1,  2)],
    (2, 1): [(0, 0), (-1, 0), (-1,  1), (0, -2), (-1, -2)],
    (2, 3): [(0, 0), ( 1, 0), ( 1,  1), (0, -2), ( 1, -2)],
    (3, 2): [(0, 0), (-1, 0), (-1, -1), (0,  2), (-1,  2)],
    (3, 0): [(0, 0), (-1, 0), (-1, -1), (0,  2), (-1,  2)],
    (0, 3): [(0, 0), ( 1, 0), ( 1,  1), (0, -2), ( 1, -2)],
}

SRS_I = {
    (0, 1): [(0, 0), (-2, 0), ( 1, 0), (-2, -1), ( 1,  2)],
    (1, 0): [(0, 0), ( 2, 0), (-1, 0), ( 2,  1), (-1, -2)],
    (1, 2): [(0, 0), (-1, 0), ( 2, 0), (-1,  2), ( 2, -1)],
    (2, 1): [(0, 0), ( 1, 0), (-2, 0), ( 1, -2), (-2,  1)],
    (2, 3): [(0, 0), ( 2, 0), (-1, 0), ( 2,  1), (-1, -2)],
    (3, 2): [(0, 0), (-2, 0), ( 1, 0), (-2, -1), ( 1,  2)],
    (3, 0): [(0, 0), ( 1, 0), (-2, 0), ( 1, -2), (-2,  1)],
    (0, 3): [(0, 0), (-1, 0), ( 2, 0), (-1,  2), ( 2, -1)],
}

MINOS = {
    "T": [
        [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
        [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
        [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    ],
    "O": [
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    ],
    "I": [
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
        [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
        [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    ],
    "Z": [
        [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
        [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
        [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    ],
    "S": [
        [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
        [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
        [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
        [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    ],
    "J": [
        [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
        [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
        [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    ],
    "L": [
        [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
        [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
        [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
        [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    ],
}

class TetrisGame:
    def __init__(self, root):
        self.root = root
        self.canvas = tk.Canvas(root, width=GRID_WIDTH * CELL_SIZE, height=GRID_HEIGHT * CELL_SIZE)
        self.canvas.pack()

        self.board = [[0] * GRID_WIDTH for _ in range(GRID_HEIGHT)]
        self.current_piece = None
        self.rot = 0
        self.next_pieces = []
        self.hold_piece = None
        self.current_piece_shape = None
        self.hold_piece_shape = None

        self.hold_canvas = tk.Canvas(root, width=3 * CELL_SIZE, height=CELL_SIZE * 4)
        self.hold_canvas.pack(side=tk.RIGHT)
        self.next_canvas = tk.Canvas(root, width=3 * CELL_SIZE, height=CELL_SIZE * 5)
        self.next_canvas.pack(side=tk.RIGHT)


        self.pop_next_piece()
        self.update()

        self.root.bind("<Key-a>", self.move_left)
        self.root.bind("<Key-d>", self.move_right)
        self.root.bind("<Key-w>", self.move_down)
        self.root.bind("<Key-s>", self.hard_drop)
        self.root.bind("<Key-k>", self.hold)
        self.root.bind("<Key-l>", self.rotate_counterclockwise)
        self.root.bind("<Key-j>", self.rotate_clockwise)

    def pop_next_piece(self):
        """足りなければnextに新たなピースを補充"""
        if(len(self.next_pieces) <= NUM_NEXT_PIECES):
            random.shuffle(PIECES)
            self.next_pieces += PIECES

        self.rot = 0
        self.current_piece_shape = self.next_pieces.pop(0)
        self.current_piece = MINOS[self.current_piece_shape][self.rot]

        self.current_piece_position = [0, GRID_WIDTH // 2 - len(self.current_piece[0]) // 2]

    def move_left(self, event):
        """ピースを左に移動"""
        self.current_piece_position[1] -= 1
        if not self.is_valid_position():
            self.current_piece_position[1] += 1

    def move_right(self, event):
        """ピースを右に移動"""
        self.current_piece_position[1] += 1
        if not self.is_valid_position():
            self.current_piece_position[1] -= 1

    def move_down(self, event=None):
        """ピースを下に移動"""
        self.current_piece_position[0] += 1
        if not self.is_valid_position():
            self.current_piece_position[0] -= 1
            self.lock_piece()
            self.clear_lines()
            self.pop_next_piece()

    def hard_drop(self, event=None):
        """ピースを一番下に移動"""

        while self.is_valid_position():
            self.current_piece_position[0] += 1
        self.current_piece_position[0] -= 1
        self.lock_piece()
        self.clear_lines()
        self.pop_next_piece()

    def hold(self, event):
        """ピースをホールドと入れ替え"""
        if self.hold_piece is None:
            self.hold_piece = self.current_piece
            self.hold_piece_shape = self.current_piece_shape
            self.pop_next_piece()
        else:
            temp_piece = self.hold_piece
            self.hold_piece = self.current_piece
            self.current_piece = temp_piece
            temp_piece_shape = self.hold_piece_shape
            self.hold_piece_shape = self.current_piece_shape
            self.current_piece_shape = temp_piece_shape
            self.current_piece_position = [0, GRID_WIDTH // 2 - len(self.current_piece[0]) // 2]
    
    def rotate_counterclockwise(self, event):
        """反時計回りに回転"""
        self._try_rotate((self.rot - 1) % 4)

    def rotate_clockwise(self, event):
        """時計回りに回転"""
        self._try_rotate((self.rot + 1) % 4)

    def _try_rotate(self, new_rot):
        if self.current_piece_shape == 'O':
            self.rot = new_rot
            return

        if self.current_piece_shape == 'I':
            kicks = SRS_I.get((self.rot, new_rot), [(0, 0)])
        else:
            kicks = SRS_JLSTZ.get((self.rot, new_rot), [(0, 0)])

        old_piece = self.current_piece
        old_pos = self.current_piece_position[:]
        self.current_piece = MINOS[self.current_piece_shape][new_rot]

        for dx, dy in kicks:
            self.current_piece_position[0] = old_pos[0] - dy  # dy is positive-up; screen y is positive-down
            self.current_piece_position[1] = old_pos[1] + dx
            if self.is_valid_position():
                self.rot = new_rot
                return

        self.current_piece = old_piece
        self.current_piece_position = old_pos



    def is_valid_position(self):
        """ピースが有効な位置にあるかどうかを確認"""
        for y, row in enumerate(self.current_piece):
            for x, cell in enumerate(row):
                if cell:
                    new_x = self.current_piece_position[1] + x
                    new_y = self.current_piece_position[0] + y
                    if new_x < 0 or new_x >= GRID_WIDTH or new_y >= GRID_HEIGHT:
                        return False
                    if new_y >= 0 and self.board[new_y][new_x]:
                        return False
        return True

    def lock_piece(self):
        """現在のピースを盤面に固定"""
        for y, row in enumerate(self.current_piece):
            for x, cell in enumerate(row):
                if cell:
                    self.board[self.current_piece_position[0] + y][self.current_piece_position[1] + x] = 1

    def clear_lines(self):
        """ラインをクリアし、スコアを増やす"""
        new_board = [row for row in self.board if any(cell == 0 for cell in row)]
        lines_cleared = GRID_HEIGHT - len(new_board)
        self.board = [[0] * GRID_WIDTH for _ in range(lines_cleared)] + new_board

    def draw_board(self):
        """盤面と現在のピースを描画"""
        self.canvas.delete("all")

        # 背景を黒に設定
        self.canvas.create_rectangle(0, 0, GRID_WIDTH * CELL_SIZE , GRID_HEIGHT * CELL_SIZE, fill="black")

        # 格子の描画
        for x in range(GRID_WIDTH):
            for y in range(GRID_HEIGHT):
                self.canvas.create_rectangle(
                    x * CELL_SIZE, y * CELL_SIZE, (x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE,
                    outline="gray"  # 格子線の色をグレーに設定
                )

        # 固定されたブロックを青で描画
        for y, row in enumerate(self.board):
            for x, cell in enumerate(row):
                if cell:
                    self.draw_cell(x, y, "blue")

        # 現在のピースを赤で描画
        if not self.current_piece == None:
            for y, row in enumerate(self.current_piece):
                for x, cell in enumerate(row):
                    if cell:
                        self.draw_cell(self.current_piece_position[1] + x, self.current_piece_position[0] + y, "red")
        # ホールドピースの描画
        self.draw_hold_piece()
    
        # 次のピースの描画
        self.draw_next_pieces()

    def draw_cell(self, x, y, color):
        """1マスを描画"""
        self.canvas.create_rectangle(
            x * CELL_SIZE, y * CELL_SIZE, (x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE, fill=color, outline="gray"
        )

    def draw_hold_piece(self):
        self.hold_canvas.delete("all")
        if self.hold_piece is not None:
            for y, row in enumerate(self.hold_piece):
                for x, cell in enumerate(row):
                    if cell:
                        self.draw_cell_in_canvas(self.hold_canvas, x, y, "green")

    def draw_next_pieces(self):
        self.next_canvas.delete("all")
        for i in range(min(NUM_NEXT_PIECES, len(self.next_pieces))):
            piece_shape = self.next_pieces[i]
            piece = MINOS[piece_shape][0]
            for y, row in enumerate(piece):
                for x, cell in enumerate(row):
                    if cell:
                        self.draw_cell_in_canvas(self.next_canvas, x, y + i * 2, "yellow")

    def draw_cell_in_canvas(self, canvas, x, y, color):
        canvas.create_rectangle(
            x * CELL_SIZE, y * CELL_SIZE, (x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE, fill=color, outline="gray"
        )

    
    def update(self):
        """ゲームの更新処理"""
        #self.move_down()
        self.draw_board()
        self.root.after(16, self.update)



# メインプログラム
if __name__ == "__main__":
    root = tk.Tk()
    root.title("Tetris with Tkinter")
    game = TetrisGame(root)
    root.mainloop()
