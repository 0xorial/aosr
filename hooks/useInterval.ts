import {useEffect, useRef} from 'react';
import {useEffectDebug} from './useEffectDebug';

export function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback.
  useEffectDebug(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffectDebug(() => {
    function tick() {
      savedCallback.current?.call(undefined);
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    return undefined;
  }, [delay]);
}
