import { 
  VideoData, 
  ExtractionProgress, 
  ExtractionState, 
  ChannelListResponse, 
  PlaylistItemListResponse,
  VideoListResponse,
  PlaylistItemResource,
  VideoResource
} from '../types';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS_PER_PAGE = 50;

// --- Channel Identifier Logic (kept from previous) ---
interface ChannelIdentifier {
  type: 'id' | 'forHandle' | 'forUsername';
  value: string;
}

export const getChannelIdentifier = (youtubeUrl: string): ChannelIdentifier | null => {
  try {
    const url = new URL(youtubeUrl);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (pathSegments.length >= 1) {
      const firstSegment = pathSegments[0];
      const secondSegment = pathSegments[1];

      if (firstSegment.startsWith('@')) {
        return { type: 'forHandle', value: firstSegment };
      }
      if (firstSegment === 'channel' && secondSegment) {
        return { type: 'id', value: secondSegment };
      }
      if (firstSegment === 'c' && secondSegment) {
        return { type: 'forUsername', value: secondSegment };
      }
      if (firstSegment === 'user' && secondSegment) {
        return { type: 'forUsername', value: secondSegment };
      }
      if (pathSegments.length === 1 && !firstSegment.includes('/') && !['channel', 'c', 'user', 'videos', 'featured', 'playlists', 'community', 'about', 'live'].includes(firstSegment)) {
         // If only one segment and it doesn't look like a standard tab, assume it's a handle or legacy username.
         // Handles are often submitted without '@' and the API can resolve them with forHandle.
         // If it starts with UC, it's an ID.
         if (firstSegment.startsWith('UC')) {
            return { type: 'id', value: firstSegment };
         }
        // Prefer 'forHandle' if it doesn't look like an ID, as it's the more modern approach.
        return { type: 'forHandle', value: firstSegment };
      }
    }
  } catch (e) {
    console.error("Error parsing YouTube URL for identifier:", e);
    return null;
  }
  console.warn("Could not determine channel identifier type from URL:", youtubeUrl);
  return null;
};

// --- New API-based Video Extraction Service ---

export interface ApiServiceResult {
  officialChannelTitle: string | null;
  videos: VideoData[];
  error: string | null;
}

type ProgressCallback = (update: Partial<ExtractionProgress>) => void;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const extractChannelVideosViaAPI = async (
  channelUrl: string,
  apiKey: string,
  onProgress: ProgressCallback
): Promise<ApiServiceResult> => {
  if (!apiKey) {
    return { officialChannelTitle: null, videos: [], error: 'Chave da API do YouTube é obrigatória.' };
  }

  onProgress({ state: ExtractionState.VALIDATING_INPUT, message: 'Identificando canal...' });
  const identifier = getChannelIdentifier(channelUrl);
  if (!identifier) {
    return { officialChannelTitle: null, videos: [], error: 'Não foi possível identificar o canal a partir da URL fornecida.' };
  }

  let channelId: string | null = null;
  let uploadsPlaylistId: string | null = null;
  let officialChannelTitle: string | null = null;

  // 1. Fetch Channel Info (ID, Title, Uploads Playlist ID)
  onProgress({ state: ExtractionState.FETCHING_CHANNEL_INFO_API, message: 'Buscando informações do canal via API...' });
  try {
    let channelApiUrl = `${YOUTUBE_API_BASE_URL}/channels?part=snippet,contentDetails&key=${apiKey}`;
    if (identifier.type === 'id') {
      channelApiUrl += `&id=${identifier.value}`;
    } else if (identifier.type === 'forHandle') {
      const handleValue = identifier.value.startsWith('@') ? identifier.value.substring(1) : identifier.value;
      channelApiUrl += `&forHandle=${handleValue}`;
    } else { // forUsername
      channelApiUrl += `&forUsername=${identifier.value}`;
    }
    
    const channelResponse = await fetch(channelApiUrl);
    const channelData: ChannelListResponse = await channelResponse.json();

    if (!channelResponse.ok || channelData.error) {
      const errorMsg = channelData.error?.message || `Erro da API ao buscar canal: ${channelResponse.status}`;
      console.error('Channel API Error:', channelData.error || errorMsg);
      return { officialChannelTitle: null, videos: [], error: errorMsg };
    }

    if (!channelData.items || channelData.items.length === 0) {
      return { officialChannelTitle: null, videos: [], error: 'Canal não encontrado pela API com o identificador fornecido.' };
    }

    const channelResource = channelData.items[0];
    channelId = channelResource.id;
    officialChannelTitle = channelResource.snippet?.title || 'Título do Canal Indisponível';
    uploadsPlaylistId = channelResource.contentDetails?.relatedPlaylists?.uploads || null;

    if (!uploadsPlaylistId) {
      return { officialChannelTitle, videos: [], error: 'Não foi possível encontrar a playlist de uploads para este canal.' };
    }
    onProgress({ message: `Canal "${officialChannelTitle}" encontrado. ID da Playlist de Uploads: ${uploadsPlaylistId}` });

  } catch (e: any) {
    console.error('Error fetching channel info:', e);
    return { officialChannelTitle: null, videos: [], error: `Erro de rede ao buscar informações do canal: ${e.message}` };
  }

  // 2. Fetch Video Items from Uploads Playlist (paginated)
  const allVideoItems: { id: string; title: string; publishedAt?: string }[] = [];
  let nextPageToken: string | undefined = undefined;
  let currentPage = 0;
  const estimatedTotalVideos = 0; // Will be updated if pageInfo is available
  let totalPagesEstimate = 1; // Start with 1, update if more pages

  onProgress({ 
    state: ExtractionState.FETCHING_PLAYLIST_ITEMS_API, 
    message: 'Buscando lista de vídeos da playlist de uploads...',
    videosFound: 0,
    currentPage: 0,
    totalPages: totalPagesEstimate
  });

  do {
    currentPage++;
    onProgress({ 
        message: `Buscando página ${currentPage} de vídeos da playlist...`,
        currentPage: currentPage,
        totalPages: totalPagesEstimate
    });

    let playlistItemsApiUrl = `${YOUTUBE_API_BASE_URL}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${MAX_RESULTS_PER_PAGE}&key=${apiKey}`;
    if (nextPageToken) {
      playlistItemsApiUrl += `&pageToken=${nextPageToken}`;
    }

    try {
      await delay(200); // Small delay to be polite to the API
      const playlistItemsResponse = await fetch(playlistItemsApiUrl);
      const playlistItemsData: PlaylistItemListResponse = await playlistItemsResponse.json();

      if (!playlistItemsResponse.ok || playlistItemsData.error) {
        const errorMsg = playlistItemsData.error?.message || `Erro da API ao buscar itens da playlist (página ${currentPage}): ${playlistItemsResponse.status}`;
        console.error('PlaylistItems API Error:', playlistItemsData.error || errorMsg);
        // Return videos fetched so far with an error for partial results
        return { officialChannelTitle, videos: [], error: `${errorMsg}. A extração de vídeos pode estar incompleta.` };
      }
      
      if (playlistItemsData.pageInfo?.totalResults && currentPage === 1) {
        totalPagesEstimate = Math.ceil(playlistItemsData.pageInfo.totalResults / MAX_RESULTS_PER_PAGE);
        onProgress({ totalPages: totalPagesEstimate });
      }


      playlistItemsData.items?.forEach((item: PlaylistItemResource) => {
        if (item.snippet?.resourceId?.videoId && item.snippet?.title) {
          allVideoItems.push({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
          });
        }
      });
      
      onProgress({ videosFound: allVideoItems.length });
      nextPageToken = playlistItemsData.nextPageToken;

    } catch (e: any) {
      console.error(`Error fetching playlist items (page ${currentPage}):`, e);
      return { officialChannelTitle, videos: [], error: `Erro de rede ao buscar itens da playlist (página ${currentPage}): ${e.message}. Extração incompleta.` };
    }
  } while (nextPageToken);
  
  onProgress({ message: `${allVideoItems.length} IDs de vídeo obtidos. Buscando estatísticas...`, videosFound: allVideoItems.length });

  // 3. Fetch Video Statistics (View Counts) in batches
  const finalVideos: VideoData[] = [];
  onProgress({ state: ExtractionState.FETCHING_VIDEO_STATS_API, videosProcessedForStats: 0 });

  for (let i = 0; i < allVideoItems.length; i += MAX_RESULTS_PER_PAGE) {
    const batchVideoItems = allVideoItems.slice(i, i + MAX_RESULTS_PER_PAGE);
    const videoIdsToFetch = batchVideoItems.map(v => v.id).join(',');
    
    onProgress({ 
        message: `Buscando estatísticas para o lote de vídeos ${Math.floor(i / MAX_RESULTS_PER_PAGE) + 1} de ${Math.ceil(allVideoItems.length / MAX_RESULTS_PER_PAGE)}...`,
    });

    let videoStatsApiUrl = `${YOUTUBE_API_BASE_URL}/videos?part=statistics&id=${videoIdsToFetch}&key=${apiKey}`;
    try {
      await delay(200); // Small delay
      const videoStatsResponse = await fetch(videoStatsApiUrl);
      const videoStatsData: VideoListResponse = await videoStatsResponse.json();

      if (!videoStatsResponse.ok || videoStatsData.error) {
        const errorMsg = videoStatsData.error?.message || `Erro da API ao buscar estatísticas de vídeos: ${videoStatsResponse.status}`;
        console.warn('VideoStats API Error:', videoStatsData.error || errorMsg, `IDs: ${videoIdsToFetch.substring(0,100)}...`);
        // Add videos without stats if API fails for this batch, marking views as N/A
        batchVideoItems.forEach(videoItem => {
          finalVideos.push({ 
            id: videoItem.id, 
            title: videoItem.title, 
            views: 'Erro ao buscar',
            publishedAt: videoItem.publishedAt 
          });
        });
      } else {
        const statsMap = new Map<string, string>();
        videoStatsData.items?.forEach((video: VideoResource) => {
          statsMap.set(video.id, video.statistics?.viewCount || '0');
        });

        batchVideoItems.forEach(videoItem => {
          finalVideos.push({
            id: videoItem.id,
            title: videoItem.title,
            views: statsMap.get(videoItem.id) || 'N/A',
            publishedAt: videoItem.publishedAt,
          });
        });
      }
      onProgress({ videosProcessedForStats: finalVideos.length });

    } catch (e: any) {
      console.error('Error fetching video stats:', e);
      // Add videos without stats if network error, marking views as N/A
      batchVideoItems.forEach(videoItem => {
          finalVideos.push({ 
            id: videoItem.id, 
            title: videoItem.title, 
            views: 'Erro de rede',
            publishedAt: videoItem.publishedAt
          });
      });
      onProgress({ 
          message: `Erro de rede ao buscar estatísticas do lote ${Math.floor(i / MAX_RESULTS_PER_PAGE) + 1}. Visualizações podem estar ausentes.`,
          videosProcessedForStats: finalVideos.length 
      });
    }
  }
  
  onProgress({ 
    state: ExtractionState.COMPLETED, 
    message: `Extração via API concluída. ${finalVideos.length} vídeos processados.` 
  });

  return { officialChannelTitle, videos: finalVideos, error: null };
};