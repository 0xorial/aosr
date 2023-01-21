import {DependencyList, EffectCallback, useEffect} from 'react';

export function useEffectDebug(effect: EffectCallback, deps?: DependencyList) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, deps);
  // useWhatChanged(deps as any);
}
