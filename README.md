# React Junco

A lightweight, class-based state management library for React that provides a ViewModel pattern for organizing application state and business logic.

## Features

- 🎯 **Class-based ViewModels** - Encapsulate state and logic in reusable classes
- 🔄 **Lifecycle Hooks** - React to component lifecycle events
- ⚡ **Built-in Memoization** - Efficient computed values with dependency tracking
- 🔀 **Async Task Management** - Handle async operations with abort support
- 🌳 **Context Integration** - Share ViewModels across component trees
- 🔒 **Type-Safe** - Full TypeScript support
- 🪶 **Lightweight** - Zero dependencies (except React)

## Installation

```bash
npm install react-junco
# or
bun add react-junco
```

## Quick Start

```typescript
import { baseModel } from 'react-junco';

// Define your state type
type CounterState = {
  count: number;
};

// Create a ViewModel class
class Counter extends baseModel<CounterState>() {
  increment() {
    this.setState(({ count }) => ({ count: count + 1 }));
  }

  decrement() {
    this.setState(({ count }) => ({ count: count - 1 }));
  }
}

// Use in a component
function CounterComponent() {
  const vm = Counter.useModel({ count: 0 });
  const { count } = vm.getState();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => vm.increment()}>+</button>
      <button onClick={() => vm.decrement()}>-</button>
    </div>
  );
}
```

## Core Concepts

### Creating ViewModels

Extend `baseModel<T>()` with your state type:

```typescript
type TodoState = {
  items: string[];
  filter: 'all' | 'active' | 'completed';
};

class TodoList extends baseModel<TodoState>() {
  addItem(text: string) {
    this.setState(({ items }) => ({
      items: [...items, text]
    }));
  }

  setFilter(filter: TodoState['filter']) {
    this.setState({ filter });
  }
}
```

### State Management

**Get state** (returns frozen/immutable object):
```typescript
const state = vm.getState();
```

**Update state** with partial object:
```typescript
this.setState({ count: 5 });
```

**Update state** with function:
```typescript
this.setState((prev) => ({ count: prev.count + 1 }));
```

### Lifecycle Hooks

```typescript
class MyViewModel extends baseModel<State>() {
  // Called once when ViewModel is created
  override onInit() {
    console.log('Initialized');
  }

  // Called when component mounts
  override onMount() {
    console.log('Mounted');
  }

  // Called when component unmounts
  override onUnmount() {
    console.log('Unmounted - cleanup here');
  }

  // Called after every state update
  override onStateUpdated(prev: State, next: State) {
    console.log('State changed', prev, next);
  }
}
```

### Memoization

Create computed values that only recalculate when dependencies change:

```typescript
type CartState = {
  items: Array<{ price: number; quantity: number }>;
  taxRate: number;
};

class ShoppingCart extends baseModel<CartState>() {
  // Memoized computation
  getTotal = this.memoize(
    // Dependency selector
    (state) => [state.items, state.taxRate],
    // Compute function
    (items, taxRate) => {
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      return subtotal * (1 + taxRate);
    }
  );
}

// Usage in component
const total = vm.getTotal(); // Only recalculates when items or taxRate change
```

### Async Tasks

Handle async operations with built-in loading/error states and abort support:

```typescript
type UserState = {
  users: User[];
  loading: boolean;
  error: unknown;
};

class UserList extends baseModel<UserState>() {
  override onMount() {
    this.fetchUsers.execute();
  }

  override onUnmount() {
    this.fetchUsers.abort(); // Cancel on unmount
  }

  fetchUsers = this.task(
    async (signal) => {
      const res = await fetch('/api/users', { signal });
      return res.json();
    },
    ({ data, loading, error }) => {
      this.setState({
        users: data || [],
        loading,
        error
      });
    }
  );
}

// Usage
vm.fetchUsers.execute(); // Start the task
vm.fetchUsers.abort();   // Cancel the task
vm.fetchUsers.status;    // 'idle' | 'loading' | 'success' | 'error' | 'aborted'
```

### Context API Integration

Share ViewModels across component trees:

```typescript
class AppState extends baseModel<State>() {
  // ... your methods
}

// Create context
const { Provider, useContext } = AppState.createContext();

// Provide at top level
function App() {
  return (
    <Provider initialState={{ /* ... */ }}>
      <ChildComponents />
    </Provider>
  );
}

// Consume in children
function ChildComponent() {
  const vm = useContext();
  // Use vm...
}
```

## Advanced Examples

### Debounced Search

```typescript
type SearchState = {
  query: string;
  debouncedQuery: string;
  results: string[];
};

class Search extends baseModel<SearchState>() {
  private debounceId?: ReturnType<typeof setTimeout>;

  override onUnmount() {
    clearTimeout(this.debounceId);
  }

  override onStateUpdated(prev: SearchState, next: SearchState) {
    if (prev.query !== next.query) {
      clearTimeout(this.debounceId);
      this.debounceId = setTimeout(() => {
        this.setState(({ query }) => ({ debouncedQuery: query }));
      }, 300);
    }
  }

  setQuery(query: string) {
    this.setState({ query });
  }

  // Fetch results when debouncedQuery changes
  searchTask = this.task(
    async (signal, query: string) => {
      const res = await fetch(`/api/search?q=${query}`, { signal });
      return res.json();
    },
    ({ data }) => this.setState({ results: data || [] })
  );
}
```

### Virtualized List

```typescript
type VirtualListState = {
  startIndex: number;
  itemHeight: number;
  visibleHeight: number;
};

class VirtualList extends baseModel<VirtualListState>() {
  data = Array(10000).fill(0).map((_, i) => i);

  onScroll(event: React.UIEvent) {
    const scrollTop = event.currentTarget.scrollTop;
    const { itemHeight, startIndex } = this.getState();
    const newIndex = Math.floor(scrollTop / itemHeight);

    if (newIndex !== startIndex) {
      this.setState({ startIndex: newIndex });
    }
  }

  visibleItems = this.memoize(
    (state) => [state.startIndex, state.itemHeight, state.visibleHeight],
    (startIndex, itemHeight, visibleHeight) => {
      const endIndex = startIndex + Math.ceil(visibleHeight / itemHeight);
      return this.data.slice(startIndex, endIndex);
    }
  );
}
```

### Form Management

```typescript
type FormState = {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
};

class Form extends baseModel<FormState>() {
  setValue(field: string, value: string) {
    this.setState(({ values }) => ({
      values: { ...values, [field]: value }
    }));
  }

  setTouched(field: string) {
    this.setState(({ touched }) => ({
      touched: { ...touched, [field]: true }
    }));
  }

  validate = this.memoize(
    (state) => [state.values],
    (values) => {
      const errors: Record<string, string> = {};
      // Validation logic...
      return errors;
    }
  );

  submit = this.task(
    async (signal) => {
      const { values } = this.getState();
      const res = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(values),
        signal
      });
      return res.json();
    },
    ({ loading }) => this.setState({ isSubmitting: loading })
  );
}
```

## API Reference

### `baseModel<T>()`

Factory function that returns a ViewModel base class.

**Type Parameter:**
- `T` - Your state type

**Returns:** A class with the following members:

#### Static Methods

- `useModel(initialState: T): ViewModel` - React hook to create and use a ViewModel instance
- `createContext()` - Create a Context Provider and useContext hook

#### Instance Methods

- `getState(): Readonly<T>` - Get current state (frozen/immutable)
- `setState(update: Partial<T> | (prev: T) => Partial<T>)` - Update state
- `memoize(depsSelector, compute)` - Create memoized computation
- `task(asyncFn, onState)` - Create async task with abort support

#### Lifecycle Hooks

- `onInit()` - Override to run code once during initialization
- `onMount()` - Override to run code when component mounts
- `onUnmount()` - Override to run cleanup when component unmounts
- `onStateUpdated(prev: T, next: T)` - Override to react to state changes

#### Properties

- `isMounted: boolean` - Whether the component is currently mounted

## TypeScript

React Junco is written in TypeScript and provides full type safety:

```typescript
type State = {
  count: number;
  name: string;
};

class MyVM extends baseModel<State>() {
  // TypeScript knows the state shape
  increment() {
    this.setState(({ count }) => ({ count: count + 1 })); // ✓
    this.setState({ invalid: true }); // ✗ Type error
  }
}

// In components
const vm = MyVM.useModel({ count: 0, name: 'test' });
const state = vm.getState(); // Type: Readonly<State>
```

## Best Practices

1. **Keep ViewModels focused** - One ViewModel per feature or domain
2. **Use memoization for expensive computations** - Avoid recalculating on every render
3. **Clean up in onUnmount** - Clear timeouts, abort tasks, remove listeners
4. **Leverage onStateUpdated for side effects** - Debouncing, validation, derived updates
5. **Use Context for shared state** - Avoid prop drilling
6. **Type your state** - Full TypeScript support for safety

## License

MIT
