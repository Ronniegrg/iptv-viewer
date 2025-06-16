// Error types for IPTV application
export const ErrorTypes = {
  NETWORK: "NETWORK_ERROR",
  STREAM: "STREAM_ERROR",
  PLAYLIST: "PLAYLIST_ERROR",
  VALIDATION: "VALIDATION_ERROR",
  UNKNOWN: "UNKNOWN_ERROR",
};

// Error messages for different scenarios
export const ErrorMessages = {
  [ErrorTypes.NETWORK]: {
    title: "Network Error",
    message:
      "Unable to connect to the server. Please check your internet connection.",
    suggestion: "Try refreshing the page or check your network connection.",
  },
  [ErrorTypes.STREAM]: {
    title: "Stream Error",
    message: "Unable to play this channel. The stream might be unavailable.",
    suggestion: "Try another channel or check back later.",
  },
  [ErrorTypes.PLAYLIST]: {
    title: "Playlist Error",
    message: "Unable to load the channel list.",
    suggestion: "Try loading a different playlist or check the URL.",
  },
  [ErrorTypes.VALIDATION]: {
    title: "Invalid Channel",
    message: "This channel appears to be invalid or corrupted.",
    suggestion: "Try selecting a different channel.",
  },
  [ErrorTypes.UNKNOWN]: {
    title: "Unexpected Error",
    message: "Something went wrong. Please try again.",
    suggestion: "Refresh the page or try again later.",
  },
};

// Function to classify errors
export const classifyError = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;

  // Network errors
  if (
    error.message?.includes("Network Error") ||
    error.message?.includes("timeout") ||
    error.message?.includes("network")
  ) {
    return ErrorTypes.NETWORK;
  }

  // Stream errors
  if (
    error.message?.includes("stream") ||
    error.message?.includes("playback") ||
    error.message?.includes("media")
  ) {
    return ErrorTypes.STREAM;
  }

  // Playlist errors
  if (
    error.message?.includes("playlist") ||
    error.message?.includes("m3u") ||
    error.message?.includes("parse")
  ) {
    return ErrorTypes.PLAYLIST;
  }

  // Validation errors
  if (
    error.message?.includes("invalid") ||
    error.message?.includes("validation") ||
    error.message?.includes("format")
  ) {
    return ErrorTypes.VALIDATION;
  }

  return ErrorTypes.UNKNOWN;
};

// Function to get error details
export const getErrorDetails = (error) => {
  const type = classifyError(error);
  const details = ErrorMessages[type];

  return {
    type,
    title: details.title,
    message: details.message,
    suggestion: details.suggestion,
    originalError: error,
    timestamp: new Date().toISOString(),
  };
};

// Function to handle retry logic with exponential backoff
export const createRetryHandler = (maxRetries = 3, baseDelay = 1000) => {
  let retryCount = 0;
  let timeoutId = null;

  const clearRetry = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const retry = (callback) => {
    clearRetry();

    if (retryCount >= maxRetries) {
      retryCount = 0;
      return false;
    }

    const delay = baseDelay * Math.pow(2, retryCount);
    timeoutId = setTimeout(() => {
      retryCount++;
      callback();
    }, delay);

    return true;
  };

  return {
    retry,
    clearRetry,
    getRetryCount: () => retryCount,
    reset: () => {
      retryCount = 0;
      clearRetry();
    },
  };
};

// Function to log errors for debugging
export const logError = (error, context = {}) => {
  const errorDetails = getErrorDetails(error);
  console.error("Error occurred:", {
    ...errorDetails,
    context,
    stack: error.stack,
  });

  // Here you could add error reporting service integration
  // e.g., Sentry, LogRocket, etc.
};
