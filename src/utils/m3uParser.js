/**
 * M3U Playlist Parser
 * Parses M3U playlist files and extracts channel information
 */

export function parseM3U(content) {
  const lines = content.split("\n").map((line) => line.trim());
  const channels = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("#EXTINF:")) {
      // Parse the EXTINF line
      const extinfData = parseExtinf(line);
      const nextLine = lines[i + 1];

      if (nextLine && !nextLine.startsWith("#")) {
        // Next line should be the URL
        const channel = {
          id: channels.length + 1,
          url: nextLine.trim(),
          ...extinfData,
        };
        channels.push(channel);
        i++; // Skip the URL line in next iteration
      }
    }
  }

  return channels;
}

function parseExtinf(extinf) {
  // Remove #EXTINF: prefix
  const content = extinf.substring(8);

  // Split by comma to separate duration and metadata
  const commaIndex = content.indexOf(",");
  if (commaIndex === -1) return {};

  const metadataStr = content.substring(0, commaIndex);
  const title = content.substring(commaIndex + 1).trim();

  // Parse metadata attributes
  const metadata = parseMetadata(metadataStr);

  return {
    title: title || "Unknown Channel",
    duration: metadata.duration || -1,
    logo: metadata["tvg-logo"] || metadata.logo || "",
    group: metadata["group-title"] || metadata.group || "Uncategorized",
    country: metadata["tvg-country"] || metadata.country || "",
    language: metadata["tvg-language"] || metadata.language || "",
    tvgId: metadata["tvg-id"] || "",
    tvgName: metadata["tvg-name"] || "",
    radio: metadata.radio === "true",
  };
}

function parseMetadata(metadataStr) {
  const metadata = {};

  // Extract duration (first number)
  const durationMatch = metadataStr.match(/^(-?\d+(?:\.\d+)?)/);
  if (durationMatch) {
    metadata.duration = parseFloat(durationMatch[1]);
  }

  // Extract key-value pairs
  const kvRegex = /(\w+(?:-\w+)*)="([^"]*?)"/g;
  let match;

  while ((match = kvRegex.exec(metadataStr)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2];
    metadata[key] = value;
  }

  return metadata;
}

export function groupChannelsByCategory(channels) {
  const groups = {};

  channels.forEach((channel) => {
    const category = channel.group || "Uncategorized";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(channel);
  });

  return groups;
}

export function searchChannels(channels, query) {
  if (!query.trim()) return channels;

  const searchTerm = query.toLowerCase();
  return channels.filter(
    (channel) =>
      channel.title.toLowerCase().includes(searchTerm) ||
      channel.group.toLowerCase().includes(searchTerm) ||
      channel.country.toLowerCase().includes(searchTerm)
  );
}
