import { Deck } from './model';
import React from 'react';
import { List, ListItem, ListItemButton } from '@mui/material';

export function OverviewComponent({ decks, onDeckSelected }: { decks: Deck[]; onDeckSelected: (deck: Deck) => void }) {
  return (
    <List component="nav" aria-label="mailbox folders">
      {decks.map((d) => (
        <ListItem>
          <ListItemButton onClick={() => onDeckSelected(d)}>{d.name}</ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
