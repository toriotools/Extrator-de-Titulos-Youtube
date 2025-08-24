export interface VideoData {
  id: string; // This will be the YouTube Video ID
  title: string;
  views: string; // Keep as string for display, API returns it as string too for large numbers
  publishedAt?: string; // ISO date string for when the video was published
}

export enum ExtractionState {
  IDLE,
  VALIDATING_INPUT, // Validating API Key and URL
  FETCHING_CHANNEL_INFO_API,
  FETCHING_PLAYLIST_ITEMS_API,
  FETCHING_VIDEO_STATS_API,
  COMPLETED,
  ERROR,
}

export interface ExtractionProgress {
  state: ExtractionState;
  message: string;
  videosFound: number; // Total videos identified from playlist
  videosProcessedForStats: number; // Videos for which stats have been fetched
  currentPage?: number; // For paginated API calls
  totalPages?: number; // Estimated total pages for playlist items
}

// Interfaces for YouTube Data API v3 responses (simplified)

export interface ChannelListResponse {
  items?: ChannelResource[];
  error?: ApiError;
}
export interface ChannelResource {
  id: string;
  snippet?: {
    title: string;
    description?: string;
    thumbnails?: any;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

export interface PlaylistItemListResponse {
  items?: PlaylistItemResource[];
  nextPageToken?: string;
  pageInfo?: {
    totalResults?: number;
    resultsPerPage?: number;
  };
  error?: ApiError;
}
export interface PlaylistItemResource {
  snippet?: {
    title: string;
    description?: string;
    publishedAt?: string;
    resourceId?: {
      videoId?: string;
    };
    thumbnails?: any;
    videoOwnerChannelTitle?: string;
    videoOwnerChannelId?: string;
  };
}

export interface VideoListResponse {
  items?: VideoResource[];
  error?: ApiError;
}
export interface VideoResource {
  id: string;
  snippet?: {
    title: string;
    description?: string;
    publishedAt?: string;
    channelId?: string;
    channelTitle?: string;
    tags?: string[];
    categoryId?: string;
    liveBroadcastContent?: string;
    defaultLanguage?: string;
    localized?: {
      title: string;
      description: string;
    };
    defaultAudioLanguage?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    dislikeCount?: string; // May not be available
    favoriteCount?: string;
    commentCount?: string;
  };
}

export interface ApiError {
  code: number;
  message: string;
  errors: {
    message: string;
    domain: string;
    reason: string;
  }[];
}