import {useMemo} from 'react';
import {useTrigger} from './useTrigger';
import {makeSubscribable, Subscribable} from '../events/subscriptions';

function makeCallbackRef<T>(changed: () => void) {
  const subscribable = makeSubscribable<T | null>();
  let current: T | null = null;
  return {
    current: () => current,
    ref: (e: T | null) => {
      current = e;
      changed();
      subscribable.fire(e);
    },
    onChanged: subscribable.subscribable,
  };
}

export type CallbackRef<T> = {
  current: () => T | null;
  ref: (e: T | null) => void;
  onChanged: Subscribable<T | null>;
  trigger: unknown;
};

export type RefCallback<T> = Subscribable<T>;

// useRef on steroids
// provides callback when ref changes (useful for popovers)
// provides trigger to watch for changes that allows convenient usage in useEffect.
export function useCallbackRef<T = Element>(): CallbackRef<T> {
  const [trigger, toggleTrigger] = useTrigger();
  return {...useMemo(() => makeCallbackRef<T>(() => toggleTrigger()), []), trigger};
}
