import React, { useState } from 'react';
import { VideoData } from '../types';
import { copyToClipboard, downloadTxt, downloadMd, downloadCsv, downloadXlsx } from '../utils/exportUtils';
import { formatBrazilianNumber, formatIsoDateToBrazilian } from '../utils/formattingUtils';

interface ResultsDisplayProps {
  videos: VideoData[];
}

const ExportButton: React.FC<{ onClick: () => void; label: string; fileType?: string }> = ({ onClick, label, fileType }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    if (fileType === 'copy') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className={`w-full px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${copied ? 'bg-green-500 hover:bg-green-600' : ''}`}
    >
      {copied ? 'Copiado!' : label}
    </button>
  );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ videos }) => {
  if (videos.length === 0) {
    return null;
  }

  const exportableVideos = videos.map(v => ({
    ...v,
    publishedAtFormatted: formatIsoDateToBrazilian(v.publishedAt),
    viewsFormatted: formatBrazilianNumber(v.views)
  }));

  const textForCopy = exportableVideos.map(v => `${v.title} (Publicado em: ${v.publishedAtFormatted}, Visualizações: ${v.viewsFormatted})`).join('\n');
  const markdownForDownload = exportableVideos.map(v => `- ${v.title} (Publicado em: ${v.publishedAtFormatted}, Visualizações: ${v.viewsFormatted})`).join('\n');


  return (
    <section aria-labelledby="results-section-title" className="space-y-6">
      <h2 id="results-section-title" className="text-2xl font-semibold text-sky-400">
        Resultados da Extração ({videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'})
      </h2>

      <div className="space-y-3">
        <h3 className="text-lg font-medium text-slate-300">Opções de Exportação:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <ExportButton onClick={() => copyToClipboard(textForCopy)} label="Copiar Lista" fileType="copy" />
          <ExportButton onClick={() => downloadTxt(textForCopy, 'videos_youtube.txt')} label="Download .txt" />
          <ExportButton onClick={() => downloadMd(markdownForDownload, 'videos_youtube.md')} label="Download .md" />
          <ExportButton onClick={() => downloadCsv(videos, 'videos_youtube.csv')} label="Download .csv" />
          <ExportButton onClick={() => downloadXlsx(videos, 'videos_youtube.xlsx')} label="Download .xlsx" />
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-700/80 rounded-lg shadow-md border border-slate-600/70 max-h-[500px]">
        <table className="min-w-full divide-y divide-slate-600">
          <thead className="bg-slate-800 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-sky-300 uppercase tracking-wider w-16">#</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-sky-300 uppercase tracking-wider">Título do Vídeo</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-sky-300 uppercase tracking-wider w-40 whitespace-nowrap">Visualizações</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-sky-300 uppercase tracking-wider w-40 whitespace-nowrap">Data de Publicação</th>
            </tr>
          </thead>
          <tbody className="bg-slate-700 divide-y divide-slate-600">
            {videos.map((video, index) => (
              <tr key={video.id || `${video.title}-${index}`} className="hover:bg-slate-600/50 transition-colors duration-100">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 tabular-nums">{index + 1}</td>
                <td className="px-4 py-3 text-sm text-slate-200 min-w-[300px]">{video.title}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 tabular-nums">{formatBrazilianNumber(video.views)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 tabular-nums">{formatIsoDateToBrazilian(video.publishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {videos.length > 10 && <p className="text-xs text-slate-500 text-center">Role a tabela para ver mais resultados.</p>}
    </section>
  );
};

export default ResultsDisplay;