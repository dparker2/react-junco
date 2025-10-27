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

export type AsyncState<T> =
  | { loading: true; data: null; error: null }
  | { loading: false; data: T; error: null }
  | { loading: false; data: null; error: unknown };

export type AsyncTask<Args extends unknown[] = []> = {
  status: "idle" | "loading" | "success" | "error" | "aborted";
  signal?: AbortSignal;
  abort: () => void;
  execute: (...args: Args) => void;
};

export function baseModel<T>() {
  return class ViewModelImpl {
    isMounted: boolean = false;

    static useModel<P extends ViewModelImpl>(
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

    static createContext<P extends ViewModelImpl>(
      this: (new () => P) & typeof ViewModelImpl
    ) {
      type ProviderProps = { initialState: T } & Omit<
        React.ProviderProps<P>,
        "value"
      >;
      const context = createContext<P | undefined>(undefined);
      return {
        Provider: ({ initialState, children }: ProviderProps) => {
          const vm = this.useModel<P>(initialState);
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

    memoize<Deps extends [unknown] | unknown[], R>(
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

    task<Args extends unknown[], R>(
      fn: (signal: AbortSignal, ...args: Args) => Promise<R>,
      onState: (state: AsyncState<R>) => unknown
    ) {
      let controller: AbortController | undefined;

      const task: AsyncTask<Args> = {
        status: "idle",
        signal: controller?.signal,
        abort: () => {
          if (controller?.signal.aborted) return;
          task.status = "aborted";
          onState({ loading: false, data: null, error: null });
          controller?.abort();
        },
        execute: (...args: Args) => {
          if (task.status === "loading") return;
          const myController = new AbortController();
          task.status = "loading";
          onState({ loading: true, data: null, error: null });

          controller = myController;
          fn(myController.signal, ...args)
            .then((result) => {
              if (myController.signal.aborted) return;
              task.status = "success";
              onState({ loading: false, data: result, error: null });
              return result;
            })
            .catch((err: unknown) => {
              if (myController.signal.aborted) return;
              task.status = "error";
              onState({ loading: false, data: null, error: err });
            });
        },
      };

      return task;
    }

    getState(): Readonly<T> {
      throw new Error(
        `${this.constructor.name} not initialized properly. Use \`.useModel\` in components.`
      );
    }

    setState(_newState: Partial<T> | ((prevState: T) => Partial<T>)) {
      throw new Error(
        `${this.constructor.name} not initialized properly. Use \`.useModel\` in components.`
      );
    }

    onInit() {}
    onMount() {}
    onUnmount() {}
    onStateUpdated(_prev: T, _next: T) {}
  };
}
