import { describe, expect, test } from "bun:test";
import { render, act, waitFor } from "@testing-library/react";
import { baseModel } from "./index";

describe("Context API integration", () => {
  test("createContext returns Provider and useContext", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const ctx = Counter.createContext();

    expect(ctx.Provider).toBeDefined();
    expect(ctx.useContext).toBeDefined();
    expect(typeof ctx.Provider).toBe("function");
    expect(typeof ctx.useContext).toBe("function");
  });

  test("Provider provides Counter to children", () => {
    class Counter extends baseModel<{ count: number }>() {}
    const { Provider, useContext } = Counter.createContext();

    function Child() {
      const vm = useContext();
      return <div>{vm.getState().count}</div>;
    }

    const { getByText } = render(
      <Provider initialState={{ count: 42 }}>
        <Child />
      </Provider>
    );

    expect(getByText("42")).toBeDefined();
  });

  test("useContext throws error when used outside Provider", () => {
    class Counter extends baseModel<{ count: number }>() {}
    const { useContext } = Counter.createContext();

    function Child() {
      try {
        useContext();
        return <div>Should not render</div>;
      } catch (error) {
        if (error instanceof Error) {
          return <div>{error.message}</div>;
        }
        return <div>Unknown error</div>;
      }
    }

    const { getByText } = render(<Child />);

    expect(
      getByText("useContext can only be used under a Provider")
    ).toBeDefined();
  });

  test("multiple children can access same Counter", () => {
    class Counter extends baseModel<{ count: number }>() {
      increment() {
        this.setState((prev) => ({ count: prev.count + 1 }));
      }
    }

    const { Provider, useContext } = Counter.createContext();

    function Child1() {
      const vm = useContext();
      return <div data-testid="child1">{vm.getState().count}</div>;
    }

    function Child2() {
      const vm = useContext();
      return <div data-testid="child2">{vm.getState().count}</div>;
    }

    const { getByTestId } = render(
      <Provider initialState={{ count: 10 }}>
        <Child1 />
        <Child2 />
      </Provider>
    );

    expect(getByTestId("child1").textContent).toBe("10");
    expect(getByTestId("child2").textContent).toBe("10");
  });

  test("Provider initializes Counter with initialState", () => {
    class Counter extends baseModel<{ count: number; name: string }>() {}
    const { Provider, useContext } = Counter.createContext();

    function Child() {
      const vm = useContext();
      const state = vm.getState();
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <span data-testid="name">{state.name}</span>
        </div>
      );
    }

    const { getByTestId } = render(
      <Provider initialState={{ count: 5, name: "test" }}>
        <Child />
      </Provider>
    );

    expect(getByTestId("count").textContent).toBe("5");
    expect(getByTestId("name").textContent).toBe("test");
  });

  test("nested Providers create separate Counter instances", () => {
    class Counter extends baseModel<{ count: number }>() {}
    const { Provider, useContext } = Counter.createContext();

    function Child() {
      const vm = useContext();
      return vm.getState().count;
    }

    const { getByTestId } = render(
      <Provider initialState={{ count: 1 }}>
        <div data-testid="outer">
          <Child />
        </div>
        <Provider initialState={{ count: 2 }}>
          <div data-testid="inner">
            <Child />
          </div>
        </Provider>
      </Provider>
    );

    const outer = getByTestId("outer");
    const inner = getByTestId("inner");

    expect(outer.textContent).toBe("1");
    expect(inner.textContent).toBe("2");
  });

  test("Counter methods work through context", () => {
    class Counter extends baseModel<{ count: number }>() {
      increment() {
        this.setState((prev) => ({ count: prev.count + 1 }));
      }

      decrement() {
        this.setState((prev) => ({ count: prev.count - 1 }));
      }
    }

    const { Provider, useContext } = Counter.createContext();

    function Child() {
      const vm = useContext();
      return (
        <div>
          <span data-testid="count">{vm.getState().count}</span>
          <button onClick={() => vm.increment()}>Increment</button>
          <button onClick={() => vm.decrement()}>Decrement</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(
      <Provider initialState={{ count: 0 }}>
        <Child />
      </Provider>
    );

    expect(getByTestId("count").textContent).toBe("0");

    act(() => {
      getByText("Increment").click();
    });
    waitFor(() => {
      expect(getByTestId("count").textContent).toBe("1");
    });

    act(() => {
      getByText("Increment").click();
    });
    waitFor(() => {
      expect(getByTestId("count").textContent).toBe("2");
    });

    act(() => {
      getByText("Decrement").click();
    });
    waitFor(() => {
      expect(getByTestId("count").textContent).toBe("1");
    });
  });
});
