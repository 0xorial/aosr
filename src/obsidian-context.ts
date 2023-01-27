import { createContext, useContext } from 'react';

export type Location = {
  line: number;
  col: number;
  offset: number;
};

export type Position = {
  start: Location;
  end: Location;
};

export type Tag = {
  name: string;
  position: Position;
};

export type FileType = {
  extension: string;
  basename: string;
  readFile: () => Promise<string>;
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
