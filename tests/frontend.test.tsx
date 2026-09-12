import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../frontend";

describe("App", () => {
  test("renders the heading", () => {
    render(<App />);
    expect(screen.getByText("Bun + TypeScript + React")).toBeInTheDocument();
  });

  test("starts with 0 clicks", () => {
    render(<App />);
    expect(screen.getByText("clicks: 0")).toBeInTheDocument();
  });

  test("clicking the button increments the counter", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("clicks: 1")).toBeInTheDocument();
  });
});
