import React, { useState } from 'react';
import { ObsidianAdapterContext, ObsidianAdapterContextType, useObsidian } from './obsidian-context';
import { Deck, loadDecks, LoadingError, RepeatItem } from './model';
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
  const [allRepeatItems, setAllRepeatItems] = useState<RepeatItem[] | 'loading'>('loading');
  const [errors, setErrors] = useState<LoadingError[] | 'loading'>('loading');
  const [decks, setDecks] = useState<Deck[] | 'loading'>('loading');
  const [selectedDeck, setSelectedDeck] = useState<Deck>();
  const obsidian = useObsidian();

  useAsyncEffect(
    async ({ wrap }) => {
      const loaded = await wrap(loadDecks(obsidian, { deckTagPrefix: 'flashcards' }));
      setAllRepeatItems(loaded.items);
      setErrors(loaded.errors);
    },
    [obsidian]
  );

  if (allRepeatItems === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="markdown-preview-view markdown-rendered is-readable-line-width allow-fold-headings">
      <div className="markdown-preview-sizer markdown-preview-section">
        {selectedDeck ? (
          <DeckReviewComponent deck={selectedDeck} />
        ) : (
          <OverviewComponent decks={allRepeatItems} onDeckSelected={(d) => setSelectedDeck(d)} />
        )}
        {errors !== 'loading' && errors.length > 0 && (
          <>
            <div>Some errors occurred!</div>
            {errors.map((x) => (
              <div>
                {x.file.basename}@{x.start}:{x.end}: {x.message}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
