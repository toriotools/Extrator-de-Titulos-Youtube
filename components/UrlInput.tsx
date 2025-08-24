
import React from 'react';

interface UrlInputProps {
  channelUrl: string;
  setChannelUrl: (url: string) => void;
  onExtract: () => void;
  isLoading: boolean; // Also used to indicate if API key is missing for disabling button
  buttonText?: string; // Optional: custom text for the extract button
}

const UrlInput: React.FC<UrlInputProps> = ({ channelUrl, setChannelUrl, onExtract, isLoading, buttonText }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) { // Prevent submission if button is effectively disabled by isLoading state
        onExtract();
    }
  };

  const handlePaste = async () => {
    if (!navigator.clipboard?.readText) {
      console.warn('A funcionalidade de colar não é suportada neste navegador ou o acesso à área de transferência foi negado.');
      alert('Seu navegador não suporta colar desta forma ou a permissão foi negada.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setChannelUrl(text);
      } else {
        console.info('Área de transferência está vazia.');
      }
    } catch (err: any) {
      console.error('Falha ao ler da área de transferência:', err);
      let alertMessage = 'Falha ao colar da área de transferência. Verifique as permissões do navegador (geralmente um ícone na barra de endereço).';
      if (err.name === 'NotAllowedError' || err.message?.includes('Permissions Policy')) {
        alertMessage += ' O acesso à área de transferência pode estar bloqueado pela política de permissões do documento, especialmente se esta aplicação estiver incorporada em outra página.';
      }
      alert(alertMessage);
    }
  };

  const defaultButtonText = isLoading ? (
    <>
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Extraindo...
    </>
  ) : 'Extrair Vídeos (via API)';


  return (
    <section aria-labelledby="input-section-title">
      <h3 id="input-section-title" className="sr-only">Seção de Input da URL do Canal</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="youtube-url" className="block text-sm font-medium text-sky-300 mb-1">
            URL de um Canal, Vídeo ou Playlist do YouTube
          </label>
          <div className="flex items-stretch space-x-2">
            <input
              type="url"
              id="youtube-url"
              name="youtube-url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="Ex: https://www.youtube.com/@MrBeast/videos"
              required
              className="flex-grow px-4 py-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-500 text-slate-100 text-base sm:text-lg transition-colors"
              disabled={isLoading} // Input field disabled only when actively loading
            />
            <button
              type="button"
              onClick={handlePaste}
              className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-slate-200 hover:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
              disabled={isLoading} // Paste button disabled only when actively loading
              aria-label="Colar URL da área de transferência"
              title="Colar da área de transferência"
            >
              Colar
            </button>
          </div>
           <p className="mt-1 text-xs text-slate-400">Pode ser a URL da aba "Vídeos", "Playlists", "Ao Vivo", ou a URL principal do canal.</p>
        </div>
        <button
          type="submit"
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base sm:text-lg font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:bg-slate-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
          disabled={isLoading} // Main extract button disabled if isLoading (which also implies API key missing if that's the reason for isLoading=true from App)
        >
          {buttonText || defaultButtonText}
        </button>
      </form>
    </section>
  );
};

export default UrlInput;
