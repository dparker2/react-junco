import { describe, expect, test, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { baseModel } from "./index";

describe("Lifecycle hooks", () => {
  test("onInit is called once during initialization", () => {
    const onInitMock = mock(() => {});
    
    class Counter extends baseModel<{ count: number }>() {
      override onInit() {
        onInitMock();
      }
    }
    
    const { rerender } = renderHook(() => 
      Counter.useModel({ count: 0 })
    );
    
    expect(onInitMock).toHaveBeenCalledTimes(1);
    
    rerender();
    rerender();
    
    expect(onInitMock).toHaveBeenCalledTimes(1);
  });

  test("onMount is called when component mounts", () => {
    const onMountMock = mock(() => {});
    
    class Counter extends baseModel<{ count: number }>() {
      override onMount() {
        onMountMock();
      }
    }
    
    renderHook(() => Counter.useModel({ count: 0 }));
    
    expect(onMountMock).toHaveBeenCalledTimes(1);
  });

  test("onUnmount is called when component unmounts", () => {
    const onUnmountMock = mock(() => {});
    
    class Counter extends baseModel<{ count: number }>() {
      override onUnmount() {
        onUnmountMock();
      }
    }
    
    const { unmount } = renderHook(() => 
      Counter.useModel({ count: 0 })
    );
    
    expect(onUnmountMock).toHaveBeenCalledTimes(0);
    
    unmount();
    
    expect(onUnmountMock).toHaveBeenCalledTimes(1);
  });

  test("onStateUpdated is called when state changes", () => {
    const onStateUpdatedMock = mock((_prev: { count: number }, _next: { count: number }) => {});
    
    class Counter extends baseModel<{ count: number }>() {
      override onStateUpdated(prev: { count: number }, next: { count: number }) {
        onStateUpdatedMock(prev, next);
      }
    }
    
    const { result } = renderHook(() => 
      Counter.useModel({ count: 0 })
    );
    
    expect(onStateUpdatedMock).toHaveBeenCalledTimes(0);
    
    act(() => {
      result.current.setState({ count: 1 });
    });
    
    expect(onStateUpdatedMock).toHaveBeenCalledTimes(1);
    expect(onStateUpdatedMock).toHaveBeenCalledWith(
      { count: 0 },
      { count: 1 }
    );
  });

  test("onStateUpdated receives correct prev and next states", () => {
    const states: Array<{ prev: number; next: number }> = [];
    
    class Counter extends baseModel<{ count: number }>() {
      override onStateUpdated(
        prev: { count: number }, 
        next: { count: number }
      ) {
        states.push({ prev: prev.count, next: next.count });
      }
    }
    
    const { result } = renderHook(() => 
      Counter.useModel({ count: 0 })
    );
    
    act(() => {
      result.current.setState({ count: 1 });
      result.current.setState({ count: 2 });
      result.current.setState({ count: 3 });
    });
    
    expect(states).toEqual([
      { prev: 0, next: 1 },
      { prev: 1, next: 2 },
      { prev: 2, next: 3 },
    ]);
  });

  test("cleanup in onUnmount works correctly", () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const cleanupMock = mock(() => {});
    
    class Counter extends baseModel<{ count: number }>() {
      override onMount() {
        timeoutId = setTimeout(() => {}, 1000);
      }
      
      override onUnmount() {
        clearTimeout(timeoutId);
        cleanupMock();
      }
    }
    
    const { unmount } = renderHook(() => 
      Counter.useModel({ count: 0 })
    );
    
    unmount();
    
    expect(cleanupMock).toHaveBeenCalledTimes(1);
  });

  test("lifecycle hooks are called in correct order", () => {
    const calls: string[] = [];
    
    class Counter extends baseModel<{ count: number }>() {
      override onInit() {
        calls.push("onInit");
      }
      
      override onMount() {
        calls.push("onMount");
      }
      
      override onUnmount() {
        calls.push("onUnmount");
      }
    }
    
    const { unmount } = renderHook(() => 
      Counter.useModel({ count: 0 })
    );
    
    expect(calls).toEqual(["onInit", "onMount"]);
    
    unmount();
    
    expect(calls).toEqual(["onInit", "onMount", "onUnmount"]);
  });
});
