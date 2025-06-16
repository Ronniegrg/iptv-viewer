import { useEffect } from "react";

export const useKeyboardShortcuts = ({
  onNextChannel,
  onPreviousChannel,
  onToggleChannelList,
  onToggleFullscreen,
  onTogglePlayPause,
  onToggleMute,
  onVolumeUp,
  onVolumeDown,
  onToggleDarkMode,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // Channel navigation
      if (e.key === "ArrowRight") {
        onNextChannel?.();
      } else if (e.key === "ArrowLeft") {
        onPreviousChannel?.();
      }

      // Player controls
      if (e.key === "f" || e.key === "F") {
        onToggleFullscreen?.();
      } else if (e.key === " ") {
        e.preventDefault(); // Prevent page scroll
        onTogglePlayPause?.();
      } else if (e.key === "m" || e.key === "M") {
        onToggleMute?.();
      } else if (e.key === "ArrowUp") {
        onVolumeUp?.();
      } else if (e.key === "ArrowDown") {
        onVolumeDown?.();
      }

      // UI controls
      if (e.key === "c" || e.key === "C") {
        onToggleChannelList?.();
      } else if (e.key === "d" || e.key === "D") {
        onToggleDarkMode?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onNextChannel,
    onPreviousChannel,
    onToggleChannelList,
    onToggleFullscreen,
    onTogglePlayPause,
    onToggleMute,
    onVolumeUp,
    onVolumeDown,
    onToggleDarkMode,
  ]);
};
