import {useRef} from 'react';

export function useMountTimer() {
  const now = performance.now();
  const startTime = useRef(now);
  return now - startTime.current;
}
