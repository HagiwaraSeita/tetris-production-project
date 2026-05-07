from dataclasses import dataclass, field
from typing import Optional, List, Any


@dataclass
class GameState:
    board: List[List[Any]] = field(
        default_factory=lambda: [[0] * 10 for _ in range(20)]
    )
    current_piece_shape: str = ""
    current_piece: List[List[int]] = field(default_factory=list)
    current_piece_position: List[int] = field(default_factory=lambda: [0, 0])
    ghost_position: List[int] = field(default_factory=lambda: [0, 0])
    rot: int = 0
    next_pieces: List[str] = field(default_factory=list)
    hold_piece_shape: Optional[str] = None
    score: int = 0
    game_over: bool = False

    def to_dict(self) -> dict:
        return {
            "board": self.board,
            "current_piece_shape": self.current_piece_shape,
            "current_piece": self.current_piece,
            "current_piece_position": self.current_piece_position,
            "ghost_position": self.ghost_position,
            "rot": self.rot,
            "next_pieces": self.next_pieces[:5],
            "hold_piece_shape": self.hold_piece_shape,
            "score": self.score,
            "game_over": self.game_over,
        }
