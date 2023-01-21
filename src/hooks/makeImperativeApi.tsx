import React, {createContext, ReactNode, useContext, useMemo} from 'react';
import {LinkedList, LinkedListNode} from '../events/LinkedList';
import {useForceUpdate} from './useForceUpdate';

export type ImperativeApiRenderItem = {
  key: string;
  render: (key: string) => ReactNode;
};

export type ImperativeApiContextType = {
  items: LinkedList<ImperativeApiRenderItem>;
  triggerRender: () => void;
};

export const ImperativeApiContext = createContext<ImperativeApiContextType | null>(null);

export type RenderFn<T = void> = (args: T) => ReactNode;

export function ImperativeApiContainer(props: {data: ImperativeApiContextType}) {
  return <>{props.data.items.getItems().map((x) => x.render(x.key))}</>;
}

export function useImperativeApiContainer() {
  const forceUpdate = useForceUpdate();

  const imperativeApi = useMemo<ImperativeApiContextType>(() => {
    return {
      items: new LinkedList<ImperativeApiRenderItem>(),
      triggerRender: forceUpdate,
    };
  }, [forceUpdate]);

  return {container: <ImperativeApiContainer data={imperativeApi} />, context: imperativeApi};
}

let imperativeItemCounter = 0;

export function useImperativeApi() {
  const context = useContext(ImperativeApiContext);
  if (context === null) {
    throw new Error('context is required for imperative api.');
  }

  return {
    add: (render: RenderFn<{key: string; remove: () => void}>) => {
      let node: LinkedListNode<ImperativeApiRenderItem> | null = null;
      let removeImmediately = false;

      function remove() {
        if (node === null) {
          removeImmediately = true;
        } else {
          node.detachSelf();
        }
      }

      node = context.items.add({
        key: (imperativeItemCounter++).toString(),
        render: (key) => render({key, remove}),
      });
      if (removeImmediately) {
        node.detachSelf();
      }
      context.triggerRender();
    },
  };
}
