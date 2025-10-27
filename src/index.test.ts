import { describe, expect, test } from "bun:test";
import ViewModel from "./index";

class TestState extends ViewModel<{ count: number }>() {
    
}
const vm = TestState.useModel({ count: 1 });
const { Provider, useContext } = TestState.createContext();

describe("react-junco", () => {
  test("exports ViewModel", () => {
    expect(ViewModel).toBeDefined();
    expect(typeof ViewModel).toBe("function");
  });
});
