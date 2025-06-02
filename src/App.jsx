import { useState, useEffect } from "react";
import axios from "axios";
import { parseM3U } from "./utils/m3uParser";
import VideoPlayer from "./components/VideoPlayer";
import ChannelList from "./components/ChannelList";
import LoadingSpinner from "./components/LoadingSpinner";
import "./App.css";

function App() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChannelListVisible, setIsChannelListVisible] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    loadPlaylist();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!channels.length || !selectedChannel) return;
      const currentIndex = channels.findIndex(
        (ch) => ch.id === selectedChannel.id
      );
      if (e.key === "ArrowRight") {
        // Next channel
        const nextIndex = (currentIndex + 1) % channels.length;
        setSelectedChannel(channels[nextIndex]);
      } else if (e.key === "ArrowLeft") {
        // Previous channel
        const prevIndex =
          (currentIndex - 1 + channels.length) % channels.length;
        setSelectedChannel(channels[prevIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [channels, selectedChannel]);

  const loadPlaylist = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(
        "https://iptv-org.github.io/iptv/languages/ara.m3u",
        {
          timeout: 10000, // 10 seconds timeout
        }
      );

      const parsedChannels = parseM3U(response.data);
      console.log(`Loaded ${parsedChannels.length} channels`);

      // Log sample channels for debugging
      if (parsedChannels.length > 0) {
        console.log(
          "Sample channels:",
          parsedChannels.slice(0, 3).map((ch) => ({
            title: ch.title,
            url: ch.url?.substring(0, 100) + "...",
            group: ch.group,
          }))
        );
      }

      setChannels(parsedChannels);

      if (parsedChannels.length > 0) {
        // Auto-select first channel
        const firstChannel = parsedChannels[0];
        console.log("Auto-selecting first channel:", firstChannel.title);
        setSelectedChannel(firstChannel);
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
      setError(
        "Failed to load IPTV playlist. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
  };

  const handleVideoError = (error) => {
    console.error("Video playback error:", error);
    console.log("Selected channel details:", selectedChannel);

    // Log some diagnostic information
    if (selectedChannel) {
      console.log("Channel URL type:", typeof selectedChannel.url);
      console.log("Channel URL length:", selectedChannel.url?.length);
      console.log(
        "Channel URL starts with:",
        selectedChannel.url?.substring(0, 50)
      );
    }
  };

  const toggleChannelList = () => {
    setIsChannelListVisible(!isChannelListVisible);
  };

  const handleRetry = () => {
    loadPlaylist();
  };

  const handleRemoveChannel = (channelToRemove) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== channelToRemove.id));
    // If the removed channel is selected, select the next available channel
    if (selectedChannel?.id === channelToRemove.id) {
      const remaining = channels.filter((ch) => ch.id !== channelToRemove.id);
      setSelectedChannel(remaining.length > 0 ? remaining[0] : null);
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <LoadingSpinner message="Loading IPTV channels..." size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <div className="error-icon">📡</div>
          <h1>Connection Error</h1>
          <p>{error}</p>
          <button className="retry-button" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>📺 IPTV Viewer</h1>
          <span className="channel-count">
            {channels.length} channels available
          </span>
        </div>
        <div className="header-right">
          <button
            className="debug-toggle-button"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            title="Toggle debug information"
          >
            🔧 Debug
          </button>
          <button
            className="toggle-channels-button"
            onClick={toggleChannelList}
            title={isChannelListVisible ? "Hide channels" : "Show channels"}
          >
            {isChannelListVisible ? "⬅️ Hide" : "➡️ Show"} Channels
          </button>
        </div>
      </header>

      <main
        className={`app-main ${
          isChannelListVisible ? "with-sidebar" : "full-width"
        }`}
      >
        {isChannelListVisible && (
          <aside className="sidebar">
            <ChannelList
              channels={channels}
              selectedChannel={selectedChannel}
              onChannelSelect={handleChannelSelect}
              onClose={() => setIsChannelListVisible(false)}
            />
          </aside>
        )}

        <section className="content">
          <VideoPlayer
            channel={selectedChannel}
            onError={handleVideoError}
            onRemoveChannel={handleRemoveChannel}
          />

          {showDebugInfo && selectedChannel && (
            <div className="debug-panel">
              <h3>🔧 Debug Information</h3>
              <div className="debug-info">
                <div className="debug-item">
                  <strong>Channel:</strong> {selectedChannel.title}
                </div>
                <div className="debug-item">
                  <strong>Group:</strong> {selectedChannel.group}
                </div>
                <div className="debug-item">
                  <strong>URL:</strong>
                  <span className="url-display">{selectedChannel.url}</span>
                </div>
                <div className="debug-item">
                  <strong>Protocol:</strong>{" "}
                  {new URL(selectedChannel.url).protocol}
                </div>
                <div className="debug-item">
                  <strong>Host:</strong> {new URL(selectedChannel.url).hostname}
                </div>
                {selectedChannel.country && (
                  <div className="debug-item">
                    <strong>Country:</strong> {selectedChannel.country}
                  </div>
                )}
                {selectedChannel.language && (
                  <div className="debug-item">
                    <strong>Language:</strong> {selectedChannel.language}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
