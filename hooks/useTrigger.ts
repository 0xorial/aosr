import {useState} from 'react';

export function useTrigger(): [unknown, () => void] {
  const [counter, setCounter] = useState(0);

  return [counter, () => setCounter(x => x + 1)];
}
