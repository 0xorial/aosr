import { useCallback, useRef } from 'react';
import { useIsMounted } from '../controls/useIsMounted';

// wraps an async function into a version which can be called without
// a risk of running the code after component is unmounted
export function useAsyncCallback<TParams = void, TReturn = void>(
  createGenerator: (
    params: TParams & {
      wrap: <T>(p: Promise<T>) => Promise<T>;
    }
  ) => Promise<TReturn>,
  deps: React.DependencyList
) {
  const isMounted = useIsMounted();
  const cancelationToken = useRef({ canceled: false });
  return useCallback(
    (pp: TParams) => {
      const p = {
        wrap: function <T>(t: Promise<T>) {
          const canceled = { canceled: false };
          cancelationToken.current.canceled = true;
          cancelationToken.current = canceled;
          return new Promise<T>((resolve, reject) => {
            t.then((x) => {
              if (isMounted.current && !canceled.canceled) {
                resolve(x);
              }
            }).catch((x) => {
              if (isMounted.current && !canceled.canceled) {
                reject(x);
              }
            });
          });
        },
      };
      return createGenerator({ ...pp, ...p });
    },
    // we do not want to demand callers to use useCallback on createGenerator
    // to make usage less verbose
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, isMounted]
  );
}
