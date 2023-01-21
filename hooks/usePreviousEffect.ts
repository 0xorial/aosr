import {useEffect, useRef} from 'react';

export const usePreviousEffect = <TInputs extends ReadonlyArray<unknown>>(
  fn: (inp: TInputs) => ReturnType<typeof useEffect>,
  inputs: TInputs
) => {
  const previousInputsRef = useRef<TInputs>(inputs);

  useEffect(() => {
    fn(previousInputsRef.current);
    const copy = [...inputs] as any as TInputs;
    previousInputsRef.current = copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, inputs);
};
