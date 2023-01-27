import { useRef, useState } from 'react';
import { useEffectDebug } from './useEffectDebug';
import { LinkedList } from './linked-list';

export type AsyncEffectFuncContext = {
  wrap: <T>(p: Promise<T>) => Promise<T>;
  isCanceled: () => boolean;
};

export type AsyncEffectFunc = (p: AsyncEffectFuncContext) => Promise<void | (() => void)>;

export function useAsyncEffect(
  createGenerator: AsyncEffectFunc,
  deps: React.DependencyList,
  errorCallback: ((error: any) => void) | null = null
): { trigger: () => Promise<void> } {
  const [counter, setCounter] = useState(0);
  const cleanupRef = useRef<() => void>();
  const pendingPromises = useRef(
    new LinkedList<{
      resolve: () => void;
      reject: (e: Error) => void;
    }>()
  );

  useEffectDebug(() => {
    let isCanceled = false;

    const p = {
      wrap: function <T>(t: Promise<T>) {
        return new Promise<T>((resolve, reject) => {
          t.then((x) => {
            if (!isCanceled) {
              resolve(x);
            }
          }).catch((x) => {
            if (!isCanceled) {
              reject(x);
            }
          });
        });
      },
      isCanceled: () => {
        return isCanceled;
      },
    };

    createGenerator(p)
      .then((r) => {
        if (typeof r === 'function') {
          cleanupRef.current = r;
        }
        // async calls should have been canceled through 'wrap' function
        const promises = pendingPromises.current.toArray();
        for (const promise of promises) {
          promise.resolve();
        }
      })
      .catch((e) => {
        console.error(e);
        if (errorCallback) errorCallback(e);
        const promises = pendingPromises.current.toArray();
        for (const promise of promises) {
          promise.reject(e);
        }
      });

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      isCanceled = true;
    };
    // we do not want to demand callers to use useCallback on createGenerator and errorCallback
    // to make usage less verbose
  }, [...deps, counter]);

  return {
    trigger: () => {
      setCounter((x) => x + 1);
      return new Promise<void>((resolve, reject) => {
        const r = pendingPromises.current.add({
          resolve: () => {
            r.detachSelf();
            resolve();
          },
          reject: () => {
            r.detachSelf();
            reject();
          },
        });
      });
    },
  };
}
