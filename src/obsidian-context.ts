import { createContext, useContext } from 'react';

export type Position = {
  start: number;
  end: number;
};

export type Tag = {
  name: string;
  position: Position;
};

export type FileType = {
  extension: string;
  basename: string;
  readFile: () => Promise<string>;
  writeFile: (text: string) => Promise<void>;
  getTags(): Tag[];
};

export type ObsidianAdapterContextType = {
  getFiles(): FileType[];
  getMarkdownFiles(): FileType[];
};

export const ObsidianAdapterContext = createContext<ObsidianAdapterContextType>({} as any);

export function useObsidian(): ObsidianAdapterContextType {
  return useContext(ObsidianAdapterContext);
}
