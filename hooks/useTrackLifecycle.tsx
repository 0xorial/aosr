import {useLayoutEffect, useRef} from 'react';

export function useTrackLifecycle() {
  const nameRef = useRef<string>();
  if (nameRef.current === undefined) {
    nameRef.current = new Error().stack!.split('\n')[2].trim().split(' ')[1];
  }
  useLayoutEffect(() => {
    console.info('mounted ' + nameRef.current);
    return () => {
      console.info('unmounted ' + nameRef.current);
    };
  }, [nameRef]);
}
