import React from "react";

const ChannelInfoModal = ({
  channel,
  currentProg,
  nextProg,
  epgLoading,
  epgError,
  onClose,
}) => (
  <div className="channel-info-modal">
    <button
      className="close-button"
      onClick={onClose}
      title="Close"
      aria-label="Close info modal"
    >
      ✕
    </button>
    <h2>{channel.title}</h2>
    <div className="channel-meta">
      <span className="channel-group badge">📁 {channel.group}</span>
      {channel.country && (
        <span className="channel-country badge">🌍 {channel.country}</span>
      )}
      {channel.language && (
        <span className="channel-language badge">🗣️ {channel.language}</span>
      )}
      {channel.radio && <span className="channel-type badge">📻 Radio</span>}
    </div>
    {epgLoading ? (
      <p>Loading EPG...</p>
    ) : epgError ? (
      <p className="error">{epgError}</p>
    ) : (
      <>
        {currentProg && (
          <div className="epg-current">
            <strong>Now:</strong> {currentProg.title} <br />
            <span>{currentProg.desc}</span>
          </div>
        )}
        {nextProg && (
          <div className="epg-next">
            <strong>Next:</strong> {nextProg.title} <br />
            <span>{nextProg.desc}</span>
          </div>
        )}
      </>
    )}
  </div>
);

export default ChannelInfoModal;
