import {useCallback, useState} from 'react';

export function useForceUpdate() {
  const [, setCounter] = useState(0);
  return useCallback(() => {
    setCounter((x) => x + 1);
  }, []);
}
