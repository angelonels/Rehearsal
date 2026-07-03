// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { LandingPage } from "./landing-page";

it("presents voice interview positioning and signup action", () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /practice the interview/i })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /start practicing/i })).toHaveLength(2);
});
