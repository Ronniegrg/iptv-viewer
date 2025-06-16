import React, { useState } from "react";
import { useContinueWatching } from "../hooks/useContinueWatching";
import "./ContinueWatching.css";

const getChannelLogo = (channelId, channels) => {
  // Try to find the channel in the list and return its logo if available
  if (!channels) return null;
  const found = channels.find((ch) => ch.id === channelId);
  return found?.logo || null;
};

const getChannelObject = (channelId, channels) => {
  if (!channels) return null;
  return channels.find((ch) => ch.id === channelId) || null;
};

const ChannelHoverCard = ({ channel, lastWatched, logo }) => {
  if (!channel) return null;
  return (
    <div className="cw-hover-card">
      <div className="cw-hover-header">
        {logo ? (
          <img className="cw-hover-logo" src={logo} alt={channel.name} />
        ) : (
          <div
            className="cw-hover-logo"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              color: "#888",
            }}
          >
            📺
          </div>
        )}
        <div>
          <div className="cw-hover-title">{channel.name || channel.title}</div>
          {channel.group && (
            <div className="cw-hover-group">{channel.group}</div>
          )}
        </div>
      </div>
      {channel.description && (
        <div className="cw-hover-desc">{channel.description}</div>
      )}
      <div className="cw-hover-meta" style={{ marginBottom: 6 }}>
        {channel.country && (
          <span className="channel-country badge" style={{ marginRight: 6 }}>
            🌍 {channel.country}
          </span>
        )}
        {channel.language && (
          <span className="channel-language badge" style={{ marginRight: 6 }}>
            🗣️ {channel.language}
          </span>
        )}
        {channel.radio && <span className="channel-type badge">📻 Radio</span>}
      </div>
      <div className="cw-hover-date">
        Last watched: {new Date(lastWatched).toLocaleString()}
      </div>
    </div>
  );
};

const ContinueWatching = ({ onChannelSelect, channels }) => {
  const { continueWatching, removeFromContinueWatching } =
    useContinueWatching();
  const [hoveredId, setHoveredId] = useState(null);

  if (continueWatching.length === 0) {
    return null;
  }

  return (
    <div className="continue-watching-section">
      <h2>Continue Watching</h2>
      <div className="continue-watching-list">
        {continueWatching.map((item) => {
          const channelObj = getChannelObject(item.channelId, channels);
          const logo = getChannelLogo(item.channelId, channels);
          return (
            <div
              key={item.channelId}
              className="continue-watching-item"
              title={item.channelName}
              onClick={() => channelObj && onChannelSelect(channelObj)}
              onMouseEnter={() => setHoveredId(item.channelId)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ position: "relative" }}
            >
              {hoveredId === item.channelId && (
                <ChannelHoverCard
                  channel={channelObj}
                  lastWatched={item.timestamp}
                  logo={logo}
                />
              )}
              <div className="channel-info">
                {logo ? (
                  <img
                    className="channel-logo"
                    src={logo}
                    alt={item.channelName}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="channel-logo"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      color: "#888",
                    }}
                  >
                    📺
                  </div>
                )}
                <div>
                  <div className="channel-name">{item.channelName}</div>
                  <div className="last-watched">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                className="remove-button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromContinueWatching(item.channelId);
                }}
                title="Remove from continue watching"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContinueWatching;
