import { Deck } from './model';
import * as React from 'react';

export function DeckReviewComponent({ deck }: { deck: Deck }) {
  return <div>{deck.name}</div>;
}
