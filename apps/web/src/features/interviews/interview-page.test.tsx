// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ConnectionState } from "livekit-client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { InterviewRoom } from "./interview-page";

const setMicrophoneEnabled = vi.fn().mockResolvedValue(undefined);

vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => children,
  RoomAudioRenderer: () => null,
  StartAudio: () => null,
  useConnectionState: () => ConnectionState.Connected,
  useLocalParticipant: () => ({
    localParticipant: { setMicrophoneEnabled },
    isMicrophoneEnabled: false,
    microphoneTrack: undefined,
    lastMicrophoneError: undefined
  }),
  useVoiceAssistant: () => ({ state: "connecting", agent: undefined })
}));

beforeEach(() => setMicrophoneEnabled.mockClear());

it("requests microphone publication and does not claim to be listening before it is ready", async () => {
  render(
    <MemoryRouter initialEntries={["/app/interviews/session-1/live"]}>
      <Routes>
        <Route path="/app/interviews/:id/live" element={<InterviewRoom />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => expect(setMicrophoneEnabled).toHaveBeenCalledWith(true));
  expect(screen.getByText(/microphone not ready/i)).toBeInTheDocument();
  expect(screen.queryByText(/^listening$/i)).not.toBeInTheDocument();
});
