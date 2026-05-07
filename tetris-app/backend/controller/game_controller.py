import random
from model.pieces import PIECES, MINOS, SRS_JLSTZ, SRS_I, GRID_WIDTH, GRID_HEIGHT, NUM_NEXT_PIECES
from model.game_state import GameState


class GameController:
    def __init__(self):
        self.state = GameState()
        self._refill_next()
        self._pop_next_piece()

    # --- internal helpers ---

    def _refill_next(self):
        if len(self.state.next_pieces) <= NUM_NEXT_PIECES:
            bag = list(PIECES)
            random.shuffle(bag)
            self.state.next_pieces += bag

    def _pop_next_piece(self):
        self._refill_next()
        self.state.rot = 0
        self.state.current_piece_shape = self.state.next_pieces.pop(0)
        self.state.current_piece = MINOS[self.state.current_piece_shape][0]
        self.state.current_piece_position = [0, GRID_WIDTH // 2 - 2]
        self._update_ghost()
        if not self._is_valid_position():
            self.state.game_over = True

    def _is_valid_position(self, piece=None, pos=None):
        if piece is None:
            piece = self.state.current_piece
        if pos is None:
            pos = self.state.current_piece_position
        for y, row in enumerate(piece):
            for x, cell in enumerate(row):
                if cell:
                    nx = pos[1] + x
                    ny = pos[0] + y
                    if nx < 0 or nx >= GRID_WIDTH or ny >= GRID_HEIGHT:
                        return False
                    if ny >= 0 and self.state.board[ny][nx]:
                        return False
        return True

    def _update_ghost(self):
        pos = self.state.current_piece_position[:]
        while self._is_valid_position(self.state.current_piece, pos):
            pos[0] += 1
        pos[0] -= 1
        self.state.ghost_position = pos

    def _lock_piece(self):
        shape = self.state.current_piece_shape
        pos = self.state.current_piece_position
        for y, row in enumerate(self.state.current_piece):
            for x, cell in enumerate(row):
                if cell:
                    self.state.board[pos[0] + y][pos[1] + x] = shape

    def _clear_lines(self):
        new_board = [row for row in self.state.board if any(cell == 0 for cell in row)]
        cleared = GRID_HEIGHT - len(new_board)
        self.state.board = [[0] * GRID_WIDTH for _ in range(cleared)] + new_board
        self.state.score += cleared * 100

    def _try_rotate(self, new_rot: int):
        shape = self.state.current_piece_shape
        if shape == 'O':
            self.state.rot = new_rot
            return

        kicks = (SRS_I if shape == 'I' else SRS_JLSTZ).get(
            (self.state.rot, new_rot), [(0, 0)]
        )
        new_piece = MINOS[shape][new_rot]
        old_pos = self.state.current_piece_position[:]

        for dx, dy in kicks:
            test_pos = [old_pos[0] - dy, old_pos[1] + dx]
            if self._is_valid_position(new_piece, test_pos):
                self.state.current_piece = new_piece
                self.state.current_piece_position = test_pos
                self.state.rot = new_rot
                self._update_ghost()
                return

    # --- public actions ---

    def move_left(self):
        self.state.current_piece_position[1] -= 1
        if not self._is_valid_position():
            self.state.current_piece_position[1] += 1
        else:
            self._update_ghost()

    def move_right(self):
        self.state.current_piece_position[1] += 1
        if not self._is_valid_position():
            self.state.current_piece_position[1] -= 1
        else:
            self._update_ghost()

    def move_down(self):
        self.state.current_piece_position[0] += 1
        if not self._is_valid_position():
            self.state.current_piece_position[0] -= 1
            self._lock_piece()
            self._clear_lines()
            self._pop_next_piece()

    def hard_drop(self):
        self.state.current_piece_position = self.state.ghost_position[:]
        self._lock_piece()
        self._clear_lines()
        self._pop_next_piece()

    def hold(self):
        if self.state.hold_piece_shape is None:
            self.state.hold_piece_shape = self.state.current_piece_shape
            self._pop_next_piece()
        else:
            self.state.current_piece_shape, self.state.hold_piece_shape = (
                self.state.hold_piece_shape,
                self.state.current_piece_shape,
            )
            self.state.rot = 0
            self.state.current_piece = MINOS[self.state.current_piece_shape][0]
            self.state.current_piece_position = [0, GRID_WIDTH // 2 - 2]
            self._update_ghost()

    def rotate_clockwise(self):
        self._try_rotate((self.state.rot + 1) % 4)

    def rotate_counterclockwise(self):
        self._try_rotate((self.state.rot - 1) % 4)

    def gravity_tick(self):
        self.move_down()

    def get_state(self) -> dict:
        return self.state.to_dict()
