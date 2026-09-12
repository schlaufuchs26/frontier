import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { NeighbourInput } from "../src/components/NeighbourInput";

function input(): HTMLInputElement {
  return screen.getByTestId("guess-input") as HTMLInputElement;
}

function renderInput(exclude: string[] = []) {
  const picked: string[] = [];
  render(<NeighbourInput exclude={exclude} onPick={(id) => picked.push(id)} />);
  return picked;
}

describe("NeighbourInput", () => {
  test("suggests matches while typing and takes a click", () => {
    const picked = renderInput();
    fireEvent.change(input(), { target: { value: "germ" } });
    expect(screen.getByTestId("suggestion-DEU").textContent).toBe("Germany");
    fireEvent.click(screen.getByTestId("suggestion-DEU"));
    expect(picked).toEqual(["DEU"]);
    // the field resets so the next name can be typed right away
    expect(input().value).toBe("");
    expect(screen.queryByTestId("suggestions")).toBeNull();
  });

  test("Enter takes the highlighted entry, the arrows move it", () => {
    const picked = renderInput();
    fireEvent.change(input(), { target: { value: "korea" } });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(picked).toEqual(["KOR"]);
  });

  test("Enter and Escape are inert without a match", () => {
    const picked = renderInput();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(picked).toEqual([]);
    fireEvent.change(input(), { target: { value: "zzzz" } });
    expect(screen.getByTestId("no-match")).toBeInTheDocument();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(picked).toEqual([]);
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input().value).toBe("");
  });

  test("excluded countries are not suggested", () => {
    renderInput(["DEU"]);
    fireEvent.change(input(), { target: { value: "germany" } });
    expect(screen.queryByTestId("suggestion-DEU")).toBeNull();
    expect(screen.getByTestId("no-match")).toBeInTheDocument();
  });
});
