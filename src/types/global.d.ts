import { jsPDF } from 'jspdf';

declare global {
  interface Window {
    jsPDF: typeof jsPDF;
  }
}

export {};
