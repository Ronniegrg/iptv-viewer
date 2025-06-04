import { useState, useMemo, useEffect, useRef } from "react";
import { searchChannels, groupChannelsByCategory } from "../utils/m3uParser";
import "./ChannelList.css";
import { FixedSizeList as List } from "react-window";
import ChannelItem from "./ChannelItem";
import ChannelInfoModal from "./ChannelInfoModal";

const ChannelList = ({
  channels,
  selectedChannel,
  onChannelSelect,
  onClose,
  fullscreenOverlay = false,
  initialHighlightedChannelId,
  externalSearchInputRef,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [showRecentlyWatched, setShowRecentlyWatched] = useState(false);
  const [modalChannel, setModalChannel] = useState(null);
  const [sortOption, setSortOption] = useState("default");
  const [epgData, setEpgData] = useState(null);
  const epgCache = useRef({});
  const [epgLoading, setEpgLoading] = useState(false);
  const [epgError, setEpgError] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef(null);
  const listRef = useRef(null); // Ref for react-window List

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("iptv-favorites");
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  // Save favorites to localStorage when changed
  useEffect(() => {
    localStorage.setItem("iptv-favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Load recently watched from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("iptv-recently-watched");
    if (stored) setRecentlyWatched(JSON.parse(stored));
  }, []);

  // Save recently watched to localStorage when changed
  useEffect(() => {
    localStorage.setItem(
      "iptv-recently-watched",
      JSON.stringify(recentlyWatched)
    );
  }, [recentlyWatched]);

  const channelGroups = useMemo(() => {
    return groupChannelsByCategory(channels);
  }, [channels]);

  const categories = useMemo(() => {
    return Object.keys(channelGroups).sort();
  }, [channelGroups]);

  const filteredChannels = useMemo(() => {
    let filtered = searchChannels(channels, searchQuery);
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (channel) => channel.group === selectedCategory
      );
    }
    if (showFavorites) {
      filtered = filtered.filter((channel) => favorites.includes(channel.id));
    }
    if (showRecentlyWatched) {
      filtered = filtered.filter((channel) =>
        recentlyWatched.includes(channel.id)
      );
      // Sort by recency
      filtered = recentlyWatched
        .map((id) => filtered.find((ch) => ch.id === id))
        .filter(Boolean);
    }
    // Sorting
    if (sortOption === "title-az") {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === "title-za") {
      filtered = [...filtered].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortOption === "group") {
      filtered = [...filtered].sort((a, b) => a.group.localeCompare(b.group));
    }
    return filtered;
  }, [
    channels,
    searchQuery,
    selectedCategory,
    showFavorites,
    favorites,
    showRecentlyWatched,
    recentlyWatched,
    sortOption,
  ]);

  // Show skeleton loader if channels are loading (channels is empty and not filtered to zero by search)
  const showSkeleton =
    channels.length === 0 &&
    !searchQuery &&
    !selectedCategory &&
    !showFavorites &&
    !showRecentlyWatched;

  const handleChannelClick = (channel) => {
    onChannelSelect(channel);
    // Update recently watched
    setRecentlyWatched((prev) => {
      const filtered = prev.filter((id) => id !== channel.id);
      return [channel.id, ...filtered].slice(0, 10); // Keep max 10
    });
    if (window.innerWidth <= 768) {
      // Auto-close on mobile after selection
      onClose();
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Fetch EPG when modalChannel changes
  useEffect(() => {
    if (!modalChannel || !modalChannel.tvgId) return;
    setEpgError("");
    setEpgLoading(true);
    // Use a public demo EPG XML (RU region, small size for demo)
    const epgUrl = "https://iptv-org.github.io/epg/guides/ru.xml";
    if (epgCache.current[epgUrl]) {
      setEpgData(epgCache.current[epgUrl]);
      setEpgLoading(false);
      return;
    }
    fetch(epgUrl)
      .then((res) => res.text())
      .then((xml) => {
        // Parse XMLTV (very basic, for demo)
        const parser = new window.DOMParser();
        const doc = parser.parseFromString(xml, "text/xml");
        const progs = Array.from(doc.getElementsByTagName("programme")).map(
          (p) => ({
            start: p.getAttribute("start"),
            stop: p.getAttribute("stop"),
            channel: p.getAttribute("channel"),
            title: p.getElementsByTagName("title")[0]?.textContent || "",
            desc: p.getElementsByTagName("desc")[0]?.textContent || "",
          })
        );
        epgCache.current[epgUrl] = progs;
        setEpgData(progs);
        setEpgLoading(false);
      })
      .catch(() => {
        setEpgError("Failed to load EPG");
        setEpgLoading(false);
      });
  }, [modalChannel]);

  // Find current and next program for the channel
  let currentProg = null,
    nextProg = null;
  if (modalChannel && modalChannel.tvgId && epgData) {
    const now = new Date();
    const progs = epgData.filter((p) => p.channel === modalChannel.tvgId);
    for (let i = 0; i < progs.length; ++i) {
      const start = parseXmltvDate(progs[i].start);
      const stop = parseXmltvDate(progs[i].stop);
      if (now >= start && now < stop) {
        currentProg = progs[i];
        nextProg = progs[i + 1] || null;
        break;
      }
      if (now < start) {
        nextProg = progs[i];
        break;
      }
    }
  }

  function parseXmltvDate(str) {
    // Format: YYYYMMDDHHMMSS Z (e.g. 20240603120000 +0300)
    const y = str.slice(0, 4),
      m = str.slice(4, 6),
      d = str.slice(6, 8),
      h = str.slice(8, 10),
      min = str.slice(10, 12),
      s = str.slice(12, 14);
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
  }

  useEffect(() => {
    setHighlightedIndex(0);
  }, [
    searchQuery,
    selectedCategory,
    showFavorites,
    showRecentlyWatched,
    sortOption,
  ]);

  const handleSearchKeyDown = (e) => {
    if (filteredChannels.length === 0) return;
    if (e.key === "ArrowDown") {
      setHighlightedIndex((i) => Math.min(i + 1, filteredChannels.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (filteredChannels[highlightedIndex]) {
        handleChannelClick(filteredChannels[highlightedIndex]);
      }
      e.preventDefault();
    }
  };

  // Add global keydown handler for fullscreen overlay navigation
  useEffect(() => {
    if (!fullscreenOverlay) return;
    function handleGlobalKeyDown(e) {
      // If search input is focused, let its own handler work
      if (document.activeElement === searchInputRef.current) return;
      if (filteredChannels.length === 0) return;
      if (e.key === "ArrowDown") {
        setHighlightedIndex((i) =>
          Math.min(i + 1, filteredChannels.length - 1)
        );
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (filteredChannels[highlightedIndex]) {
          handleChannelClick(filteredChannels[highlightedIndex]);
        }
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [fullscreenOverlay, filteredChannels, highlightedIndex]);

  // Scroll to highlighted item in fullscreen overlay when it changes
  useEffect(() => {
    if (fullscreenOverlay && listRef.current) {
      listRef.current.scrollToItem(highlightedIndex, "smart");
    }
  }, [highlightedIndex, fullscreenOverlay]);

  useEffect(() => {
    if (fullscreenOverlay && initialHighlightedChannelId) {
      const idx = filteredChannels.findIndex(
        (ch) => ch.id === initialHighlightedChannelId
      );
      if (idx !== -1) setHighlightedIndex(idx);
    }
  }, [fullscreenOverlay, initialHighlightedChannelId, filteredChannels]);

  return fullscreenOverlay ? (
    <div className="fullscreen-channel-list-overlay">
      <div className="fullscreen-channel-list-modal">
        <button
          className="fullscreen-channel-list-close"
          onClick={onClose}
          title="Close"
          aria-label="Close channel list overlay"
        >
          ✕
        </button>
        <h2 className="fullscreen-channel-list-title">
          📺 Channel List{" "}
          <span className="count-badge">{filteredChannels.length}</span>
        </h2>
        <div className="fullscreen-channel-list-content">
          <div className="channel-list-header fullscreen">
            <div className="search-container fullscreen">
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input fullscreen"
                aria-label="Search channels"
                ref={externalSearchInputRef || searchInputRef}
                onKeyDown={handleSearchKeyDown}
              />
              <div className="search-icon">🔍</div>
            </div>
            <div className="filter-controls fullscreen">
              <button
                className={`category-filter${showFavorites ? " active" : ""}`}
                style={{ minWidth: 120 }}
                onClick={() => setShowFavorites((v) => !v)}
                title="Show Favorites"
                aria-pressed={showFavorites}
                aria-label="Show Favorites"
                tabIndex={0}
              >
                {showFavorites ? "★ Favorites" : "☆ Favorites"}
              </button>
              <button
                className={`category-filter${
                  showRecentlyWatched ? " active" : ""
                }`}
                style={{ minWidth: 120 }}
                onClick={() => setShowRecentlyWatched((v) => !v)}
                title="Show Recently Watched"
                aria-pressed={showRecentlyWatched}
                aria-label="Show Recently Watched"
                tabIndex={0}
              >
                {showRecentlyWatched
                  ? "⏱ Recently Watched"
                  : "⏱ Recently Watched"}
              </button>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-filter"
                aria-label="Filter by category"
                tabIndex={0}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category} ({channelGroups[category].length})
                  </option>
                ))}
              </select>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="category-filter"
                style={{ minWidth: 120 }}
                title="Sort channels"
                aria-label="Sort channels"
                tabIndex={0}
              >
                <option value="default">Sort: Default</option>
                <option value="title-az">Title (A-Z)</option>
                <option value="title-za">Title (Z-A)</option>
                <option value="group">Group</option>
              </select>
              <div className="view-toggle">
                <button
                  className={`view-button${
                    viewMode === "list" ? " active" : ""
                  }`}
                  onClick={() => setViewMode("list")}
                  title="List view"
                  aria-label="List view"
                  tabIndex={0}
                >
                  📃
                </button>
                <button
                  className={`view-button${
                    viewMode === "grid" ? " active" : ""
                  }`}
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                  aria-label="Grid view"
                  tabIndex={0}
                >
                  🟦
                </button>
              </div>
            </div>
          </div>
          <div className={`channels-container ${viewMode}`}>
            {showSkeleton ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="channel-item card skeleton">
                  <div className="channel-logo-container">
                    <div className="channel-logo-fallback skeleton-box" />
                  </div>
                  <div className="channel-info">
                    <div
                      className="channel-title skeleton-box"
                      style={{ width: "60%" }}
                    />
                    <div className="channel-meta">
                      <div
                        className="channel-group badge skeleton-box"
                        style={{ width: "40%" }}
                      />
                    </div>
                  </div>
                  <div className="channel-actions">
                    <div
                      className="favorite-button skeleton-box"
                      style={{ width: 24, height: 24, borderRadius: "50%" }}
                    />
                    <div
                      className="play-button skeleton-box"
                      style={{ width: 32, height: 32, borderRadius: "50%" }}
                    />
                    <div
                      className="info-button skeleton-box"
                      style={{ width: 24, height: 24, borderRadius: "50%" }}
                    />
                  </div>
                </div>
              ))
            ) : viewMode === "list" ? (
              <List
                ref={listRef}
                height={600}
                itemCount={filteredChannels.length}
                itemSize={80}
                width={"100%"}
                style={{ overflowX: "hidden" }}
              >
                {({ index, style }) => {
                  const channel = filteredChannels[index];
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <div
                      key={channel.id}
                      style={style}
                      className={`channel-item card ${
                        selectedChannel?.id === channel.id ? "selected" : ""
                      } ${isHighlighted ? "active" : ""}`}
                      onClick={() => handleChannelClick(channel)}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedChannel?.id === channel.id}
                      aria-label={`Select channel ${channel.title}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleChannelClick(channel);
                      }}
                    >
                      <div className="channel-logo-container">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.title}
                            className="channel-logo"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="channel-logo-fallback"
                          style={{ display: channel.logo ? "none" : "flex" }}
                        >
                          {channel.country ? (
                            <span className="flag">🌍</span>
                          ) : (
                            "📺"
                          )}
                        </div>
                      </div>
                      <div className="channel-info">
                        <h3 className="channel-title">{channel.title}</h3>
                        <div className="channel-meta">
                          <span
                            className="channel-group badge"
                            title={channel.group}
                          >
                            📁 {channel.group}
                          </span>
                          {channel.country && (
                            <span className="channel-country badge">
                              🌍 {channel.country}
                            </span>
                          )}
                          {channel.language && (
                            <span className="channel-language badge">
                              🗣️ {channel.language}
                            </span>
                          )}
                          {channel.radio && (
                            <span className="channel-type badge">📻 Radio</span>
                          )}
                        </div>
                      </div>
                      <div className="channel-actions">
                        <button
                          className={`favorite-button${
                            favorites.includes(channel.id) ? " favorited" : ""
                          }`}
                          title={
                            favorites.includes(channel.id)
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          aria-label={
                            favorites.includes(channel.id)
                              ? `Remove ${channel.title} from favorites`
                              : `Add ${channel.title} to favorites`
                          }
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(channel.id);
                          }}
                        >
                          {favorites.includes(channel.id) ? "★" : "☆"}
                        </button>
                        <button
                          className="play-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChannelClick(channel);
                          }}
                          title="Play channel"
                          aria-label={`Play channel ${channel.title}`}
                          tabIndex={0}
                        >
                          ▶️
                        </button>
                        <button
                          className="info-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalChannel(channel);
                          }}
                          title="Channel info"
                          aria-label={`Show info for channel ${channel.title}`}
                          tabIndex={0}
                        >
                          ℹ️
                        </button>
                      </div>
                    </div>
                  );
                }}
              </List>
            ) : filteredChannels.length === 0 ? (
              <div className="no-channels">
                <div className="no-channels-icon">📭</div>
                <h3>No channels found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              filteredChannels.map((channel, idx) => (
                <div
                  key={channel.id}
                  className={`channel-item card ${
                    selectedChannel?.id === channel.id ? "selected" : ""
                  } ${idx === highlightedIndex ? "active" : ""}`}
                  onClick={() => handleChannelClick(channel)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedChannel?.id === channel.id}
                  aria-label={`Select channel ${channel.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleChannelClick(channel);
                  }}
                >
                  <div className="channel-logo-container">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.title}
                        className="channel-logo"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="channel-logo-fallback"
                      style={{ display: channel.logo ? "none" : "flex" }}
                    >
                      {channel.country ? (
                        <span className="flag">🌍</span>
                      ) : (
                        "📺"
                      )}
                    </div>
                  </div>
                  <div className="channel-info">
                    <h3 className="channel-title">{channel.title}</h3>
                    <div className="channel-meta">
                      <span
                        className="channel-group badge"
                        title={channel.group}
                      >
                        📁 {channel.group}
                      </span>
                      {channel.country && (
                        <span className="channel-country badge">
                          🌍 {channel.country}
                        </span>
                      )}
                      {channel.language && (
                        <span className="channel-language badge">
                          🗣️ {channel.language}
                        </span>
                      )}
                      {channel.radio && (
                        <span className="channel-type badge">📻 Radio</span>
                      )}
                    </div>
                  </div>
                  <div className="channel-actions">
                    <button
                      className={`favorite-button${
                        favorites.includes(channel.id) ? " favorited" : ""
                      }`}
                      title={
                        favorites.includes(channel.id)
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      aria-label={
                        favorites.includes(channel.id)
                          ? `Remove ${channel.title} from favorites`
                          : `Add ${channel.title} to favorites`
                      }
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(channel.id);
                      }}
                    >
                      {favorites.includes(channel.id) ? "★" : "☆"}
                    </button>
                    <button
                      className="play-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChannelClick(channel);
                      }}
                      title="Play channel"
                      aria-label={`Play channel ${channel.title}`}
                      tabIndex={0}
                    >
                      ▶️
                    </button>
                    <button
                      className="info-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalChannel(channel);
                      }}
                      title="Channel info"
                      aria-label={`Show info for channel ${channel.title}`}
                      tabIndex={0}
                    >
                      ℹ️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="channel-list rich">
      {/* Channel Info Modal */}
      {modalChannel && (
        <ChannelInfoModal
          channel={modalChannel}
          epgData={epgData}
          epgLoading={epgLoading}
          epgError={epgError}
          currentProg={currentProg}
          nextProg={nextProg}
          onClose={() => setModalChannel(null)}
        />
      )}
      <div className="channel-list-header">
        <div className="header-top">
          <h2>
            📺 Channels{" "}
            <span className="count-badge">{filteredChannels.length}</span>
          </h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search channels"
            ref={externalSearchInputRef || searchInputRef}
            onKeyDown={handleSearchKeyDown}
          />
          <div className="search-icon">🔍</div>
        </div>

        <div className="filter-controls">
          <button
            className={`category-filter${showFavorites ? " active" : ""}`}
            style={{ minWidth: 120 }}
            onClick={() => setShowFavorites((v) => !v)}
            title="Show Favorites"
            aria-pressed={showFavorites}
            aria-label="Show Favorites"
            tabIndex={0}
          >
            {showFavorites ? "★ Favorites" : "☆ Favorites"}
          </button>
          <button
            className={`category-filter${showRecentlyWatched ? " active" : ""}`}
            style={{ minWidth: 120 }}
            onClick={() => setShowRecentlyWatched((v) => !v)}
            title="Show Recently Watched"
            aria-pressed={showRecentlyWatched}
            aria-label="Show Recently Watched"
            tabIndex={0}
          >
            {showRecentlyWatched ? "⏱ Recently Watched" : "⏱ Recently Watched"}
          </button>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
            aria-label="Filter by category"
            tabIndex={0}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category} ({channelGroups[category].length})
              </option>
            ))}
          </select>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="category-filter"
            style={{ minWidth: 120 }}
            title="Sort channels"
            aria-label="Sort channels"
            tabIndex={0}
          >
            <option value="default">Sort: Default</option>
            <option value="title-az">Title (A-Z)</option>
            <option value="title-za">Title (Z-A)</option>
            <option value="group">Group</option>
          </select>
          <div className="view-toggle">
            <button
              className={`view-button ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              ☰
            </button>
            <button
              className={`view-button ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
        </div>
      </div>

      <div className={`channels-container ${viewMode}`}>
        {showSkeleton ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="channel-item card skeleton">
              <div className="channel-logo-container">
                <div className="channel-logo-fallback skeleton-box" />
              </div>
              <div className="channel-info">
                <div
                  className="channel-title skeleton-box"
                  style={{ width: "60%" }}
                />
                <div className="channel-meta">
                  <div
                    className="channel-group badge skeleton-box"
                    style={{ width: "40%" }}
                  />
                </div>
              </div>
              <div className="channel-actions">
                <div
                  className="favorite-button skeleton-box"
                  style={{ width: 24, height: 24, borderRadius: "50%" }}
                />
                <div
                  className="play-button skeleton-box"
                  style={{ width: 32, height: 32, borderRadius: "50%" }}
                />
                <div
                  className="info-button skeleton-box"
                  style={{ width: 24, height: 24, borderRadius: "50%" }}
                />
              </div>
            </div>
          ))
        ) : viewMode === "list" ? (
          <List
            ref={listRef}
            height={600}
            itemCount={filteredChannels.length}
            itemSize={80}
            width={"100%"}
            style={{ overflowX: "hidden" }}
          >
            {({ index, style }) => {
              const channel = filteredChannels[index];
              const isHighlighted = index === highlightedIndex;
              return (
                <div
                  key={channel.id}
                  style={style}
                  className={`channel-item card ${
                    selectedChannel?.id === channel.id ? "selected" : ""
                  } ${isHighlighted ? "active" : ""}`}
                  onClick={() => handleChannelClick(channel)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedChannel?.id === channel.id}
                  aria-label={`Select channel ${channel.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleChannelClick(channel);
                  }}
                >
                  <div className="channel-logo-container">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.title}
                        className="channel-logo"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="channel-logo-fallback"
                      style={{ display: channel.logo ? "none" : "flex" }}
                    >
                      {channel.country ? (
                        <span className="flag">🌍</span>
                      ) : (
                        "📺"
                      )}
                    </div>
                  </div>

                  <div className="channel-info">
                    <h3 className="channel-title">{channel.title}</h3>
                    <div className="channel-meta">
                      <span
                        className="channel-group badge"
                        title={channel.group}
                      >
                        📁 {channel.group}
                      </span>
                      {channel.country && (
                        <span className="channel-country badge">
                          🌍 {channel.country}
                        </span>
                      )}
                      {channel.language && (
                        <span className="channel-language badge">
                          🗣️ {channel.language}
                        </span>
                      )}
                      {channel.radio && (
                        <span className="channel-type badge">📻 Radio</span>
                      )}
                    </div>
                  </div>

                  <div className="channel-actions">
                    <button
                      className={`favorite-button${
                        favorites.includes(channel.id) ? " favorited" : ""
                      }`}
                      title={
                        favorites.includes(channel.id)
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      aria-label={
                        favorites.includes(channel.id)
                          ? `Remove ${channel.title} from favorites`
                          : `Add ${channel.title} to favorites`
                      }
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(channel.id);
                      }}
                    >
                      {favorites.includes(channel.id) ? "★" : "☆"}
                    </button>
                    <button
                      className="play-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChannelClick(channel);
                      }}
                      title="Play channel"
                      aria-label={`Play channel ${channel.title}`}
                      tabIndex={0}
                    >
                      ▶️
                    </button>
                    <button
                      className="info-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalChannel(channel);
                      }}
                      title="Channel info"
                      aria-label={`Show info for channel ${channel.title}`}
                      tabIndex={0}
                    >
                      ℹ️
                    </button>
                  </div>
                </div>
              );
            }}
          </List>
        ) : filteredChannels.length === 0 ? (
          <div className="no-channels">
            <div className="no-channels-icon">📭</div>
            <h3>No channels found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredChannels.map((channel, idx) => (
            <div
              key={channel.id}
              className={`channel-item card ${
                selectedChannel?.id === channel.id ? "selected" : ""
              } ${idx === highlightedIndex ? "active" : ""}`}
              onClick={() => handleChannelClick(channel)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedChannel?.id === channel.id}
              aria-label={`Select channel ${channel.title}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleChannelClick(channel);
              }}
            >
              <div className="channel-logo-container">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.title}
                    className="channel-logo"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="channel-logo-fallback"
                  style={{ display: channel.logo ? "none" : "flex" }}
                >
                  {channel.country ? <span className="flag">🌍</span> : "📺"}
                </div>
              </div>

              <div className="channel-info">
                <h3 className="channel-title">{channel.title}</h3>
                <div className="channel-meta">
                  <span className="channel-group badge" title={channel.group}>
                    📁 {channel.group}
                  </span>
                  {channel.country && (
                    <span className="channel-country badge">
                      🌍 {channel.country}
                    </span>
                  )}
                  {channel.language && (
                    <span className="channel-language badge">
                      🗣️ {channel.language}
                    </span>
                  )}
                  {channel.radio && (
                    <span className="channel-type badge">📻 Radio</span>
                  )}
                </div>
              </div>

              <div className="channel-actions">
                <button
                  className={`favorite-button${
                    favorites.includes(channel.id) ? " favorited" : ""
                  }`}
                  title={
                    favorites.includes(channel.id)
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                  aria-label={
                    favorites.includes(channel.id)
                      ? `Remove ${channel.title} from favorites`
                      : `Add ${channel.title} to favorites`
                  }
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(channel.id);
                  }}
                >
                  {favorites.includes(channel.id) ? "★" : "☆"}
                </button>
                <button
                  className="play-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChannelClick(channel);
                  }}
                  title="Play channel"
                  aria-label={`Play channel ${channel.title}`}
                  tabIndex={0}
                >
                  ▶️
                </button>
                <button
                  className="info-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalChannel(channel);
                  }}
                  title="Channel info"
                  aria-label={`Show info for channel ${channel.title}`}
                  tabIndex={0}
                >
                  ℹ️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChannelList;
