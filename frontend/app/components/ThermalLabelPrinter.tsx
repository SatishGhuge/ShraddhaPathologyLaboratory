'use client';

import React from 'react';
import { Barcode, X } from 'lucide-react';

interface BarcodeLabel {
  barcodeValue: string;
  specimen: string;
  shortNamesStr: string;
  dateStr: string;
  timeStr: string;
  testIds: number[];
  organizationCode?: string;
}

interface PatientInfo {
  patientName: string;
  visitId: string;
  age: string;
  gender: string;
  ageGender: string;
  organizationCode?: string;
}

interface ThermalLabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  barcodeLabels: BarcodeLabel[];
  patientInfo: PatientInfo;
}

// Code128 Barcode SVG Generator
const buildCode128Svg = (text: any) => {
  const CODE128B = [
    '11011001100','11001101100','11001100110','10010011000','10010001100',
    '10010010110','10010010011','10010100110','10010110010','10010110011',
    '10110010010','10110010011','10110011010','10110100100','10110100010',
    '10110010100','10111010010','10111010100','10111010010','11100100110',
    '11100010110','11100011010','11101001010','11101010010','11101010100',
    '11101101010','11100101010','11101011010','11101101001','11101100101',
    '11101100100','11100101101','11100100101','11101011001','11100110101',
    '11100110100','11101001101','11101001100','11100101100','11101010110',
    '11101101100','11101100110','11110010100','11110010010','11110010001',
    '10100011000','10010011000','10001011000','10010001100','10100100011',
    '10010100011','10010010011','10111000100','10110001100','10110010100',
    '10110100100','10001100110','10100011100','10010011100','10010100110',
    '10010110100','10110010110','10110100110','10110110010','10110010011',
    '10011010110','10011100110','10011110010','10111001100','10100110110',
    '10100011110','10010110110','10010111010','10000101100','10000110010',
    '10000110100','10110010010','10110010001','10110001010','10110001001',
    '10101011000','10100101100','10100100110','10010101100','10010110010',
    '10010110001','10000101110','10000110101','10000110110','10011010010',
    '10011001010','10011001001','10101010110','10101100110','10101110010',
    '10100100100','10100110010','10100110001','10010100100','10010110010',
    '10010110001','10101001100','10101100100','10101101000','11010010100',
    '11010100100','11010110010','11010010010','11010010001','11000101100',
    '11000110010','11000110100','10110101000','10110100010','10110010100',
    '10011010100','10011001010','10011001001','10101010100','10100101010',
    '10100100101','11010101000','11010100101','11010010101','10101101000',
    '10100110100','10100011010','11010100010','11010101010','11010101001',
    '10100101101','10010101101','10010100101','11010010110','11010100110',
    '11010110010','10100101110'
  ];

  const FNC1 = '11010011110';
  const START_CODE_B = '10111010011';
  const STOP_CODE = '1100011101011';

  let code = START_CODE_B;
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char < 32 || char > 126) {
      console.warn(`Invalid character in barcode: ${text[i]}`);
      continue;
    }
    const codeIndex = char - 32;
    code += CODE128B[codeIndex];
    checksum += (i + 1) * codeIndex;
  }

  checksum = checksum % 103;
  code += CODE128B[checksum];
  code += STOP_CODE;

  const moduleWidth = 2;
  const barHeight = 80;
  let xPos = 0;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${code.length * moduleWidth} ${barHeight}">`;

  for (let i = 0; i < code.length; i++) {
    if (code[i] === '1') {
      svg += `<rect x="${i * moduleWidth}" y="0" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
    }
  }

  svg += `</svg>`;
  return svg;
};

// Compact Thermal Label (30mm x 20mm) - Matching Barcode Card Style
const ThermalLabel = ({
  label,
  patientInfo,
}: {
  label: BarcodeLabel;
  patientInfo: PatientInfo;
}) => {
  const barcodeSvg = buildCode128Svg(label.barcodeValue);
  
  // Truncate patient name if too long
  const truncatedName = patientInfo.patientName.length > 18 
    ? patientInfo.patientName.substring(0, 18) 
    : patientInfo.patientName;

  return (
    <div className="barcode-label-page">
      {/* Organization Code - Top Right (5pt) */}
      <div style={{
        textAlign: 'right',
        fontSize: '5pt',
        fontWeight: 'bold',
        marginBottom: '0.3mm',
        lineHeight: '1'
      }}>
        111
      </div>

      {/* Barcode - Main Element (4mm height) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '4mm',
        margin: '0.2mm 0',
        background: 'white'
      }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="90%"
          height="4mm"
          viewBox={`0 0 ${buildCode128Svg(label.barcodeValue).match(/viewBox="0 0 (\d+) (\d+)"/)?.[1] || '200'} 80`}
          preserveAspectRatio="xMidYMid meet"
          dangerouslySetInnerHTML={{ __html: barcodeSvg }}
          style={{
            pageBreakInside: 'avoid'
          }}
        />
      </div>

      {/* Barcode Value (5pt) */}
      <div style={{
        fontSize: '5pt',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '0.2mm',
        lineHeight: '1'
      }}>
        {label.barcodeValue}
      </div>

      {/* ROW 1: Date | Time | Sample Type (4pt) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '4pt',
        marginBottom: '0.2mm',
        lineHeight: '1'
      }}>
        <span style={{ flex: 0.9 }}>{label.dateStr}</span>
        <span style={{ fontWeight: 'bold', textAlign: 'center', flex: 1 }}>{label.timeStr}</span>
        <span style={{ fontWeight: 'bold', textAlign: 'right', flex: 1.1 }}>{label.specimen}</span>
      </div>

      {/* ROW 2: Patient Name | Age/Gender (4pt) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '4pt',
        marginBottom: '0.1mm',
        lineHeight: '1'
      }}>
        <span style={{ fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncatedName}
        </span>
        <span style={{ fontWeight: 'bold', marginLeft: '0.3mm', whiteSpace: 'nowrap' }}>
          {patientInfo.gender?.charAt(0).toUpperCase()}/{patientInfo.age}Y
        </span>
      </div>

      {/* ROW 3: Test Names (4pt) */}
      <div style={{
        fontSize: '4pt',
        lineHeight: '1',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {label.shortNamesStr}
      </div>
    </div>
  );
};

export const ThermalLabelPrinter: React.FC<ThermalLabelPrinterProps> = ({
  isOpen,
  onClose,
  barcodeLabels,
  patientInfo,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @page {
          size: 30mm 20mm;
          margin: 0;
          padding: 0;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          #thermal-label-print-area {
            margin: 0;
            padding: 0;
          }
          
          .barcode-label-page {
            width: 30mm !important;
            height: 20mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0.4mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            line-height: 1 !important;
          }
          
          .barcode-label-page:last-child {
            page-break-after: avoid !important;
          }
          
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        
        /* Screen preview styles */
        .barcode-label-page {
          width: 30mm;
          height: 20mm;
          margin-bottom: 12px;
          padding: 0.4mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: white;
          color: black;
          font-family: Arial, sans-serif;
          line-height: 1;
          border: 2px solid #333;
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
          overflow: hidden;
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-800 rounded-t-lg print:hidden">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Barcode size={16} /> Thermal Label Printer
            </h2>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white text-xl font-bold leading-none px-2"
            >
              ×
            </button>
          </div>

          {/* Print Area */}
          <div className="overflow-y-auto flex-1 p-8 bg-gray-50 print:p-0 print:bg-white">
            <div id="thermal-label-print-area">
              {barcodeLabels.map((label, idx) => (
                <ThermalLabel
                  key={idx}
                  label={label}
                  patientInfo={patientInfo}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm"
            >
              Print Labels
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThermalLabelPrinter;
