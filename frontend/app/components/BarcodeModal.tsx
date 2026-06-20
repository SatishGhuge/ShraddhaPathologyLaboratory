import React, { useState } from 'react';
import { Barcode, X, CheckCircle } from 'lucide-react';

interface BarcodeLabel {
  barcodeValue: string;
  specimen: string;
  shortNamesStr: string;
  dateStr: string;
  timeStr: string;
  testIds: number[];
  organizationCode?: string;
  barcode_status?: string;
  isSelected?: boolean;
}

interface BarcodePatientInfo {
  patientName: string;
  visitId: string;
  age: string;
  gender: string;
  ageGender: string;
  organizationCode?: string;
}

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintOnly: () => void;
  onPrintAndUpdate: () => void;
  barcodeLabels: BarcodeLabel[];
  barcodePatientInfo: BarcodePatientInfo;
  isPrinting?: boolean;
  selectedBarcodes?: Set<number>;
  onBarcodeToggle?: (index: number) => void;
}

// Generate Code128 barcode SVG
const buildCode128Svg = (text: any) => {
  const CODE128B = [
    '11011001100','11001101100','11001100110','10010011000','10010001100',
    '10001001100','10011001000','10011000100','10001100100','11001001000',
    '11001000100','11000100100','10110011100','10011011100','10011001110',
    '10111001100','10011101100','10011100110','11001110010','11001011100',
    '11001001110','11011100100','11001110100','11101101110','11101001100',
    '11100101100','11100100110','11101100100','11100110100','11100110010',
    '11011011000','11011000110','11000110110','10100011000','10001011000',
    '10001000110','10110001000','10001101000','10001100010','11010001000',
    '11000101000','11000100010','10110111000','10110001110','10001101110',
    '10111011000','10111000110','10001110110','11101110110','11010001110',
    '11000101110','11011101000','11011100010','11011101110','11101011000',
    '11101000110','11100010110','11101101000','11101100010','11100011010',
    '11101111010','11001000010','11110001010','10100110000','10100001100',
    '10010110000','10010000110','10000101100','10000100110','10110010000',
    '10110000100','10011010000','10011000010','10000110100','10000110010',
    '11000010010','11001010000','11110111010','11000010100','10001111010',
    '10100111100','10010111100','10010011110','10111100100','10011110100',
    '10011110010','11110100100','11110010100','11110010010','11011011110',
    '11011110110','11110110110','10101111000','10100011110','10001011110',
    '10111101000','10111100010','11110101000','11110100010','10111011110',
    '10111101110','11101011110','11110101110','11010000100','11010010000',
    '11010011100','1100011101011'
  ];
  const START_B = 104;
  const STOP = 106;

  const codes = [START_B];
  let checksum = START_B;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 32;
    codes.push(c);
    checksum += c * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  const barWidth = 2;
  let x = 0;
  let bars = '';
  const height = 60;

  codes.forEach(code => {
    const pattern = CODE128B[code];
    if (!pattern) return;
    for (let i = 0; i < pattern.length; i++) {
      const w = parseInt(pattern[i]) * barWidth;
      if (i % 2 === 0) {
        bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="black"/>`;
      }
      x += w;
    }
  });

  return { svg: bars, width: x, height };
};

// Barcode card component - used in both modal and print preview
const BarcodeCard = ({
  label,
  patientInfo,
  isSelected,
  index,
  onClick,
  isPrintMode = false,
  barcode_status = 'Unprinted'
}: {
  label: any;
  patientInfo: any;
  isSelected: boolean;
  index: number;
  onClick?: () => void;
  isPrintMode?: boolean;
  barcode_status?: string;
}) => {
  const { svg, width, height } = buildCode128Svg(label.barcodeValue);
  
  // Determine colors based on barcode_status from database (persistent)
  // For print mode: Use barcode_status from DB
  // For modal: Show selection color if modal-selected, otherwise use DB status
  const isPrinted = barcode_status === 'Printed';
  const showAsSelected = !isPrintMode && isSelected;
  
  const borderColor = showAsSelected ? 'border-blue-600' : (isPrinted ? 'border-blue-600' : 'border-red-500');
  const backgroundColor = showAsSelected ? 'bg-blue-100' : (isPrinted ? 'bg-blue-100' : 'bg-red-100');

  return (
    <div
      data-barcode-index={index}
      onClick={isPrintMode ? undefined : onClick}
      className={`
        relative transition-all border-2 ${borderColor} ${backgroundColor} shadow-sm
        ${isPrintMode ? 'print:cursor-default print:bg-white print:border-gray-400' : 'cursor-pointer hover:shadow-md hover:border-blue-700'}
      `}
      style={{
        width: '220px',
        fontFamily: 'Arial, sans-serif',
        pageBreakInside: isPrintMode ? 'avoid' : 'auto',
        padding: '3px'
      }}
    >
      {/* Organization Code - top right corner */}
      {label.organizationCode && (
        <div className="absolute top-1 right-1 text-[6px] text-gray-700 font-bold bg-white px-1 py-0.5 rounded border border-gray-400">
          {label.organizationCode}
        </div>
      )}

      {/* Barcode - centered, compact */}
      <div className="flex justify-center py-0.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="85%"
          height="28"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Barcode value (Visit ID) - centered, bold */}
      <div className="text-center font-bold text-[8px] tracking-wider py-0.5 px-1">
        {label.barcodeValue}
      </div>

      {/* Date time and specimen type - very compact */}
      <div className="flex justify-between items-center px-1 py-0 text-[6px]">
        <span className="text-gray-700 truncate">{label.dateStr}</span>
        <span className="text-gray-600 font-medium flex-shrink-0">({label.specimen})</span>
      </div>

      {/* Age and Gender - below specimen type */}
      <div className="px-1 py-0.5 text-[6px] text-gray-700 leading-tight">
        {patientInfo.age && patientInfo.gender ? (
          <span>{patientInfo.gender.charAt(0)}/{patientInfo.age}Y</span>
        ) : (
          <span>{patientInfo.age ? `${patientInfo.age}Y` : ''}{patientInfo.gender ? `${patientInfo.gender.charAt(0)}` : ''}</span>
        )}
      </div>

      {/* Patient name - compact */}
      <div className="px-1 py-0.5 text-[6px] font-bold leading-tight truncate text-gray-800">
        {patientInfo.patientName}
      </div>

      {/* Test names - minimal height */}
      <div className="px-1 py-0.5 text-[6px] text-gray-600 leading-tight border-t border-gray-400 max-h-[24px] overflow-hidden">
        {label.shortNamesStr}
      </div>
    </div>
  );
};

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  onPrintOnly,
  onPrintAndUpdate,
  barcodeLabels,
  barcodePatientInfo,
  isPrinting = false,
  selectedBarcodes = new Set(),
  onBarcodeToggle
}) => {
  if (!isOpen || !barcodePatientInfo) return null;

  const selectedCount = selectedBarcodes ? selectedBarcodes.size : 0;
  const totalBarcodes = barcodeLabels?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-800 rounded-t-lg print:hidden">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Barcode size={16} /> Barcode Labels — {barcodePatientInfo.patientName} | {barcodePatientInfo.visitId}
            {selectedCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-500 rounded text-xs">
                {selectedCount}/{totalBarcodes} selected
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onPrintOnly}
              disabled={isPrinting}
              className="text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded text-xs font-semibold transition"
            >
              Print Only
            </button>

            <button
              onClick={onPrintAndUpdate}
              disabled={isPrinting || selectedCount === 0}
              title={selectedCount === 0 ? "Select at least one barcode" : "Print & update status to Received"}
              className="text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1 rounded text-xs font-semibold transition"
            >
              Print & Update ({selectedCount})
            </button>

            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white text-xl font-bold leading-none px-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Legend - REMOVED: No icons shown, just click to select */}
        {/* Cards show BLUE when selected or when barcode_status='Printed' from database */}
        {/* Cards show RED when unselected or unprinted */}

        {/* Barcode Cards */}
        <div className="overflow-y-auto flex-1 p-6 bg-gray-100 print:p-4 print:bg-white print:overflow-visible">
          <div id="barcode-print-area" className="flex flex-wrap gap-4 justify-center print:justify-start print:gap-3">
            {barcodeLabels.map((label, idx) => (
              <BarcodeCard
                key={idx}
                label={label}
                patientInfo={barcodePatientInfo}
                isSelected={selectedBarcodes?.has(idx) || false}
                index={idx}
                onClick={() => onBarcodeToggle?.(idx)}
                isPrintMode={false}
                barcode_status={label.barcode_status || 'Unprinted'}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeModal;
