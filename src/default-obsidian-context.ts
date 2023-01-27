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
    getTags: () =>
      (app.metadataCache.getFileCache(file)?.tags ?? []).map((x) => ({ name: x.tag, position: x.position })),
  };
}
