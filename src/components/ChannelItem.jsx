import React from "react";

const ChannelItem = ({
  channel,
  isSelected,
  isHighlighted,
  onClick,
  onFavorite,
  onInfo,
  isFavorite,
}) => (
  <div
    className={`channel-item card ${isSelected ? "selected" : ""} ${
      isHighlighted ? "active" : ""
    }`}
    onClick={onClick}
    tabIndex={0}
    role="button"
    aria-pressed={isSelected}
    aria-label={`Select channel ${channel.title}`}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") onClick();
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
          <span className="channel-country badge">🌍 {channel.country}</span>
        )}
        {channel.language && (
          <span className="channel-language badge">🗣️ {channel.language}</span>
        )}
        {channel.radio && <span className="channel-type badge">📻 Radio</span>}
      </div>
    </div>
    <div className="channel-actions">
      <button
        className={`favorite-button${isFavorite ? " favorited" : ""}`}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={
          isFavorite
            ? `Remove ${channel.title} from favorites`
            : `Add ${channel.title} to favorites`
        }
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onFavorite();
        }}
      >
        {isFavorite ? "★" : "☆"}
      </button>
      <button
        className="play-button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
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
          onInfo();
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

export default ChannelItem;
