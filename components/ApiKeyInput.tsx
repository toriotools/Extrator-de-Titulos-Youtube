
import React from 'react';

interface ApiKeyInputProps {
  apiKey: string;
  setApiKey: (key: string) => void; // For direct input typing
  onSaveKey: (keyToSave: string) => void;
  onClearKey: () => void;
  disabled?: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, setApiKey, onSaveKey, onClearKey, disabled }) => {
  
  const handlePasteKey = async () => {
    if (!navigator.clipboard?.readText) {
      alert('Seu navegador não suporta colar desta forma ou a permissão foi negada.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text); // Update the key in the input field immediately
      } else {
        console.info('Área de transferência está vazia.');
      }
    } catch (err: any) {
      console.error('Falha ao ler da área de transferência:', err);
      let alertMessage = 'Falha ao colar da área de transferência. Verifique as permissões do navegador.';
      if (err.name === 'NotAllowedError' || err.message?.includes('Permissions Policy')) {
        alertMessage += ' O acesso à área de transferência pode estar bloqueado pela política de permissões.';
      }
      alert(alertMessage);
    }
  };

  const handleSave = () => {
    onSaveKey(apiKey);
  };

  const handleClear = () => {
    onClearKey(); // This will clear the input via parent state and remove from localStorage
  };

  return (
    <section aria-labelledby="api-key-section-title" className="space-y-4">
      <h3 id="api-key-section-title" className="sr-only">Configuração da Chave de API do YouTube</h3>
      <div>
        <label htmlFor="youtube-api-key" className="block text-sm font-medium text-sky-300 mb-1">
          Sua Chave da API do YouTube Data v3 (Obrigatória)
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <input
            type="password"
            id="youtube-api-key"
            name="youtube-api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Cole sua chave de API aqui (Ex: AIzaSy...)"
            className="flex-grow px-4 py-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-500 text-slate-100 text-base sm:text-lg transition-colors"
            disabled={disabled}
            aria-describedby="api-key-description"
          />
          <button
            type="button"
            onClick={handlePasteKey}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-slate-200 hover:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
            disabled={disabled}
            title="Colar chave da área de transferência"
          >
            Colar Chave
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            disabled={disabled}
        >
            Salvar Chave
        </button>
        <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            disabled={disabled || !apiKey} // Disable if API key is already empty
        >
            Limpar Chave
        </button>
      </div>
      <p id="api-key-description" className="mt-2 text-xs text-slate-400">
        Uma chave da API do YouTube Data v3 válida é <strong>obrigatória</strong> para buscar o título do canal e a lista de vídeos.
        A chave é salva apenas no armazenamento local do seu navegador para sua conveniência.
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline ml-1">
            Obtenha uma chave aqui.
        </a>
      </p>
    </section>
  );
};

export default ApiKeyInput;
