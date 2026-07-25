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
 * Handles both actual HTML tags and HTML entities
 * @param str - HTML string to parse
 * @returns Array of parts with styling info, or plain string if no tags found
 */
export const parseHtmlText = (str: string): string | HtmlPart[] => {
  if (!str) return "-";
  
  // Normalize the string - convert to string first in case it's a number
  let normalizedStr = String(str).trim();
  
  // Decode HTML entities first (in case they were encoded)
  // This handles: &lt; &gt; &amp; etc.
  let decodedStr = normalizedStr
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  const parts: HtmlPart[] = [];
  let lastIndex = 0;
  const regex = /<b>|<\/b>|<i>|<\/i>|<u>|<\/u>/g;
  let match;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let hasAnyTags = false;

  while ((match = regex.exec(decodedStr)) !== null) {
    hasAnyTags = true;
    // Add text before this tag
    if (match.index > lastIndex) {
      const text = decodedStr.substring(lastIndex, match.index);
      if (text) { // Add even if just whitespace
        parts.push({ text, bold: isBold, italic: isItalic, underline: isUnderline });
      }
    }

    // Toggle state based on tag
    if (match[0] === '<b>') isBold = true;
    else if (match[0] === '</b>') isBold = false;
    else if (match[0] === '<i>') isItalic = true;
    else if (match[0] === '</i>') isItalic = false;
    else if (match[0] === '<u>') isUnderline = true;
    else if (match[0] === '</u>') isUnderline = false;

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < decodedStr.length) {
    const text = decodedStr.substring(lastIndex);
    if (text) { // Add even if just whitespace
      parts.push({ text, bold: isBold, italic: isItalic, underline: isUnderline });
    }
  }

  // If no tags found, return plain text
  if (!hasAnyTags) return normalizedStr;
  if (parts.length === 0) return normalizedStr;
  
  // Filter out empty parts and consolidate
  const cleanedParts = parts.filter(p => p.text.length > 0);
  if (cleanedParts.length === 0) return normalizedStr;
  if (cleanedParts.length === 1 && !cleanedParts[0].bold && !cleanedParts[0].italic && !cleanedParts[0].underline) {
    return cleanedParts[0].text;
  }

  // Return array of parts for rendering
  return cleanedParts;
};

/**
 * Strip HTML tags from a string
 * Handles both actual HTML tags and HTML entities
 * @param str - String with HTML tags
 * @returns Plain text without HTML tags
 */
export const stripHtmlTags = (str: string): string => {
  if (!str) return "-";
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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
