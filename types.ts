export enum Suit {
  HEARTS = '♥',
  DIAMONDS = '♦',
  CLUBS = '♣',
  SPADES = '♠',
}

export enum Rank {
  TWO = 2, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique id for keys
}

export enum HandType {
  SPECIAL_235 = 'SPECIAL_235', // Wins against Leopard, loses to everything else
  LEOPARD = 'LEOPARD', // Three of a kind
  STRAIGHT_FLUSH = 'STRAIGHT_FLUSH',
  FLUSH = 'FLUSH',
  STRAIGHT = 'STRAIGHT',
  PAIR = 'PAIR',
  HIGH_CARD = 'HIGH_CARD',
}

export interface HandEvaluation {
  type: HandType;
  value: number; // A numeric score for tie-breaking within same type
  label: string;
}

export enum PlayerStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FOLDED = 'FOLDED',
  LOST = 'LOST', // Lost in a comparison
  WON = 'WON',
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  chips: number;
  cards: Card[];
  hasSeenCards: boolean;
  status: PlayerStatus;
  currentBet: number; // Bet in the current round
  isDealer: boolean;
  avatar: string;
  lastAction?: string; // e.g., "+1000", "Check", "Fold"
  lastActionType?: 'positive' | 'negative' | 'neutral';
  peerId?: string; // For multiplayer
}

export enum GamePhase {
  IDLE = 'IDLE',
  DEALING = 'DEALING',
  BETTING = 'BETTING',
  COMPARING = 'COMPARING', // Selecting a player to compare with
  RESOLVING = 'RESOLVING', // Animation playing (Compare/Showdown)
  SHOWDOWN = 'SHOWDOWN', // End of game
}

export interface GameLog {
  id: string;
  message: string;
}

// --- Networking Types ---

export type NetworkMode = 'OFFLINE' | 'HOST' | 'CLIENT';

export type MessageType = 
  | 'JOIN' 
  | 'WELCOME' 
  | 'STATE_SYNC' 
  | 'ACTION' 
  | 'LOG';

export interface GameMessage {
  type: MessageType;
  payload?: any;
}

export interface ActionPayload {
  action: 'FOLD' | 'CALL' | 'RAISE' | 'ALL_IN' | 'SEE_CARDS' | 'COMPARE_INIT' | 'COMPARE_TARGET';
  playerId: number;
  amount?: number;
  targetId?: number;
}