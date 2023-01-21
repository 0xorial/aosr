import {DependencyList, useEffect, useRef} from 'react';
import {useEffectDebug} from './useEffectDebug';

export function useAbandonOnUnmount(dependencies?: DependencyList) {
  const isUnmounted = useRef(false);

  useEffectDebug(() => {
    return () => {
      isUnmounted.current = true;
    };
  }, dependencies || []);

  return function abandonOnUnmount<T>(b: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      b.then((r) => {
        if (!isUnmounted.current) {
          resolve(r);
        }
      });
      b.catch((x) => {
        if (!isUnmounted.current) {
          reject(x);
        }
      });
    });
  };
}
