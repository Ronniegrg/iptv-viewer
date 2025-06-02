import { useState, useMemo } from "react";
import { searchChannels, groupChannelsByCategory } from "../utils/m3uParser";
import "./ChannelList.css";

const ChannelList = ({
  channels,
  selectedChannel,
  onChannelSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  const [favorites, setFavorites] = useState([]);

  const filteredChannels = useMemo(() => {
    let filtered = searchChannels(channels, searchQuery);

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (channel) => channel.group === selectedCategory
      );
    }

    return filtered;
  }, [channels, searchQuery, selectedCategory]);

  const channelGroups = useMemo(() => {
    return groupChannelsByCategory(channels);
  }, [channels]);

  const categories = useMemo(() => {
    return Object.keys(channelGroups).sort();
  }, [channelGroups]);

  const handleChannelClick = (channel) => {
    onChannelSelect(channel);
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

  return (
    <div className="channel-list rich">
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
          />
          <div className="search-icon">🔍</div>
        </div>

        <div className="filter-controls">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category} ({channelGroups[category].length})
              </option>
            ))}
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
        {filteredChannels.length === 0 ? (
          <div className="no-channels">
            <div className="no-channels-icon">📭</div>
            <h3>No channels found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item card ${
                selectedChannel?.id === channel.id ? "selected" : ""
              }`}
              onClick={() => handleChannelClick(channel)}
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
                  <span className="channel-group badge">
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
                >
                  ▶️
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
