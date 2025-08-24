

import React, { useState, useCallback, useEffect } from 'react';
import { VideoData, ExtractionProgress, ExtractionState } from './types';
import UrlInput from './components/UrlInput';
import StatusDisplay from './components/StatusDisplay';
import ResultsDisplay from './components/ResultsDisplay';
import ApiKeyInput from './components/ApiKeyInput';
import { extractChannelVideosViaAPI, ApiServiceResult } from './services/youtubeExtractorService';

const LOCAL_STORAGE_API_KEY = 'youtubeExtractorUserApiKey';

const App: React.FC = () => {
  const [channelUrl, setChannelUrl] = useState<string>('');
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExtractionProgress>({
    state: ExtractionState.IDLE,
    message: 'Configure a chave da API e insira a URL do canal.',
    videosFound: 0,
    videosProcessedForStats: 0,
  });
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [channelOfficialTitle, setChannelOfficialTitle] = useState<string | null>(null);
  const [channelApiMessage, setChannelApiMessage] = useState<string | null>('Por favor, configure sua chave da API do YouTube Data v3. Ela é necessária para extrair a lista de vídeos.');

  useEffect(() => {
    const savedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (savedApiKey) {
      setUserApiKey(savedApiKey);
      setChannelApiMessage('Chave da API carregada do armazenamento local. Pronta para extração.');
    }
  }, []);

  const handleSaveApiKey = useCallback((keyToSave: string) => {
    if (!keyToSave.trim()) {
        localStorage.removeItem(LOCAL_STORAGE_API_KEY);
        setUserApiKey('');
        setChannelApiMessage('Campo da chave de API está vazio. Chave anterior (se houver) removida. A chave é necessária para extrair vídeos.');
        return;
    }
    localStorage.setItem(LOCAL_STORAGE_API_KEY, keyToSave);
    setUserApiKey(keyToSave);
    setChannelApiMessage('Chave da API salva com sucesso! Pronta para extrair vídeos.');
  }, []);

  const handleClearApiKey = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_API_KEY);
    setUserApiKey('');
    setChannelApiMessage('Chave da API removida. Forneça uma chave para extrair vídeos.');
  }, []);

  const onProgressUpdate = useCallback((update: Partial<ExtractionProgress>) => {
    setProgress(prevUpdate => ({
      ...prevUpdate,
      ...update, 
    }));
  }, []);

  const handleExtraction = useCallback(async () => {
    if (!userApiKey) {
      setExtractionError('Chave da API do YouTube não fornecida. Por favor, configure uma chave no Passo 1.');
      setProgress(prev => ({ ...prev, state: ExtractionState.IDLE, message: 'Chave API obrigatória.' }));
      setChannelApiMessage('ERRO: Chave da API do YouTube é obrigatória para extrair vídeos.');
      return;
    }
    if (!channelUrl) {
      setExtractionError('Por favor, insira uma URL do canal do YouTube.');
      setProgress(prev => ({ ...prev, state: ExtractionState.IDLE, message: 'URL do canal obrigatória.' }));
      return;
    }
    
    try {
        new URL(channelUrl); 
    } catch (e) {
        setExtractionError('URL inválida. Por favor, insira uma URL válida do YouTube.');
        setProgress(prev => ({ ...prev, state: ExtractionState.ERROR, message: 'URL inválida.' }));
        return;
    }

    setIsLoading(true);
    setExtractionError(null);
    setVideos([]);
    setChannelOfficialTitle(null);
    setChannelApiMessage(null); 

    onProgressUpdate({
      state: ExtractionState.VALIDATING_INPUT,
      message: 'Iniciando extração via API do YouTube...',
      videosFound: 0,
      videosProcessedForStats: 0,
      currentPage: 0,
      totalPages: 0,
    });

    try {
      const result: ApiServiceResult = await extractChannelVideosViaAPI(
        channelUrl,
        userApiKey,
        onProgressUpdate 
      );

      if (result.error) { // Should be caught by the outer catch if service throws.
        throw new Error(result.error);
      }
      
      setChannelOfficialTitle(result.officialChannelTitle);

      if (result.videos && result.videos.length > 0) {
        const sortedVideos = [...result.videos].sort((a, b) => {
          const parseViews = (viewStr: string) => {
            if (typeof viewStr !== 'string') return -1;
            const num = parseInt(viewStr.replace(/,/g, ''), 10);
            return isNaN(num) ? -1 : num;
          };
          const viewsA = parseViews(a.views);
          const viewsB = parseViews(b.views);
          return viewsB - viewsA; // Descending order
        });
        setVideos(sortedVideos);
        onProgressUpdate({
          state: ExtractionState.COMPLETED,
          message: `Extração concluída. ${sortedVideos.length} vídeos encontrados e ordenados por visualizações.`,
          videosFound: sortedVideos.length,
          videosProcessedForStats: sortedVideos.length
        });
      } else {
        setVideos([]);
        onProgressUpdate({
          state: ExtractionState.COMPLETED,
          message: `Extração concluída. Nenhum vídeo público encontrado para este canal.`,
          videosFound: 0,
          videosProcessedForStats: 0
        });
      }

    } catch (err: any) {
      console.error("Extraction error in App:", err);
      const errorMessage = err.message || 'Ocorreu um erro desconhecido durante a extração via API.';
      setExtractionError(errorMessage);
      onProgressUpdate({
        state: ExtractionState.ERROR,
        message: `Erro na extração: ${errorMessage}`,
      });
      setVideos([]); 
      setChannelOfficialTitle(null);
    } finally {
      setIsLoading(false);
    }
  }, [channelUrl, userApiKey, onProgressUpdate]);

  const getProgressPercentage = () => {
    if (progress.state === ExtractionState.COMPLETED && !extractionError) return 100;
    if (progress.state === ExtractionState.IDLE || progress.state === ExtractionState.ERROR || !!extractionError) return 0;
    if (!isLoading) return 0;

    switch (progress.state) {
        case ExtractionState.VALIDATING_INPUT:
            return 5;
        case ExtractionState.FETCHING_CHANNEL_INFO_API:
            return 10;
        case ExtractionState.FETCHING_PLAYLIST_ITEMS_API:
            const pageProgress = progress.totalPages && progress.totalPages > 0 && progress.currentPage
                ? (progress.currentPage / progress.totalPages) * 70 
                : 0;
            return 10 + Math.min(pageProgress, 70); 
        case ExtractionState.FETCHING_VIDEO_STATS_API:
            const statsProgress = progress.videosFound > 0 && progress.videosProcessedForStats
                ? (progress.videosProcessedForStats / progress.videosFound) * 20 
                : 0;
            return 80 + Math.min(statsProgress, 19); 
        default:
            return 0;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-8 selection:bg-sky-500 selection:text-white">
      <header className="w-full max-w-7xl text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-sky-400">
          Extractor de Títulos do YouTube (API)
        </h1>
        <p className="mt-3 text-slate-400 text-lg">
          Extraia todos os títulos e visualizações de vídeos de canais do YouTube usando a API oficial.
        </p>
      </header>

      <div className="w-full max-w-7xl flex flex-col lg:flex-row lg:space-x-8">
        {/* Left Column: Configuration & Progress */}
        <div className="lg:w-2/5 xl:w-1/3 space-y-10 mb-10 lg:mb-0">
          {/* Passo 1: Configuração da API */}
          <div className="bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 space-y-6">
            <h2 className="text-2xl font-semibold text-sky-400 border-b border-slate-700 pb-3">
              Passo 1: Chave da API (Obrigatório)
            </h2>
            <ApiKeyInput 
              apiKey={userApiKey}
              setApiKey={setUserApiKey}
              onSaveKey={handleSaveApiKey}
              onClearKey={handleClearApiKey}
              disabled={isLoading}
            />
            {channelApiMessage && !isLoading && (
              <div className={`mt-4 p-3 border rounded-md text-sm ${channelApiMessage.includes('Erro') || channelApiMessage.includes('ERRO') || channelApiMessage.includes('Falha') ? 'bg-red-500/20 border-red-600 text-red-300' : (channelApiMessage.includes('sucesso') || channelApiMessage.includes('carregada') ? 'bg-green-500/20 border-green-600 text-green-300' : 'bg-sky-500/10 border-sky-700 text-sky-300')}`}>
                <p>
                  <span className="font-semibold">Info API:</span> {channelApiMessage}
                </p>
              </div>
            )}
          </div>

          {/* Passo 2: Extrair Títulos */}
          <div className="bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 space-y-6">
            <h2 className="text-2xl font-semibold text-sky-400 border-b border-slate-700 pb-3">
              Passo 2: Extrair Vídeos
            </h2>
            <UrlInput
              channelUrl={channelUrl}
              setChannelUrl={setChannelUrl}
              onExtract={handleExtraction}
              isLoading={isLoading || !userApiKey} 
              buttonText={!userApiKey ? "Configure a Chave API" : (isLoading ? "Extraindo..." : "Extrair Vídeos (API)")}
            />
          
            {(isLoading || (progress.state !== ExtractionState.IDLE && progress.state !== ExtractionState.COMPLETED && !extractionError) || extractionError ) && (
              <div className="my-4 space-y-4">
                <StatusDisplay
                    message={extractionError ? `Erro: ${extractionError}` : progress.message} 
                    progressPercentage={getProgressPercentage()}
                    isLoading={isLoading && !extractionError} 
                    isError={!!extractionError || progress.state === ExtractionState.ERROR}
                />
              </div>
            )}
             {extractionError && !isLoading && (
              <p className="text-center text-red-400 py-2">A extração falhou. Verifique a mensagem de erro acima.</p>
            )}
          </div>
        </div>

        {/* Right Column: Results - Conditionally Rendered */}
        <div className="lg:w-3/5 xl:w-2/3 space-y-6">
            {(progress.state === ExtractionState.COMPLETED && !extractionError && !isLoading) && (
                 <div className="bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 space-y-6">
                    {channelOfficialTitle && (
                    <div className="mb-4 p-3 bg-green-600/20 border border-green-500 rounded-md text-green-200">
                        <p><span className="font-semibold">Canal Oficial (via API):</span> {channelOfficialTitle}</p>
                    </div>
                    )}
                    {videos.length > 0 ? (
                    <ResultsDisplay videos={videos} />
                    ) : (
                    <p className="text-center text-yellow-400 text-lg py-4">
                        Nenhum vídeo encontrado para o canal fornecido via API. O canal pode não ter vídeos públicos ou a API não retornou itens.
                    </p>
                    )}
                </div>
            )}
            {/* Placeholder or message when right panel is not showing results */}
            {!(progress.state === ExtractionState.COMPLETED && !extractionError && !isLoading) && !isLoading && progress.state !== ExtractionState.ERROR && progress.state !== ExtractionState.IDLE && (
                 <div className="bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 text-center text-slate-400">
                    <p>Os resultados da extração aparecerão aqui.</p>
                </div>
            )}
             {progress.state === ExtractionState.IDLE && !isLoading && (
                 <div className="bg-slate-800 shadow-xl rounded-lg p-6 sm:p-8 text-center text-slate-400 h-full flex items-center justify-center">
                    <p>Aguardando configuração e início da extração...</p>
                </div>
            )}
        </div>
      </div>

      <footer className="w-full max-w-7xl text-center mt-12 py-6 text-slate-500 text-sm border-t border-slate-700">
        <p>&copy; {new Date().getFullYear()} Extractor de Títulos (API Version). Ferramenta para fins educacionais e de demonstração.</p>
        <p className="mt-2">
          Desenvolvido por <a href="https://www.youtube.com/@toriotools" target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-400 hover:text-sky-300 underline transition-colors">Tório Tools</a>.
        </p>
        <p className="mt-2">
          Esta versão utiliza exclusivamente a API do YouTube Data v3. Uma chave de API válida é obrigatória.
        </p>
         <p className="mt-1 text-xs">
           Certifique-se de que sua chave API tem cota suficiente. Cada extração completa consome unidades de cota da API.
         </p>
      </footer>
    </div>
  );
};

export default App;
