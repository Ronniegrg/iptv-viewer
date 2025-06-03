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
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("iptv-dark-mode");
    if (stored) return stored === "true";
    // Use system preference if no stored value
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [playlistHistory, setPlaylistHistory] = useState([]);

  useEffect(() => {
    localStorage.setItem("iptv-dark-mode", darkMode);
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

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

  // Load last used custom playlist URL from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("iptv-custom-url");
    if (stored) setCustomUrl(stored);
  }, []);

  // Load playlist history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("iptv-playlist-history");
    if (stored) setPlaylistHistory(JSON.parse(stored));
  }, []);

  // Save playlist history to localStorage when changed
  useEffect(() => {
    localStorage.setItem(
      "iptv-playlist-history",
      JSON.stringify(playlistHistory)
    );
  }, [playlistHistory]);

  const loadPlaylist = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(
        "https://iptv-org.github.io/iptv/index.m3u",
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

  const handleStreamTimeout = () => {
    if (!channels.length || !selectedChannel) return;
    const currentIndex = channels.findIndex(
      (ch) => ch.id === selectedChannel.id
    );
    const nextIndex = (currentIndex + 1) % channels.length;
    setSelectedChannel(channels[nextIndex]);
  };

  const handleCustomUrlLoad = async (e, urlOverride) => {
    if (e) e.preventDefault();
    setUploadError("");
    try {
      setIsLoading(true);
      let data = "";
      const urlToLoad = urlOverride || customUrl;
      if (urlToLoad) {
        const response = await axios.get(urlToLoad, { timeout: 10000 });
        data = response.data;
        localStorage.setItem("iptv-custom-url", urlToLoad);
        // Update playlist history
        setPlaylistHistory((prev) => {
          const filtered = prev.filter((u) => u !== urlToLoad);
          return [urlToLoad, ...filtered].slice(0, 10); // Keep max 10
        });
      }
      const parsedChannels = parseM3U(data);
      if (!parsedChannels.length)
        throw new Error("No channels found in playlist.");
      setChannels(parsedChannels);
      setSelectedChannel(parsedChannels[0]);
      setShowPlaylistModal(false);
    } catch (err) {
      setUploadError("Failed to load playlist: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    setUploadError("");
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsLoading(true);
      const text = await file.text();
      const parsedChannels = parseM3U(text);
      if (!parsedChannels.length)
        throw new Error("No channels found in playlist.");
      setChannels(parsedChannels);
      setSelectedChannel(parsedChannels[0]);
      setShowPlaylistModal(false);
      localStorage.setItem("iptv-custom-url", "");
    } catch (err) {
      setUploadError("Failed to parse file: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to load the default playlist
  const handleLoadDefaultPlaylist = async () => {
    setUploadError("");
    try {
      setIsLoading(true);
      const response = await axios.get(
        "https://iptv-org.github.io/iptv/index.m3u",
        { timeout: 10000 }
      );
      const parsedChannels = parseM3U(response.data);
      if (!parsedChannels.length)
        throw new Error("No channels found in playlist.");
      setChannels(parsedChannels);
      setSelectedChannel(parsedChannels[0]);
      setShowPlaylistModal(false);
    } catch (err) {
      setUploadError(
        "Failed to load default playlist: " + (err.message || err)
      );
    } finally {
      setIsLoading(false);
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
          <button
            className="debug-toggle-button"
            onClick={() => setDarkMode((v) => !v)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button
            className="debug-toggle-button"
            onClick={() => setShowPlaylistModal(true)}
            title="Upload or enter playlist URL"
          >
            📂 Playlist
          </button>
        </div>
      </header>

      <main
        className={`app-main ${
          isChannelListVisible ? "with-sidebar" : "full-width"
        }`}
      >
        {/* Playlist Upload/URL Modal */}
        {showPlaylistModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowPlaylistModal(false)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setShowPlaylistModal(false)}
                title="Close"
              >
                ✕
              </button>
              <div className="modal-content">
                <h2>Load Playlist</h2>
                <button
                  style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 12,
                    background: "#3366cc",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  onClick={handleLoadDefaultPlaylist}
                  title="Load the default system playlist"
                >
                  Load Default Playlist
                </button>
                <form
                  onSubmit={handleCustomUrlLoad}
                  style={{ marginBottom: 16 }}
                >
                  <input
                    type="url"
                    placeholder="Enter playlist URL..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, padding: 8 }}
                  />
                  <button type="submit" style={{ width: "100%", padding: 8 }}>
                    Load from URL
                  </button>
                </form>
                {playlistHistory.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4>Saved URLs</h4>
                    <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                      {playlistHistory.map((url) => (
                        <li
                          key={url}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              wordBreak: "break-all",
                              fontSize: "0.95em",
                            }}
                          >
                            {url}
                          </span>
                          <button
                            style={{ marginLeft: 8 }}
                            onClick={() => handleCustomUrlLoad(null, url)}
                          >
                            Load
                          </button>
                          <button
                            style={{ marginLeft: 4 }}
                            onClick={() =>
                              setPlaylistHistory((prev) =>
                                prev.filter((u) => u !== url)
                              )
                            }
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ margin: "16px 0", textAlign: "center" }}>or</div>
                <input
                  type="file"
                  accept=".m3u,.txt"
                  onChange={handleFileUpload}
                  style={{ marginBottom: 8 }}
                />
                {uploadError && (
                  <div style={{ color: "red", marginTop: 8 }}>
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            onTimeout={handleStreamTimeout}
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
