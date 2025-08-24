// src/utils/formattingUtils.ts

/**
 * Formats a number or string representation of a number into Brazilian Portuguese locale.
 * Handles non-numeric strings by returning them as is, or 'N/A' for undefined/null.
 * @param value The number or string to format.
 * @returns A formatted string (e.g., "1.234.567") or the original string if not a valid number.
 */
export const formatBrazilianNumber = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return 'N/A';
  
  const num = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : Number(value);
  
  if (isNaN(num)) {
    // If original value was a string and couldn't be parsed (e.g., "Erro ao buscar", "N/A"), return it.
    // Otherwise, if it was a number that became NaN, or if parsing failed for other reasons, return 'N/A'.
    return typeof value === 'string' ? value : 'N/A';
  }
  
  return new Intl.NumberFormat('pt-BR').format(num);
};

/**
 * Formats an ISO date string (or a string that can be parsed by Date constructor)
 * into Brazilian date format (DD/MM/YYYY).
 * @param isoDateString The ISO date string.
 * @returns A formatted date string (e.g., "31/12/2023") or 'N/A' if input is invalid/empty.
 */
export const formatIsoDateToBrazilian = (isoDateString?: string): string => {
  if (!isoDateString) return 'N/A';
  try {
    const date = new Date(isoDateString);
    // Check for invalid date
    if (isNaN(date.getTime())) {
        // console.warn("Invalid date provided for formatting:", isoDateString);
        return 'Data Inválida';
    }
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", isoDateString, error);
    return 'N/A'; 
  }
};
