import { describe, expect, test, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { baseModel } from "./index";

describe("Memoization", () => {
  test("memoize caches computed values", () => {
    const computeMock = mock((a: number, b: number) => a + b);
    
    class Calculator extends baseModel<{ a: number; b: number }>() {
      getSum = this.memoize(
        (state) => [state.a, state.b],
        computeMock
      );
    }
    
    const { result } = renderHook(() => 
      Calculator.useModel({ a: 1, b: 2 })
    );
    
    const sum1 = result.current.getSum();
    const sum2 = result.current.getSum();
    
    expect(sum1).toBe(3);
    expect(sum2).toBe(3);
    expect(computeMock).toHaveBeenCalledTimes(1);
  });

  test("memoize recomputes when dependencies change", () => {
    const computeMock = mock((a: number, b: number) => a + b);
    
    class Calculator extends baseModel<{ a: number; b: number }>() {
      getSum = this.memoize(
        (state) => [state.a, state.b],
        computeMock
      );
    }
    
    const { result } = renderHook(() => 
      Calculator.useModel({ a: 1, b: 2 })
    );
    
    result.current.getSum();
    
    act(() => {
      result.current.setState({ a: 5 });
    });
    
    result.current.getSum();
    
    expect(computeMock).toHaveBeenCalledTimes(2);
    expect(computeMock).toHaveBeenNthCalledWith(1, 1, 2);
    expect(computeMock).toHaveBeenNthCalledWith(2, 5, 2);
  });

  test("memoize does not recompute when unrelated state changes", () => {
    const computeMock = mock((a: number) => a * 2);
    
    class Calculator extends baseModel<{ a: number; b: number }>() {
      getDouble = this.memoize(
        (state) => [state.a],
        computeMock
      );
    }
    
    const { result } = renderHook(() => 
      Calculator.useModel({ a: 5, b: 10 })
    );
    
    result.current.getDouble();
    
    act(() => {
      result.current.setState({ b: 20 });
    });
    
    result.current.getDouble();
    
    expect(computeMock).toHaveBeenCalledTimes(1);
  });

  test("memoize works with complex computations", () => {
    type Product = { id: number; price: number };
    type State = { products: Product[]; taxRate: number };
    
    const computeMock = mock((products: Product[], taxRate: number) => {
      return products.reduce((sum, p) => sum + p.price, 0) * (1 + taxRate);
    });
    
    class Cart extends baseModel<State>() {
      getTotal = this.memoize(
        (state) => [state.products, state.taxRate],
        computeMock
      );
    }
    
    const { result } = renderHook(() => 
      Cart.useModel({
        products: [
          { id: 1, price: 10 },
          { id: 2, price: 20 },
        ],
        taxRate: 0.1,
      })
    );
    
    const total1 = result.current.getTotal();
    const total2 = result.current.getTotal();
    
    expect(total1).toBe(33);
    expect(total2).toBe(33);
    expect(computeMock).toHaveBeenCalledTimes(1);
  });

  test("memoize handles single dependency", () => {
    const computeMock = mock((count: number) => count * 2);
    
    class Counter extends baseModel<{ count: number }>() {
      getDouble = this.memoize(
        (state) => [state.count],
        computeMock
      );
    }
    
    const { result } = renderHook(() => 
      Counter.useModel({ count: 5 })
    );
    
    const double = result.current.getDouble();
    
    expect(double).toBe(10);
    expect(computeMock).toHaveBeenCalledTimes(1);
  });

  test("memoize handles multiple memoized functions", () => {
    const doubleMock = mock((n: number) => n * 2);
    const tripleMock = mock((n: number) => n * 3);
    
    class Counter extends baseModel<{ count: number }>() {
      getDouble = this.memoize(
        (state) => [state.count],
        doubleMock
      );
      
      getTriple = this.memoize(
        (state) => [state.count],
        tripleMock
      );
    }
    
    const { result } = renderHook(() => 
      Counter.useModel({ count: 5 })
    );
    
    result.current.getDouble();
    result.current.getTriple();
    result.current.getDouble();
    result.current.getTriple();
    
    expect(doubleMock).toHaveBeenCalledTimes(1);
    expect(tripleMock).toHaveBeenCalledTimes(1);
  });

  test("memoize with object reference changes", () => {
    type State = { items: number[] };
    const computeMock = mock((items: number[]) => items.reduce((a, b) => a + b, 0));
    
    class List extends baseModel<State>() {
      getSum = this.memoize(
        (state) => [state.items],
        computeMock
      );
    }
    
    const { result } = renderHook(() => 
      List.useModel({ items: [1, 2, 3] })
    );
    
    result.current.getSum();
    
    act(() => {
      result.current.setState({ items: [1, 2, 3, 4] });
    });
    
    result.current.getSum();
    
    expect(computeMock).toHaveBeenCalledTimes(2);
    expect(result.current.getSum()).toBe(10);
  });

  test("memoize returns correct value after state update", () => {
    class Counter extends baseModel<{ count: number }>() {
      getSquare = this.memoize(
        (state) => [state.count],
        (count) => count * count
      );
    }
    
    const { result } = renderHook(() => 
      Counter.useModel({ count: 3 })
    );
    
    expect(result.current.getSquare()).toBe(9);
    
    act(() => {
      result.current.setState({ count: 4 });
    });
    
    expect(result.current.getSquare()).toBe(16);
  });
});
