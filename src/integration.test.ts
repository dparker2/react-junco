import { describe, expect, test, mock } from "bun:test";
import { renderHook, act, waitFor } from "@testing-library/react";
import { baseModel } from "./index";

describe("Integration tests - Real-world scenarios", () => {
  test("Counter with debounced value", async () => {
    type CounterState = {
      value: number;
      debounced: number;
    };
    
    class Counter extends baseModel<CounterState>() {
      private timeoutId?: ReturnType<typeof setTimeout>;

      override onUnmount(): void {
        clearTimeout(this.timeoutId);
      }

      override onStateUpdated(prev: CounterState, next: CounterState) {
        if (prev.value !== next.value) {
          clearTimeout(this.timeoutId);
          this.timeoutId = setTimeout(
            () => this.setState(({ value }) => ({ debounced: value })),
            100,
          );
        }
      }

      increase() {
        this.setState(({ value }) => ({ value: value + 1 }));
      }

      decrease() {
        this.setState(({ value }) => ({ value: value - 1 }));
      }
    }
    
    const { result, unmount } = renderHook(() => 
      Counter.useModel({ value: 0, debounced: 0 })
    );
    
    expect(result.current.getState().value).toBe(0);
    expect(result.current.getState().debounced).toBe(0);
    
    act(() => {
      result.current.increase();
    });
    
    expect(result.current.getState().value).toBe(1);
    expect(result.current.getState().debounced).toBe(0);
    
    await waitFor(() => {
      expect(result.current.getState().debounced).toBe(1);
    }, { timeout: 200 });
    
    act(() => {
      result.current.increase();
      result.current.increase();
      result.current.increase();
    });
    
    expect(result.current.getState().value).toBe(4);
    
    await waitFor(() => {
      expect(result.current.getState().debounced).toBe(4);
    }, { timeout: 200 });
    
    unmount();
  });

  test("Product list with filtering and sorting", () => {
    type Product = {
      id: number;
      title: string;
      price: number;
      stock: number;
    };

    type State = {
      products: Product[];
      query: string;
      debouncedQuery: string;
      sortBy: "title" | "price" | "stock";
      order: "asc" | "desc";
      hovered?: Product;
    };
    
    class ProductList extends baseModel<State>() {
      private debounceId?: ReturnType<typeof setTimeout>;

      override onUnmount(): void {
        clearTimeout(this.debounceId);
      }

      getVisibleProducts = this.memoize(
        ({ products, sortBy, order, debouncedQuery }) => 
          [products, sortBy, order, debouncedQuery],
        (products, sortBy, order, debouncedQuery) => {
          const lowerQuery = debouncedQuery.toLowerCase();
          return products
            .filter((p) => p.title.toLowerCase().includes(lowerQuery))
            .sort((p1, p2) => {
              const a = p1[sortBy];
              const b = p2[sortBy];

              if (order === "asc") {
                if (typeof a === "string" && typeof b === "string") {
                  return a.localeCompare(b);
                }
                if (typeof a === "number" && typeof b === "number") {
                  return a - b;
                }
                throw new Error("Sort error");
              }

              if (order === "desc") {
                if (typeof a === "string" && typeof b === "string") {
                  return b.localeCompare(a);
                }
                if (typeof a === "number" && typeof b === "number") {
                  return b - a;
                }
                throw new Error("Sort error");
              }
              throw new Error("Sort error");
            });
        },
      );

      sortBy(val: State["sortBy"]) {
        this.setState({ sortBy: val });
      }

      order(val: State["order"]) {
        this.setState({ order: val });
      }

      query(val: string) {
        clearTimeout(this.debounceId);
        this.setState({ query: val });
        this.debounceId = setTimeout(() => {
          this.setState(({ query }) => ({ debouncedQuery: query }));
        }, 50);
      }

      onMouseEnter(id: number) {
        const { products } = this.getState();
        const product = products.find((p) => p.id === id);
        if (product) {
          this.setState({ hovered: product });
        }
      }
    }
    
    const products: Product[] = [
      { id: 1, title: "Apple", price: 1.5, stock: 100 },
      { id: 2, title: "Banana", price: 0.5, stock: 200 },
      { id: 3, title: "Cherry", price: 3.0, stock: 50 },
    ];
    
    const { result, unmount } = renderHook(() => 
      ProductList.useModel({
        products,
        query: "",
        debouncedQuery: "",
        sortBy: "title",
        order: "asc",
      })
    );
    
    // Initial state
    let visible = result.current.getVisibleProducts();
    expect(visible).toHaveLength(3);
    expect(visible[0].title).toBe("Apple");
    
    // Sort by price ascending
    act(() => {
      result.current.sortBy("price");
    });
    
    visible = result.current.getVisibleProducts();
    expect(visible[0].title).toBe("Banana");
    expect(visible[2].title).toBe("Cherry");
    
    // Sort by price descending
    act(() => {
      result.current.order("desc");
    });
    
    visible = result.current.getVisibleProducts();
    expect(visible[0].title).toBe("Cherry");
    expect(visible[2].title).toBe("Banana");
    
    // Hover on product
    act(() => {
      result.current.onMouseEnter(2);
    });
    
    expect(result.current.getState().hovered?.title).toBe("Banana");
    
    unmount();
  });

  test("Virtualized list", () => {
    type VirtualizedListState = {
      startIndex: number;
      itemHeight: number;
      visibleHeight: number;
    };
    
    class VirtualizedListVM extends baseModel<VirtualizedListState>() {
      data: number[] = Array(10000)
        .fill(0)
        .map((_, i) => i + 1);

      onScroll(scrollTop: number) {
        const { itemHeight, startIndex } = this.getState();
        const newIndex = Math.floor(scrollTop / itemHeight);

        if (newIndex !== startIndex) {
          this.setState({ startIndex: newIndex });
        }
      }

      scrollerStyle() {
        const { visibleHeight } = this.getState();
        return {
          overflow: "auto",
          height: visibleHeight,
        } as const;
      }

      containerStyle() {
        const { itemHeight, startIndex } = this.getState();
        return {
          height: itemHeight * this.data.length,
          paddingTop: startIndex * itemHeight,
        } as const;
      }

      visibleItems() {
        const { startIndex, itemHeight, visibleHeight } = this.getState();
        const endIndex = startIndex + Math.ceil(visibleHeight / itemHeight);
        return this.data.slice(startIndex, endIndex);
      }
    }
    
    const { result } = renderHook(() => 
      VirtualizedListVM.useModel({
        startIndex: 0,
        itemHeight: 50,
        visibleHeight: 400,
      })
    );
    
    // Initial state
    expect(result.current.visibleItems()).toHaveLength(8);
    expect(result.current.visibleItems()[0]).toBe(1);
    
    // Scroll down
    act(() => {
      result.current.onScroll(500);
    });
    
    expect(result.current.getState().startIndex).toBe(10);
    expect(result.current.visibleItems()[0]).toBe(11);
    
    // Container style updates
    const containerStyle = result.current.containerStyle();
    expect(containerStyle.height).toBe(500000);
    expect(containerStyle.paddingTop).toBe(500);
  });

  test("Users with async data fetching", async () => {
    type User = { id: number; name: string };
    type UsersState = {
      users: User[];
      error: unknown;
      loading: boolean;
      activeUser: User | null;
    };

    const mockUsers: User[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    class Users extends baseModel<UsersState>() {
      override onMount(): void {
        this.fetchUsers.execute();
      }

      override onUnmount(): void {
        this.fetchUsers.abort();
      }

      fetchUsers = this.task(
        async (_signal) => {
          await new Promise((r) => setTimeout(r, 10));
          return mockUsers;
        },
        ({ data, loading, error }) =>
          this.setState({ users: data || [], loading, error }),
      );

      onSelectUser(id: number) {
        const user = this.getState().users.find((user) => user.id === id);
        if (user) this.setState({ activeUser: user });
      }
    }
    
    const { result, unmount } = renderHook(() => 
      Users.useModel({
        users: [],
        error: null,
        loading: false,
        activeUser: null,
      })
    );
    
    // Should start loading on mount
    expect(result.current.getState().loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.getState().loading).toBe(false);
    });
    
    expect(result.current.getState().users).toHaveLength(2);
    expect(result.current.getState().users[0].name).toBe("Alice");
    
    // Select user
    act(() => {
      result.current.onSelectUser(2);
    });
    
    expect(result.current.getState().activeUser?.name).toBe("Bob");
    
    unmount();
  });

  test("Complex state with multiple memoized computations", () => {
    type State = {
      items: number[];
      multiplier: number;
      filter: "all" | "even" | "odd";
    };
    
    const computeFilteredMock = mock((items: number[], filter: string) => {
      if (filter === "even") return items.filter((n) => n % 2 === 0);
      if (filter === "odd") return items.filter((n) => n % 2 !== 0);
      return items;
    });
    
    const computeTransformedMock = mock((items: number[], multiplier: number) => {
      return items.map((n) => n * multiplier);
    });
    
    class DataProcessor extends baseModel<State>() {
      getFiltered = this.memoize(
        (state) => [state.items, state.filter],
        computeFilteredMock
      );
      
      getTransformed = this.memoize(
        (state) => [this.getFiltered(), state.multiplier],
        computeTransformedMock
      );
      
      setFilter(filter: State["filter"]) {
        this.setState({ filter });
      }
      
      setMultiplier(multiplier: number) {
        this.setState({ multiplier });
      }
    }
    
    const { result } = renderHook(() => 
      DataProcessor.useModel({
        items: [1, 2, 3, 4, 5],
        multiplier: 2,
        filter: "all",
      })
    );
    
    // Initial computation
    let transformed = result.current.getTransformed();
    expect(transformed).toEqual([2, 4, 6, 8, 10]);
    expect(computeFilteredMock).toHaveBeenCalledTimes(1);
    expect(computeTransformedMock).toHaveBeenCalledTimes(1);
    
    // Call again - should use cache
    transformed = result.current.getTransformed();
    expect(computeFilteredMock).toHaveBeenCalledTimes(1);
    expect(computeTransformedMock).toHaveBeenCalledTimes(1);
    
    // Change filter - should recompute both
    act(() => {
      result.current.setFilter("even");
    });
    
    transformed = result.current.getTransformed();
    expect(transformed).toEqual([4, 8]);
    expect(computeFilteredMock).toHaveBeenCalledTimes(2);
    expect(computeTransformedMock).toHaveBeenCalledTimes(2);
    
    // Change multiplier - should only recompute transformed
    act(() => {
      result.current.setMultiplier(3);
    });
    
    transformed = result.current.getTransformed();
    expect(transformed).toEqual([6, 12]);
    expect(computeFilteredMock).toHaveBeenCalledTimes(2);
    expect(computeTransformedMock).toHaveBeenCalledTimes(3);
  });
});
