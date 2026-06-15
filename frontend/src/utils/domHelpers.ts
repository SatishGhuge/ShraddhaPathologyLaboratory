// DOM Helper Functions with Proper Typing

export const getElementByIdAsHTML = (id: string): HTMLElement | null => {
  return document.getElementById(id) as HTMLElement | null;
};

export const querySelectorAsHTML = (selector: string): HTMLElement | null => {
  return document.querySelector(selector) as HTMLElement | null;
};

export const querySelectorAllAsHTML = (selector: string): HTMLElement[] => {
  return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
};

export const getInputElement = (id: string): HTMLInputElement | null => {
  return document.getElementById(id) as HTMLInputElement | null;
};

export const getSelectElement = (id: string): HTMLSelectElement | null => {
  return document.getElementById(id) as HTMLSelectElement | null;
};

export const getTextAreaElement = (id: string): HTMLTextAreaElement | null => {
  return document.getElementById(id) as HTMLTextAreaElement | null;
};

export const setElementStyle = (element: HTMLElement | null, styles: Partial<CSSStyleDeclaration>): void => {
  if (!element) return;
  Object.assign(element.style, styles);
};

export const toggleElementClass = (element: HTMLElement | null, className: string, add: boolean): void => {
  if (!element) return;
  if (add) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
};
