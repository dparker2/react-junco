/**
 * React Junco - A state management library for React
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
  createContext,
  createElement,
} from "react";

function updateState<T>(oldState: T, newState: Partial<T> | T) {
  if (typeof newState === "object") {
    return { ...oldState, ...newState };
  }
  return newState;
}

class ViewModelImpl<T> {
  protected isMounted: boolean = false;

  static useModel<T, P extends ViewModelImpl<T>>(
    this: new () => P,
    initialState: T
  ): P {
    const [state, setState] = useState(initialState);
    const stateRef = useRef(state);

    const viewmodel = useMemo(() => {
      const vm = new this();
      // Late bind getState and setState as closures
      vm.getState = function () {
        return Object.freeze(stateRef.current);
      };
      vm.setState = function (newState) {
        setState((prev) => {
          if (typeof newState === "function") {
            stateRef.current = updateState(prev, newState(prev));
          } else {
            stateRef.current = updateState(prev, newState);
          }
          this.onStateUpdated(prev, stateRef.current);
          console.debug("setState", prev, stateRef.current);
          return stateRef.current;
        });
      };
      return vm;
    }, [setState, stateRef]);

    const initRef = useRef(true);
    if (initRef.current) {
      viewmodel.onInit();
      initRef.current = false;
    }

    useEffect(() => {
      viewmodel.isMounted = true;
      viewmodel.onMount();
      return () => {
        viewmodel.isMounted = false;
        viewmodel.onUnmount();
      };
    }, [viewmodel]);

    return viewmodel;
  }

  static createContext<T, P extends ViewModelImpl<T>>(
    this: (new () => P) & typeof ViewModelImpl<T>
  ) {
    type ProviderProps = { initialState: T } & Omit<
      React.ProviderProps<P>,
      "value"
    >;
    const context = createContext<P | undefined>(undefined);
    return {
      Provider: ({ initialState, children }: ProviderProps) => {
        const vm = this.useModel<T, P>(initialState);
        return createElement(context.Provider, {
          value: vm,
          children,
        });
      },
      useContext: () => {
        const vm = useContext(context);
        if (vm === undefined) {
          throw new Error("useContext can only be used under a Provider");
        }
        return vm;
      },
    };
  }

  protected memoize<Deps extends [unknown] | unknown[], R>(
    depsSelector: (state: Readonly<T>) => Deps,
    compute: (...args: Deps) => R
  ): () => R {
    let initialRun = true;
    let lastDeps: unknown[] = [];
    let cachedValue: R;

    return () => {
      const deps = depsSelector(this.getState());
      const changed =
        deps.length !== lastDeps.length ||
        deps.some((dep, i) => dep !== lastDeps[i]);

      if (changed || initialRun) {
        cachedValue = compute(...deps);
        lastDeps = deps;
        initialRun = false;
      }

      return cachedValue;
    };
  }

  getState(): Readonly<T> {
    throw new Error(
      "ViewModel not initialized properly. Use `.useModel` in components."
    );
  }

  setState(_newState: Partial<T> | ((prevState: T) => Partial<T>)) {
    throw new Error(
      "ViewModel not initialized properly. Use `.useModel` in components."
    );
  }

  onInit() {}
  onMount() {}
  onUnmount() {}
  onStateUpdated(_prev: T, _next: T) {}
}

export default function ViewModel<T>() {
  return ViewModelImpl<T>;
}
