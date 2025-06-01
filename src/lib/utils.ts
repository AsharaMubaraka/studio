
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWhatsAppTextToHtml(text: string): string {
  if (!text) return "";

  let html = text;

  // IMPORTANT: Order of replacement can matter for nested/combined styles.
  // This order handles cases like _italic *bold* italic_ correctly.

  // Bold: *text*
  // Uses (.*?) for non-greedy matching of content within asterisks.
  html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');

  // Italic: _text_
  // Uses (.*?) for non-greedy matching of content within underscores.
  html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');

  // Strikethrough: ~text~
  // Uses (.*?) for non-greedy matching of content within tildes.
  html = html.replace(/\~(.*?)\~/g, '<del>$1</del>');
  
  // Monospace (inline): `text` (optional, uncomment if needed)
  // html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
  
  // Monospace (block): ```text``` (optional, uncomment if needed)
  // This needs to be handled carefully if it can contain other markdown or HTML.
  // html = html.replace(/```([\s\S]+?)```/g, (match, p1) => `<code><pre>${p1.replace(/\n/g, '<br />')}</pre></code>`);


  // Line breaks (should be one of the last things to replace)
  html = html.replace(/\n/g, '<br />');

  return html;
}
