import React, { useState } from 'react';
import { ObsidianAdapterContext, ObsidianAdapterContextType, useObsidian } from './obsidian-context';
import { Deck, loadDecks } from './model';
import { useAsyncEffect } from './hooks/useAsyncEffect';
import { DeckReviewComponent } from './DeckReviewComponent';
import { OverviewComponent } from './OverviewComponent';

export function TheApp({ obsidian }: { obsidian: ObsidianAdapterContextType }) {
  return (
    <ObsidianAdapterContext.Provider value={obsidian}>
      <ReviewManageComponent />
    </ObsidianAdapterContext.Provider>
  );
}

export function ReviewManageComponent() {
  const [decks, setDecks] = useState<Deck[] | 'loading'>('loading');
  const [selectedDeck, setSelectedDeck] = useState<Deck>();
  const obsidian = useObsidian();

  useAsyncEffect(
    async ({ wrap }) => {
      setDecks(await wrap(loadDecks(obsidian)));
    },
    [obsidian]
  );

  if (decks === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="markdown-preview-view markdown-rendered is-readable-line-width allow-fold-headings">
      <div className="markdown-preview-sizer markdown-preview-section">
        {selectedDeck ? (
          <DeckReviewComponent deck={selectedDeck} />
        ) : (
          <OverviewComponent decks={decks} onDeckSelected={(d) => setSelectedDeck(d)} />
        )}
      </div>
    </div>
  );
}
