import { describe, expect, test } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { baseModel } from "./index";

describe("Core baseModel functionality", () => {
  test("useModel initializes with initial state", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const { result } = renderHook(() => Counter.useModel({ count: 0 }));

    expect(result.current.getState().count).toBe(0);
  });

  test("setState updates state with partial object", () => {
    class Counter extends baseModel<{ count: number; name: string }>() {}

    const { result } = renderHook(() =>
      Counter.useModel({ count: 0, name: "test" })
    );

    act(() => {
      result.current.setState({ count: 5 });
    });

    expect(result.current.getState().count).toBe(5);
    expect(result.current.getState().name).toBe("test");
  });

  test("setState updates state with function", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const { result } = renderHook(() => Counter.useModel({ count: 0 }));

    act(() => {
      result.current.setState((prev) => ({ count: prev.count + 1 }));
    });

    expect(result.current.getState().count).toBe(1);
  });

  test("setState with function receives previous state", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const { result } = renderHook(() => Counter.useModel({ count: 10 }));

    act(() => {
      result.current.setState((prev) => ({ count: prev.count * 2 }));
    });

    expect(result.current.getState().count).toBe(20);
  });

  test("getState returns frozen state", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const { result } = renderHook(() => Counter.useModel({ count: 0 }));

    const state = result.current.getState();
    expect(Object.isFrozen(state)).toBe(true);
  });

  test("multiple setState calls work correctly", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const { result } = renderHook(() => Counter.useModel({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
      result.current.setState({ count: 2 });
      result.current.setState({ count: 3 });
    });

    expect(result.current.getState().count).toBe(3);
  });

  test("throws error when getState called before initialization", () => {
    class Counter extends baseModel<{ count: number }>() {}
    const vm = new Counter();

    expect(() => vm.getState()).toThrow(
      "Counter not initialized properly. Use `.useModel` in components."
    );
  });

  test("throws error when setState called before initialization", () => {
    class Counter extends baseModel<{ count: number }>() {}
    const vm = new Counter();

    expect(() => vm.setState({ count: 1 })).toThrow(
      "Counter not initialized properly. Use `.useModel` in components."
    );
  });

  test("isMounted flag is set correctly", () => {
    class Counter extends baseModel<{ count: number }>() {}

    const { result, unmount } = renderHook(() =>
      Counter.useModel({ count: 0 })
    );

    expect(result.current.isMounted).toBe(true);

    unmount();

    expect(result.current.isMounted).toBe(false);
  });
});
