import { TFile } from 'obsidian';
import { Card } from "./card";
import { NewCardSearch } from "./cardSearch";
// Update organized cards when cards are updated
// Update card when file is updated
export interface CardsWatcher {
	getLiveCard(id: string): Promise<Card | undefined>
}

export function NewCardsWatch(cards: Card[]): CardsWatcher {
	return new defaultCardsWatcher(cards)
}

class defaultCardsWatcher implements CardsWatcher {
	private cardMapByNote: Map<string, Map<string, Card>>;
	async getLiveCard(id: string): Promise<Card | undefined> {
		let card = this.findCardByID(id)
		if (!card) {
			return
		}
		await this.researchFile(card.note)
		card = this.findCardByID(id)
		if (!card) {
			return
		}
		return card
	}
	findCardByID(id:string) {
		for (let [file, cards] of this.cardMapByNote) {
			let card = cards.get(id)
			if (card) {
				return card
			}
		}
	}
	// Record all cards first
	constructor(cards: Card[]) {
		this.cardMapByNote = new Map
		this.addCards(cards)
	}
	private addCards(cards: Card[]): void {
		for (let card of cards) {
			let cardsMap = this.cardMapByNote.get(card.note.path)
			if (!cardsMap) {
				this.cardMapByNote.set(card.note.path, new Map)
			}
			this.cardMapByNote.get(card.note.path)?.set(card.ID, card)
		}
	}
	// Update a card for a file
	private async researchFile(file: TFile): Promise<number> {
		let cardsMap = this.cardMapByNote.get(file.path)
		if (cardsMap) {
			cardsMap.clear()
			let search = NewCardSearch()
			let result = await search.search(file)
			this.addCards(result.AllCard)
			return result.AllCard.length
		}
		return 0
	}
}
