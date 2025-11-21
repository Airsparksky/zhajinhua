import { Card, Rank, Suit, HandType, HandEvaluation } from '../types';

export const INITIAL_CHIPS = 1000000;
export const ANTE = 1000;
export const MIN_RAISE = 1000;

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  const suits = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 14=A

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank: rank as Rank,
        id: `${suit}-${rank}-${Math.random()}`
      });
    }
  }
  return shuffle(deck);
};

const shuffle = (array: Card[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// Evaluate a hand of 3 cards
export const evaluateHand = (cards: Card[]): HandEvaluation => {
  if (cards.length !== 3) return { type: HandType.HIGH_CARD, value: 0, label: 'Invalid' };

  // Sort by rank descending
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const isFlush = cards.every(c => c.suit === cards[0].suit);
  
  // Check for Leopard (Three of a kind)
  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
    return { type: HandType.LEOPARD, value: ranks[0], label: 'Leopard' };
  }

  // Check for Straight
  // Special case: A-2-3 is INVALID per rules (treated as High Card/Flush)
  // Valid straights: 3-4-5 up to Q-K-A
  let isStraight = false;
  if ((ranks[0] - ranks[1] === 1) && (ranks[1] - ranks[2] === 1)) {
    isStraight = true;
  }
  // A-K-Q (14, 13, 12) is valid. 
  
  // Check special 2-3-5 mixed suit (The Killer)
  // Per rules: 235 > Leopard, but smallest otherwise.
  // It is only "Special 235" if it is NOT a flush.
  const is235 = ranks.includes(2) && ranks.includes(3) && ranks.includes(5);

  if (is235 && !isFlush) {
    return { type: HandType.SPECIAL_235, value: 0, label: 'Special 2-3-5' };
  }

  if (isFlush && isStraight) {
    return { type: HandType.STRAIGHT_FLUSH, value: ranks[0], label: 'Straight Flush' };
  }

  if (isFlush) {
    // Value is weighted sum to compare flushes: High*10000 + Mid*100 + Low
    const val = ranks[0] * 10000 + ranks[1] * 100 + ranks[2];
    return { type: HandType.FLUSH, value: val, label: 'Flush' };
  }

  if (isStraight) {
     return { type: HandType.STRAIGHT, value: ranks[0], label: 'Straight' };
  }

  // Pair
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]) {
    let pairRank = 0;
    let kicker = 0;
    if (ranks[0] === ranks[1]) { pairRank = ranks[0]; kicker = ranks[2]; }
    else if (ranks[1] === ranks[2]) { pairRank = ranks[1]; kicker = ranks[0]; }
    else { pairRank = ranks[0]; kicker = ranks[1]; }
    
    // Value: Pair*100 + Kicker
    return { type: HandType.PAIR, value: pairRank * 100 + kicker, label: 'Pair' };
  }

  // High Card
  const val = ranks[0] * 10000 + ranks[1] * 100 + ranks[2];
  return { type: HandType.HIGH_CARD, value: val, label: 'High Card' };
};

/**
 * Returns true if Hand A beats Hand B.
 * Returns false if B beats A or Tie (Tie is rare, usually handled as active player loses or split, but simplified here to challenger loses on tie for simplicity or simple strict > check).
 */
export const compareHands = (cardsA: Card[], cardsB: Card[]): boolean => {
  const evA = evaluateHand(cardsA);
  const evB = evaluateHand(cardsB);

  // Special 235 Rule
  if (evA.type === HandType.SPECIAL_235 && evB.type === HandType.LEOPARD) return true;
  if (evB.type === HandType.SPECIAL_235 && evA.type === HandType.LEOPARD) return false;
  
  // Special 235 is otherwise the smallest hand (handled by Enum order if we were careful, but let's be explicit)
  // Enum order defined above: 235, Leopard, SF, F, S, P, HC.
  // Wait, Typescript Enums are 0-indexed strings or numbers. Let's use a explicit strength map.
  
  const strengthMap: Record<HandType, number> = {
    [HandType.SPECIAL_235]: 0, // Lowest generally
    [HandType.HIGH_CARD]: 1,
    [HandType.PAIR]: 2,
    [HandType.STRAIGHT]: 3,
    [HandType.FLUSH]: 4,
    [HandType.STRAIGHT_FLUSH]: 5,
    [HandType.LEOPARD]: 6,
  };

  // Re-check Special 235 Logic
  // If one is 235 and the other is NOT leopard, 235 loses to everything (it has strength 0).
  // If both are 235 (highly unlikely with 1 deck but possible if distinct suits), it's a tie/high card comparison? 
  // Actually with 1 deck, unique ranks, mixed suits 235 vs mixed suits 235 is impossible to have same ranks.
  
  if (strengthMap[evA.type] > strengthMap[evB.type]) return true;
  if (strengthMap[evA.type] < strengthMap[evB.type]) return false;

  // Same type
  return evA.value > evB.value;
};

// Bot Logic
export const getBotDecision = (
  cards: Card[], 
  currentBetPrice: number, 
  currentPot: number,
  roundCount: number
): 'FOLD' | 'CALL' | 'RAISE' | 'COMPARE' => {
  const evaluation = evaluateHand(cards);
  
  // Randomness factor (Bravery)
  const bravery = Math.random(); 

  // Very bad hand
  if (evaluation.type === HandType.SPECIAL_235 || (evaluation.type === HandType.HIGH_CARD && evaluation.value < 100000)) { // Low high card
    // Bluff chance
    if (bravery > 0.9 && roundCount < 3) return 'RAISE';
    if (bravery > 0.7 && currentBetPrice <= 2000) return 'CALL';
    return 'FOLD';
  }

  // Medium hand (High Card Ace/King, Pair)
  if (evaluation.type === HandType.PAIR || evaluation.type === HandType.HIGH_CARD) {
    if (currentBetPrice > 5000 && bravery < 0.4) return 'FOLD';
    if (bravery > 0.8) return 'RAISE';
    // If round count is high, try to compare to eliminate players
    if (roundCount > 5 && bravery > 0.5) return 'COMPARE';
    return 'CALL';
  }

  // Strong hand
  if (evaluation.type === HandType.FLUSH || evaluation.type === HandType.STRAIGHT) {
    if (bravery > 0.3) return 'RAISE';
    return 'CALL';
  }

  // God hand
  return 'RAISE';
};
