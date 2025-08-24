import { VideoData } from '../types';
import { formatBrazilianNumber, formatIsoDateToBrazilian } from './formattingUtils';

// XLSX type will be available globally from CDN after index.html loads it
declare var XLSX: any; 

const createDownloadLink = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = (text: string): Promise<void> => {
  return navigator.clipboard.writeText(text)
    .then(() => {
      // Caller can handle success (e.g., show alert)
    })
    .catch((err) => {
      console.error('Falha ao copiar para a área de transferência: ', err);
      alert('Falha ao copiar. Verifique as permissões do navegador ou copie manualmente.');
      return Promise.reject(err); // Propagate error if needed
    });
};

export const downloadTxt = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  createDownloadLink(blob, filename);
};

export const downloadMd = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  createDownloadLink(blob, filename);
};

export const downloadCsv = (videos: VideoData[], filename: string): void => {
  const header = '"Título do Vídeo","Visualizações","Data de Publicação"\n';
  const rows = videos.map(v => 
    `"${(v.title || '').replace(/"/g, '""')}","${formatBrazilianNumber(v.views)}","${formatIsoDateToBrazilian(v.publishedAt)}"`
  ).join('\n');
  const csvContent = header + rows;
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' }); // \uFEFF for BOM for Excel UTF-8
  createDownloadLink(blob, filename);
};

export const downloadXlsx = (videos: VideoData[], filename: string): void => {
  if (typeof XLSX === 'undefined') {
    alert('A biblioteca XLSX (SheetJS) não foi carregada. Não é possível exportar para .xlsx.');
    console.error('SheetJS (XLSX) library not found.');
    return;
  }
  const worksheetData = videos.map(v => ({
    'Título do Vídeo': v.title || '',
    'Visualizações': formatBrazilianNumber(v.views),
    'Data de Publicação': formatIsoDateToBrazilian(v.publishedAt),
  }));

  try {
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Títulos YouTube');
    
    // Auto-adjust column widths (basic implementation)
    const titleMaxLength = Math.max(...worksheetData.map(r => r['Título do Vídeo'].length), 'Título do Vídeo'.length);
    const viewsMaxLength = Math.max(...worksheetData.map(r => r['Visualizações'].length), 'Visualizações'.length);
    const dateMaxLength = Math.max(...worksheetData.map(r => r['Data de Publicação'].length), 'Data de Publicação'.length);


    const colWidths = [
        { wch: Math.min(Math.max(titleMaxLength, 10), 80) }, 
        { wch: Math.min(Math.max(viewsMaxLength, 10), 20) },
        { wch: Math.min(Math.max(dateMaxLength, 10), 20) } 
    ]; 
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, filename, { bookType: 'xlsx', type: 'binary' });
  } catch (e) {
    console.error("Error creating XLSX file:", e);
    alert("Ocorreu um erro ao gerar o arquivo .xlsx.");
  }
};