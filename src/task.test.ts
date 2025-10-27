import { describe, expect, test, mock } from "bun:test";
import { renderHook, act, waitFor } from "@testing-library/react";
import { baseModel } from "./index";

describe("Async task management", () => {
  test("task executes async function", async () => {
    const fetchMock = mock(async () => "data");
    
    class DataFetcher extends baseModel<{ data: string | null; loading: boolean }>() {
      fetchData = this.task(
        async (_signal) => {
          return await fetchMock();
        },
        ({ data, loading }) => this.setState({ data, loading })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ data: null, loading: false })
    );
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    await waitFor(() => {
      expect(result.current.getState().loading).toBe(false);
    });
    
    expect(result.current.getState().data).toBe("data");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("task sets loading state correctly", async () => {
    class DataFetcher extends baseModel<{ loading: boolean }>() {
      fetchData = this.task(
        async (_signal) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "data";
        },
        ({ loading }) => this.setState({ loading })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ loading: false })
    );
    
    expect(result.current.getState().loading).toBe(false);
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    expect(result.current.getState().loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.getState().loading).toBe(false);
    });
  });

  test("task handles errors", async () => {
    const error = new Error("Fetch failed");
    
    class DataFetcher extends baseModel<{ error: unknown }>() {
      fetchData = this.task(
        async (_signal) => {
          throw error;
        },
        ({ error: err }) => this.setState({ error: err })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ error: null })
    );
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    await waitFor(() => {
      expect(result.current.getState().error).toBe(error);
    });
  });

  test("task can be aborted", async () => {
    const fetchMock = mock(async (signal: AbortSignal) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 100);
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Aborted"));
        });
      });
      return "data";
    });
    
    class DataFetcher extends baseModel<{ data: string | null; loading: boolean }>() {
      fetchData = this.task(
        fetchMock,
        ({ data, loading }) => this.setState({ data, loading })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ data: null, loading: false })
    );
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    expect(result.current.getState().loading).toBe(true);
    
    act(() => {
      result.current.fetchData.abort();
    });
    
    expect(result.current.getState().loading).toBe(false);
    expect(result.current.fetchData.status).toBe("aborted");
  });

  test("task status transitions correctly", async () => {
    class DataFetcher extends baseModel<{ value: string | null }>() {
      fetchData = this.task(
        async (_signal) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "data";
        },
        ({ data }) => this.setState({ value: data })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ value: null })
    );
    
    expect(result.current.fetchData.status).toBe("idle");
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    expect(result.current.fetchData.status).toBe("loading");
    
    await waitFor(() => {
      expect(result.current.fetchData.status).toBe("success");
    });
  });

  test("task status is error on failure", async () => {
    class DataFetcher extends baseModel<{ error: unknown }>() {
      fetchData = this.task(
        async (_signal) => {
          throw new Error("Failed");
        },
        ({ error }) => this.setState({ error })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ error: null })
    );
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    await waitFor(() => {
      expect(result.current.fetchData.status).toBe("error");
    });
  });

  test("task does not execute if already loading", async () => {
    const fetchMock = mock(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "data";
    });
    
    class DataFetcher extends baseModel<{ data: string | null }>() {
      fetchData = this.task(
        async (_signal) => await fetchMock(),
        ({ data }) => this.setState({ data })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ data: null })
    );
    
    act(() => {
      result.current.fetchData.execute();
      result.current.fetchData.execute();
      result.current.fetchData.execute();
    });
    
    await waitFor(() => {
      expect(result.current.fetchData.status).toBe("success");
    });
    
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("task passes arguments to async function", async () => {
    const fetchMock = mock(async (signal: AbortSignal, id: number, name: string) => {
      return { id, name };
    });
    
    class DataFetcher extends baseModel<{ data: { id: number; name: string } | null }>() {
      fetchData = this.task(
        fetchMock,
        ({ data }) => this.setState({ data })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ data: null })
    );
    
    act(() => {
      result.current.fetchData.execute(42, "test");
    });
    
    await waitFor(() => {
      expect(result.current.getState().data).toEqual({ id: 42, name: "test" });
    });
    
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(AbortSignal),
      42,
      "test"
    );
  });

  test("task abort does nothing if already aborted", () => {
    class DataFetcher extends baseModel<{ loading: boolean }>() {
      fetchData = this.task(
        async (_signal) => "data",
        ({ loading }) => this.setState({ loading })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ loading: false })
    );
    
    act(() => {
      result.current.fetchData.execute();
      result.current.fetchData.abort();
      result.current.fetchData.abort();
      result.current.fetchData.abort();
    });
    
    expect(result.current.fetchData.status).toBe("aborted");
  });

  test("task can be executed again after completion", async () => {
    const fetchMock = mock(async () => "data");
    
    class DataFetcher extends baseModel<{ data: string | null }>() {
      fetchData = this.task(
        async (_signal) => await fetchMock(),
        ({ data }) => this.setState({ data })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ data: null })
    );
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    await waitFor(() => {
      expect(result.current.fetchData.status).toBe("success");
    });
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    await waitFor(() => {
      expect(result.current.fetchData.status).toBe("success");
    });
    
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("task ignores result if aborted during execution", async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    
    class DataFetcher extends baseModel<{ data: string | null; loading: boolean }>() {
      fetchData = this.task(
        async (_signal) => await promise,
        ({ data, loading }) => this.setState({ data, loading })
      );
    }
    
    const { result } = renderHook(() => 
      DataFetcher.useModel({ data: null, loading: false })
    );
    
    act(() => {
      result.current.fetchData.execute();
    });
    
    expect(result.current.getState().loading).toBe(true);
    
    act(() => {
      result.current.fetchData.abort();
    });
    
    expect(result.current.getState().loading).toBe(false);
    
    // Resolve the promise after abort
    act(() => {
      resolvePromise!("data");
    });
    
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    // Data should not be set because task was aborted
    expect(result.current.getState().data).toBe(null);
  });
});
