import { useReducer, useEffect, useCallback, useRef } from "react";
import ReactPlayer from "react-player";
import React from "react";
import "./VideoPlayer.css";
import ChannelList from "./ChannelList";

const initialState = {
  isLoading: true,
  hasError: false,
  isPlaying: false,
  errorDetails: null,
  retryCount: 0,
};

function playerReducer(state, action) {
  switch (action.type) {
    case "RESET":
      return { ...initialState };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: true,
        hasError: false,
        isPlaying: false,
        errorDetails: null,
      };
    case "SET_PLAYING":
      return { ...state, isLoading: false, isPlaying: true };
    case "SET_BUFFERING":
      return { ...state, isLoading: true };
    case "SET_BUFFER_END":
      return { ...state, isLoading: false };
    case "SET_ERROR":
      return {
        ...state,
        isLoading: false,
        isPlaying: false,
        hasError: true,
        errorDetails: action.payload,
      };
    case "RETRY":
      return {
        ...state,
        isLoading: true,
        hasError: false,
        errorDetails: null,
        retryCount: state.retryCount + 1,
      };
    default:
      return state;
  }
}

const VideoPlayer = ({
  channel,
  onError,
  onTimeout,
  channels = [],
  onChannelSelect,
  onShowChannelList,
}) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const [showControls, setShowControls] = React.useState(false);
  const videoRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const copyTimeoutRef = useRef();
  const timeoutRef = useRef();
  const errorTimeoutRef = useRef();
  const [showSearchBar, setShowSearchBar] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const searchInputRef = React.useRef(null);
  const bufferRef = React.useRef("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [showChannelListOverlay, setShowChannelListOverlay] =
    React.useState(false);

  const handleError = useCallback(
    (error) => {
      console.error("Video player error:", error);
      console.error("Channel URL:", channel?.url);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        type: error?.type,
      });
      dispatch({
        type: "SET_ERROR",
        payload: {
          message: error?.message || "Stream playback failed",
          url: channel?.url,
          timestamp: new Date().toISOString(),
        },
      });
      if (onError) {
        onError(error);
      }
    },
    [channel, onError]
  );

  useEffect(() => {
    if (channel) {
      const validation = validateChannel(channel);
      console.log("Channel validation:", validation);
      console.log("Channel details:", {
        title: channel.title,
        url: channel.url,
        group: channel.group,
      });
      if (!validation.valid) {
        handleError({
          message: `Invalid channel: ${validation.reason}`,
          code: "VALIDATION_ERROR",
        });
        return;
      }
      dispatch({ type: "SET_LOADING" });
    }
  }, [channel, handleError]);

  const handleReady = () => {
    dispatch({ type: "SET_PLAYING" });
  };

  const handleBuffer = () => {
    dispatch({ type: "SET_BUFFERING" });
  };

  const handleBufferEnd = () => {
    dispatch({ type: "SET_BUFFER_END" });
  };

  const validateChannel = (channel) => {
    if (!channel) return { valid: false, reason: "No channel provided" };
    if (!channel.url) return { valid: false, reason: "No URL provided" };
    const url = channel.url.trim();
    if (!url) return { valid: false, reason: "Empty URL" };
    try {
      new URL(url);
    } catch {
      return { valid: false, reason: "Invalid URL format" };
    }
    const supportedProtocols = ["http:", "https:", "rtmp:", "rtmps:"];
    const urlObj = new URL(url);
    if (!supportedProtocols.includes(urlObj.protocol)) {
      return {
        valid: false,
        reason: `Unsupported protocol: ${urlObj.protocol}`,
      };
    }
    return { valid: true, reason: "URL appears valid" };
  };

  // Fullscreen handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "f" || e.key === "F") && !isFullscreen) {
        if (videoWrapperRef.current) {
          if (videoWrapperRef.current.requestFullscreen) {
            videoWrapperRef.current.requestFullscreen();
          } else if (videoWrapperRef.current.webkitRequestFullscreen) {
            videoWrapperRef.current.webkitRequestFullscreen();
          } else if (videoWrapperRef.current.mozRequestFullScreen) {
            videoWrapperRef.current.mozRequestFullScreen();
          } else if (videoWrapperRef.current.msRequestFullscreen) {
            videoWrapperRef.current.msRequestFullscreen();
          }
        }
      } else if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (document.webkitFullscreenElement) {
          document.webkitExitFullscreen();
        } else if (document.mozFullScreenElement) {
          document.mozCancelFullScreen();
        } else if (document.msFullscreenElement) {
          document.msExitFullscreen();
        }
      }
    };
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(!!fsElement);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, [isFullscreen]);

  // Cleanup for copy-to-clipboard timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (channel && state.isLoading && !state.hasError) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (state.isLoading && !state.hasError && onTimeout) {
          onTimeout();
        }
      }, 15000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [channel, state.isLoading, state.hasError]);

  // 4-second error timeout
  useEffect(() => {
    if (state.hasError) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        if (state.hasError && onTimeout) {
          onTimeout();
        }
      }, 4000);
    } else {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    }
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [state.hasError, onTimeout, channel]);

  // Update search results and reset highlight on value change
  React.useEffect(() => {
    if (showSearchBar && searchValue.trim()) {
      // Only match channels that start with the search value (case-insensitive)
      const filtered = channels.filter((ch) =>
        ch.title.toLowerCase().startsWith(searchValue.toLowerCase())
      );
      setSearchResults(filtered);
      setHighlightedIndex(0);
    } else {
      setSearchResults([]);
      setHighlightedIndex(0);
    }
  }, [searchValue, showSearchBar, channels]);

  // Handle keyboard navigation in the search results
  const handleSearchInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setHighlightedIndex((i) => Math.min(i + 1, searchResults.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (searchResults.length > 0) {
        onChannelSelect && onChannelSelect(searchResults[highlightedIndex]);
        setShowSearchBar(false);
        setSearchValue("");
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setShowSearchBar(false);
      setSearchValue("");
    }
  };

  // Handle click on a result
  const handleResultClick = (idx) => {
    if (searchResults.length > 0) {
      onChannelSelect && onChannelSelect(searchResults[idx]);
      setShowSearchBar(false);
      setSearchValue("");
    }
  };

  // Focus input when search bar opens
  React.useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchBar]);

  // Keyboard shortcut for search bar (word + Enter in fullscreen)
  React.useEffect(() => {
    const maxBufferLength = 6; // 'search'.length or 'list'.length
    function handleSearchShortcut(e) {
      console.log(
        "[DEBUG] Keydown event:",
        e.key,
        "isFullscreen:",
        isFullscreen,
        "showSearchBar:",
        showSearchBar,
        "buffer:",
        bufferRef.current
      );
      if (showSearchBar) {
        if (e.key === "Escape") {
          setShowSearchBar(false);
          setSearchValue("");
          bufferRef.current = "";
        }
        return;
      }
      if (showChannelListOverlay) {
        if (e.key === "Escape") {
          setShowChannelListOverlay(false);
        }
        return;
      }
      if (!isFullscreen) {
        bufferRef.current = "";
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        bufferRef.current += e.key;
        if (bufferRef.current.length > maxBufferLength)
          bufferRef.current = bufferRef.current.slice(-maxBufferLength);
      }
      if (e.key === "Enter") {
        const bufferLower = bufferRef.current.toLowerCase();
        if (bufferLower === "search") {
          setShowSearchBar(true);
          setSearchValue("");
          console.log("[DEBUG] Triggered search shortcut");
        } else if (bufferLower === "list") {
          setShowChannelListOverlay(true);
          if (onShowChannelList) onShowChannelList();
          console.log(
            "[DEBUG] Triggered list shortcut (show channel list overlay)"
          );
        }
        bufferRef.current = "";
      }
    }
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, [
    isFullscreen,
    showSearchBar,
    setShowSearchBar,
    setSearchValue,
    onShowChannelList,
    showChannelListOverlay,
  ]);

  // Handler for selecting a channel from the overlay
  const handleOverlayChannelSelect = (ch) => {
    setShowChannelListOverlay(false);
    onChannelSelect && onChannelSelect(ch);
  };

  const getProxiedUrl = (url) => {
    if (!url) return url;
    if (
      url.includes("corsproxy") ||
      url.includes("cors-anywhere") ||
      url.includes("allorigins")
    ) {
      return url;
    }
    if (url.startsWith("http://")) {
      const proxies = [
        "https://corsproxy.io/?",
        "https://api.allorigins.win/raw?url=",
        "https://cors-anywhere.herokuapp.com/",
      ];
      return `${proxies[0]}${encodeURIComponent(url)}`;
    }
    return url;
  };

  if (!channel) {
    return (
      <div className="video-player-container">
        <div className="no-channel">
          <div className="no-channel-icon">
            <svg
              width="100"
              height="100"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 3H3C1.9 3 1 3.9 1 5V17C1 18.1 1.9 19 3 19H8V21H16V19H21C22.1 19 23 18.1 23 17V5C23 3.9 22.1 3 21 3ZM21 17H3V5H21V17Z"
                fill="#3366cc"
                fillOpacity="0.8"
              />
              <path
                d="M10 13.5V8.5L15 11L10 13.5Z"
                fill="#5c94ff"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <h2>Select a Channel</h2>
          <p>
            Choose a channel from the list to start watching your favorite
            content
          </p>
          <div className="welcome-animation">
            <div className="pulse-circle"></div>
            <div className="pulse-circle delay1"></div>
            <div className="pulse-circle delay2"></div>
          </div>
        </div>
      </div>
    );
  }

  const { isLoading, hasError, isPlaying, errorDetails, retryCount } = state;

  return (
    <div className="video-player-container">
      <div className="video-header">
        <div className="channel-info">
          {channel.logo && (
            <img
              src={channel.logo}
              alt={channel.title}
              className="channel-logo"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentNode.innerHTML += `<div class="fallback-logo">${channel.title.charAt(
                  0
                )}</div>`;
              }}
            />
          )}
          {!channel.logo && (
            <div className="fallback-logo">{channel.title.charAt(0)}</div>
          )}
          <div className="channel-details">
            <h2 className="channel-title">{channel.title}</h2>
            <div className="channel-meta">
              {channel.group && (
                <span className="channel-group">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  {channel.group}
                </span>
              )}
              {channel.country && (
                <span className="channel-country">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {channel.country}
                </span>
              )}
              {channel.language && (
                <span className="channel-language">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
                  </svg>
                  {channel.language}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="player-controls">
          <div
            className={`status-indicator ${
              isPlaying ? "playing" : hasError ? "error" : "loading"
            }`}
          >
            {isLoading && !hasError && (
              <>
                <span className="dot-loader"></span>
                Loading...
              </>
            )}
            {isPlaying && !isLoading && (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Live
              </>
            )}
            {hasError && (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                Error
              </>
            )}
          </div>
          <div style={{ flex: 1 }}></div>
          <button
            className="fullscreen-toggle-button"
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen (F)"}
            onClick={() => {
              if (!isFullscreen) {
                if (videoWrapperRef.current) {
                  if (videoWrapperRef.current.requestFullscreen) {
                    videoWrapperRef.current.requestFullscreen();
                  } else if (videoWrapperRef.current.webkitRequestFullscreen) {
                    videoWrapperRef.current.webkitRequestFullscreen();
                  } else if (videoWrapperRef.current.mozRequestFullScreen) {
                    videoWrapperRef.current.mozRequestFullScreen();
                  } else if (videoWrapperRef.current.msRequestFullscreen) {
                    videoWrapperRef.current.msRequestFullscreen();
                  }
                }
              } else {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else if (document.webkitFullscreenElement) {
                  document.webkitExitFullscreen();
                } else if (document.mozFullScreenElement) {
                  document.mozCancelFullScreen();
                } else if (document.msFullscreenElement) {
                  document.msExitFullscreen();
                }
              }
            }}
          >
            {isFullscreen ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14 10V4h6v6h-2V6.41l-5.29 5.3-1.42-1.42L16.59 4H14zm-4 4v6H4v-6h2v3.59l5.29-5.3 1.42 1.42L7.41 20H10z" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 14H5v5h5v-2H7v-3zm0-4h2V7h3V5H7v5zm10 10h-3v2h5v-5h-2v3zm0-14v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className="video-wrapper"
        ref={videoWrapperRef}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {showSearchBar && (
          <div className="fullscreen-search-overlay">
            <form
              className="fullscreen-search-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchResults.length > 0) {
                  onChannelSelect &&
                    onChannelSelect(searchResults[highlightedIndex]);
                  setShowSearchBar(false);
                  setSearchValue("");
                }
              }}
            >
              <input
                ref={searchInputRef}
                className="fullscreen-search-input"
                type="text"
                placeholder="Type channel name..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchInputKeyDown}
                autoFocus
              />
              {searchValue && (
                <div className="fullscreen-search-results">
                  {searchResults.length === 0 ? (
                    <div className="fullscreen-search-no-results">
                      No channels found
                    </div>
                  ) : (
                    <ul className="fullscreen-search-list">
                      {searchResults.map((ch, idx) => (
                        <li
                          key={ch.id}
                          className={
                            idx === highlightedIndex ? "highlighted" : ""
                          }
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onMouseDown={() => handleResultClick(idx)}
                          style={{
                            cursor: "pointer",
                            padding: "0.5em 1em",
                            background:
                              idx === highlightedIndex
                                ? "#3366cc"
                                : "transparent",
                            color: idx === highlightedIndex ? "#fff" : "#fff",
                          }}
                        >
                          {ch.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
        {showChannelListOverlay && (
          <div className="fullscreen-channel-list-overlay">
            <div className="fullscreen-channel-list-modal">
              <button
                className="fullscreen-channel-list-close"
                onClick={() => setShowChannelListOverlay(false)}
                title="Close"
                aria-label="Close channel list overlay"
              >
                ✕
              </button>
              <h2 className="fullscreen-channel-list-title">Channel List</h2>
              <ChannelList
                channels={channels}
                selectedChannel={channel}
                onChannelSelect={handleOverlayChannelSelect}
                onClose={() => setShowChannelListOverlay(false)}
              />
            </div>
          </div>
        )}
        {hasError ? (
          <div className="error-state">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="#ff6b6b">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h3>Unable to play this channel</h3>
            <p>
              The stream might be unavailable or incompatible with your browser
            </p>
            {errorDetails && (
              <details className="error-details">
                <summary>Error Details</summary>
                <div className="error-info">
                  <p>
                    <strong>URL:</strong> {errorDetails.url}
                  </p>
                  <p>
                    <strong>Error:</strong> {errorDetails.message}
                  </p>
                  <p>
                    <strong>Time:</strong>{" "}
                    {new Date(errorDetails.timestamp).toLocaleString()}
                  </p>
                </div>
              </details>
            )}
            <div className="error-actions">
              <button
                className="retry-button"
                onClick={() => {
                  dispatch({ type: "RETRY" });
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
                Try Again ({retryCount + 1})
              </button>
              <button
                className="copy-url-button"
                onClick={() => {
                  navigator.clipboard.writeText(channel?.url || "");
                  const button = document.querySelector(".copy-url-button");
                  const originalText = button.innerHTML;
                  button.innerHTML =
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Copied!';
                  if (copyTimeoutRef.current) {
                    clearTimeout(copyTimeoutRef.current);
                  }
                  copyTimeoutRef.current = setTimeout(() => {
                    button.innerHTML = originalText;
                  }, 2000);
                }}
                title="Copy stream URL to clipboard"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
                Copy URL
              </button>
            </div>
          </div>
        ) : (
          <ReactPlayer
            ref={videoRef}
            url={getProxiedUrl(channel.url)}
            playing={true}
            controls={true}
            width="100%"
            height="100%"
            onReady={handleReady}
            onError={handleError}
            onBuffer={handleBuffer}
            onBufferEnd={handleBufferEnd}
            config={{
              file: {
                attributes: {
                  crossOrigin: "anonymous",
                  preload: "metadata",
                  controlsList: "nodownload",
                },
                forceHLS: true,
                forceVideo: true,
              },
              hls: {
                isLive: true,
                enableWorker: false,
              },
            }}
            fallback={
              <div className="player-fallback">
                <div className="loading-spinner"></div>
                <p>Loading player...</p>
              </div>
            }
          />
        )}
        {isLoading && !hasError && (
          <div className="loading-overlay">
            <div className="wave-loader">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
            <p>Loading stream...</p>
          </div>
        )}
        {showControls && !isLoading && !hasError && (
          <div className="custom-controls-overlay"></div>
        )}
      </div>
    </div>
  );
};

export default React.memo(VideoPlayer);
