import { FileType, ObsidianAdapterContextType } from './obsidian-context';
import { TFile } from 'obsidian';

export function makeObsidianContext(): ObsidianAdapterContextType {
  return {
    getFiles() {
      const files = app.vault.getFiles();
      return files.map(mapFile);
    },
    getMarkdownFiles(): FileType[] {
      const files = app.vault.getMarkdownFiles();
      return files.map(mapFile);
    },
  };
}

function mapFile(file: TFile): FileType {
  return {
    basename: file.basename,
    extension: file.extension,
    readFile: () => app.vault.read(file),
    writeFile: (x: string) => app.vault.modify(file, x),
    getTags: () =>
      (app.metadataCache.getFileCache(file)?.tags ?? []).map((x) => ({
        name: x.tag,
        position: {
          start: x.position.start.offset,
          end: x.position.end.offset,
        },
      })),
  };
}
