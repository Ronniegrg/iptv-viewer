import { useState, useEffect } from "react";

const STORAGE_KEY = "iptv_continue_watching";

export const useContinueWatching = () => {
  const [continueWatching, setContinueWatching] = useState([]);

  useEffect(() => {
    // Load continue watching data from localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      setContinueWatching(JSON.parse(savedData));
    }
  }, []);

  const addToContinueWatching = (channel) => {
    const newItem = {
      channelId: channel.id,
      channelName: channel.name,
      timestamp: Date.now(),
      lastPosition: 0, // This will be updated when the video is paused
    };

    setContinueWatching((prev) => {
      const filtered = prev.filter((item) => item.channelId !== channel.id);
      const updated = [newItem, ...filtered].slice(0, 10); // Keep only last 10 items
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateLastPosition = (channelId, position) => {
    setContinueWatching((prev) => {
      const updated = prev.map((item) =>
        item.channelId === channelId
          ? { ...item, lastPosition: position, timestamp: Date.now() }
          : item
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromContinueWatching = (channelId) => {
    setContinueWatching((prev) => {
      const updated = prev.filter((item) => item.channelId !== channelId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    continueWatching,
    addToContinueWatching,
    updateLastPosition,
    removeFromContinueWatching,
  };
};
