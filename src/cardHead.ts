export const CardIDTag = 'AOSR';

// Update the card ID of the first line of the card
export function UpdateCardIDTag(cardid: string, fileText: string, index: number): string {
  // let tag = " #" + CardIDTag + "/" + cardid
  const tag = ` #${CardIDTag}/${cardid} [[#^${cardid}]]`;
  for (let i = index; i < fileText.length; i++) {
    if (fileText[i] == '\n') {
      fileText = fileText.slice(0, i) + tag + fileText.slice(i);
      break;
    }
  }
  return fileText;
}
