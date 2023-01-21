import { useRef } from "react";
import { useEffectDebug } from "../hooks/useEffectDebug";

export function useIsMounted() {
  const ref = useRef<boolean>(false);
  useEffectDebug(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);

  return ref;
}

export function useDidUnmount() {
  const ref = useRef<boolean>(false);
  useEffectDebug(() => {
    ref.current = false;
    return () => {
      ref.current = true;
    };
  }, []);

  return ref;
}
