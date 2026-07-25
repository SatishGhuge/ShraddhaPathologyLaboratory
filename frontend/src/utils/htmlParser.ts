/**
 * HTML Parser Utility - Handles conversion of HTML tags (<b>, <i>) to styled React components
 */

export interface HtmlPart {
  text: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
}

/**
 * Parse HTML string with <b> and <i> tags and return array of parts for React rendering
 * Handles actual HTML tags (not entities)
 * @param str - HTML string to parse
 * @returns Array of parts with styling info, or plain string if no tags found
 */
export const parseHtmlText = (str: string): string | HtmlPart[] => {
  if (!str) return "-";
  
  // Normalize the string
  let text = String(str).trim();
  if (!text) return "-";
  
  const parts: HtmlPart[] = [];
  let lastIndex = 0;
  // Match: <b>, </b>, <i>, </i>, <u>, </u>, <strong>, </strong>, <em>, </em>
  const regex = /<(\/?)(?:b|strong|i|em|u)>/g;
  let match;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let hasAnyTags = false;

  while ((match = regex.exec(text)) !== null) {
    hasAnyTags = true;
    
    // Add text before this tag
    if (match.index > lastIndex) {
      const textContent = text.substring(lastIndex, match.index);
      if (textContent) {
        parts.push({ text: textContent, bold: isBold, italic: isItalic, underline: isUnderline });
      }
    }

    // Determine which tag this is and update state
    const fullMatch = match[0];
    const isClosing = match[1] === '/';
    
    if (fullMatch.includes('b') || fullMatch.includes('strong')) {
      isBold = !isClosing;
    } else if (fullMatch.includes('i') || fullMatch.includes('em')) {
      isItalic = !isClosing;
    } else if (fullMatch.includes('u')) {
      isUnderline = !isClosing;
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const textContent = text.substring(lastIndex);
    if (textContent) {
      parts.push({ text: textContent, bold: isBold, italic: isItalic, underline: isUnderline });
    }
  }

  // If no tags found, return plain text
  if (!hasAnyTags) return text;
  if (parts.length === 0) return text;
  
  // Filter out empty parts
  const cleanedParts = parts.filter(p => p.text.length > 0);
  if (cleanedParts.length === 0) return text;
  
  // If we only have one part with no styling, return as plain string
  if (cleanedParts.length === 1 && !cleanedParts[0].bold && !cleanedParts[0].italic && !cleanedParts[0].underline) {
    return cleanedParts[0].text;
  }

  // Return array of parts for rendering
  return cleanedParts;
};

/**
 * Strip HTML tags from a string
 * @param str - String with HTML tags
 * @returns Plain text without HTML tags
 */
export const stripHtmlTags = (str: string): string => {
  if (!str) return "-";
  
  // Simply remove all HTML tags
  return String(str)
    .replace(/<[^>]*>/g, "")
    .trim();
};

/**
 * Convert HTML tags to HTML entities for use in HTML strings (like PDF generation)
 * @param str - String with HTML tags
 * @returns HTML string with properly formatted tags
 */
export const htmlToHtmlEntities = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>')
    .replace(/<i>(.*?)<\/i>/g, '<em>$1</em>');
};
