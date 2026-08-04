'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Barcode } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { generateCompactBarcodePrintHtml } from '../utils/barcodePrintUtils';
import API_BASE_URL from '@/src/api/config';

interface BarcodeLabel {
  barcodeValue: string;
  specimen: string;
  shortNamesStr: string;
  dateStr: string;
  timeStr: string;
  testIds: number[];
  organizationCode?: string;
  barcode_status?: string;
  sampleStatus?: string;
  isSelected?: boolean;
  sampleTypeId?: string | number;
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

export const getSampleTypeId = (test: any): string | number => {
  // Priority order to find the NUMERIC sample type ID:
  // 1. Direct test.sampleTypeId (from Test model)
  // 2. Nested in test.test.sampleTypeId
  // 3. From patientTest relationship
  // 4. Fallback to '1' for unknown samples
  return (
    test?.sampleTypeId ||
    test?.test?.sampleTypeId ||
    test?.patientTest?.test?.sampleTypeId ||
    test?.patientTest?.sampleTypeId ||
    1  // ✅ Default to 1 if no sample type ID found
  );
};

export const getSampleTypeName = (test: any): string => {
  return (
    test?.sampleTypeName ||
    test?.specimen_type ||  // ✅ Result page tests use specimen_type directly as name
    test?.sample ||
    test?.sample_type?.Sample_Type ||
    test?.specimen_type?.Sample_Type ||
    test?.test?.sample_type?.Sample_Type ||
    test?.patientTest?.specimen_type?.Sample_Type ||
    test?.test?.name ||  // Fallback to test name
    'Unknown'
  );
};

export const getTestName = (test: any): string => {
  return (
    test?.shortName ||
    test?.test_short_name ||  // ✅ Result page tests use test_short_name
    test?.test?.shortName ||
    test?.patientTest?.test?.shortName ||
    test?.name ||
    test?.test_name ||  // ✅ Result page tests use test_name
    test?.test?.name ||
    'Test'
  );
};

export const generateBarcodeLabels = (
  tests: any[],
  visitId: string,
  organizationCode: string = ''
): BarcodeLabel[] => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  // ✅ Group by sampleTypeId (actual sample ID from test data)
  const specimenGroups: any = {};

  tests.forEach((test) => {
    // Get actual sample ID from test - this is the real sample type ID
    const sampleTypeId = getSampleTypeId(test);
    const key = sampleTypeId;

    if (!specimenGroups[key]) {
      specimenGroups[key] = {
        sampleTypeId,
        sampleTypeName: getSampleTypeName(test),
        tests: [],
        testNames: [],
        statuses: [],
        barcodeStatuses: [],
        testIds: []
      };
    }

    specimenGroups[key].tests.push(test);
    specimenGroups[key].testNames.push(getTestName(test));
    specimenGroups[key].statuses.push(test.status || test.patientTest?.status || 'Registered');
    specimenGroups[key].barcodeStatuses.push(test.barcode_status || test.patientTest?.barcode_status || 'Unprinted');
    specimenGroups[key].testIds.push(test.id || test.test_id || test.patientTest?.id || test.testId);
  });

  // ✅ USE ACTUAL SAMPLE ID (not sequential) FOR BARCODE
  const labels: BarcodeLabel[] = Object.entries(specimenGroups).map(([sampleTypeId, groupData]: any) => {
    const barcodeValue = `${visitId}-${sampleTypeId}`;  // ✅ Use actual sampleTypeId from test
    console.log('✅ Generated barcode value:', barcodeValue, 'Type:', typeof barcodeValue, 'Length:', barcodeValue.length);

    let finalSampleStatus = 'Registered';
    if (groupData.statuses.includes('Received')) {
      finalSampleStatus = 'Received';
    }

    let finalBarcodeStatus = 'Unprinted';
    if (groupData.barcodeStatuses.includes('Printed')) {
      finalBarcodeStatus = 'Printed';
    }

    return {
      barcodeValue,
      specimen: groupData.sampleTypeName,
      shortNamesStr: groupData.testNames.join(' / '),
      dateStr,
      timeStr,
      testIds: groupData.testIds,
      organizationCode,
      barcode_status: finalBarcodeStatus,
      sampleStatus: finalSampleStatus,
      sampleTypeId: groupData.sampleTypeId
    };
  });

  return labels;
};

// Generate proper CODE128 barcode SVG
const generateBarcodeSvg = (value: string): { svg: string; width: number; height: number } => {
  try {
    // Use jsbarcode's SVG rendering directly
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    JsBarcode(svgElement, value, {
      format: 'CODE128',
      width: 2,
      height: 40,
      margin: 0,
      lineColor: '#000000',
      displayValue: false,
      background: '#ffffff'
    });
    
    const width = parseInt(svgElement.getAttribute('width') || '200');
    const height = parseInt(svgElement.getAttribute('height') || '40');
    const innerHTML = svgElement.innerHTML;
    
    console.log('🔍 Barcode generated for:', value, 'SVG length:', innerHTML.length);
    
    return { svg: innerHTML, width, height };
  } catch (error) {
    console.error('❌ Barcode generation error:', error);
    return { svg: '', width: 200, height: 40 };
  }
};

const BarcodeCard = ({
  label,
  patientInfo,
  isSelected,
  index,
  onClick,
  barcode_status = 'Unprinted'
}: {
  label: any;
  patientInfo: any;
  isSelected: boolean;
  index: number;
  onClick?: () => void;
  barcode_status?: string;
}) => {
  const { svg, width, height } = generateBarcodeSvg(label.barcodeValue);
  
  const isPrinted = barcode_status === 'Printed';
  const borderColor = isPrinted ? 'border-blue-500' : 'border-red-500';
  const backgroundColor = isPrinted ? 'bg-blue-50' : 'bg-red-50';
  const ringEffect = isSelected ? 'ring-2 ring-blue-400' : '';

  return (
    <div
      data-barcode-index={index}
      onClick={onClick}
      className={`
        relative transition-all border-2 ${borderColor} ${backgroundColor} shadow-md
        cursor-pointer hover:shadow-lg ${ringEffect}
      `}
      style={{
        width: '100%',
        height: 'auto',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5mm',
        boxSizing: 'border-box',
        position: 'relative',
        borderRadius: '0px',
        justifyContent: 'space-between'
      } as React.CSSProperties}
    >
      <div style={{
        position: 'absolute',
        top: '1mm',
        left: '1mm',
        backgroundColor: isPrinted ? '#0ea5e9' : '#ef4444',
        color: 'white',
        padding: '1px 4px',
        borderRadius: '2px',
        fontSize: '7px',
        fontWeight: 'bold'
      }}>
        {isPrinted ? 'P' : 'U'}
      </div>

      {label.organizationCode && (
        <div style={{
          textAlign: 'right',
          fontSize: '5pt',
          fontWeight: 'bold',
          color: '#000',
          marginBottom: '0.5mm'
        }}>
          {label.organizationCode}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '12mm',
        margin: '0.5mm 0',
        background: 'white'
      }}>
        {svg ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="90%"
            height="12mm"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div style={{ fontSize: '10px', color: '#999' }}>No barcode</div>
        )}
      </div>

      <div style={{
        fontSize: '7pt',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000',
        margin: '0.2mm 0'
      }}>
        {label.barcodeValue}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '7pt',
        color: '#333',
        margin: '0.3mm 0 0.2mm 0'
      }}>
        <span>{label.dateStr}</span>
        <span style={{ fontWeight: 'bold' }}>{label.timeStr}</span>
        <span style={{ fontWeight: 'bold' }}>{label.specimen}</span>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '6.5pt',
        color: '#000',
        margin: '0.2mm 0'
      }}>
        <span style={{ fontWeight: 'bold', flex: 1 }}>{patientInfo.patientName}</span>
        <span style={{ fontWeight: 'bold', marginLeft: '1mm' }}>
          {patientInfo.gender?.charAt(0).toUpperCase()}/{patientInfo.age}Y
        </span>
      </div>

      <div style={{
        fontSize: '6.5pt',
        color: '#000',
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
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
  // Barcode scanning state
  const [scannedBarcodes, setScannedBarcodes] = useState<any[]>([]);
  const barcodeBufferRef = useRef('');
  const barcodeTimeoutRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Barcode Scanner - Capture barcode input when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleBarcodeInput = async (e: KeyboardEvent) => {
      // Only capture if modal is visible
      if (!isOpen) return;

      if (e.key === 'Enter' && barcodeBufferRef.current.length > 0) {
        // Barcode complete
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        clearTimeout(barcodeTimeoutRef.current);

        console.log('📱 Barcode detected from modal:', barcode);

        try {
          // Parse barcode via API
          const response = await fetch(`${API_BASE_URL}/result/parse-barcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode })
          });

          const data = await response.json();

          if (data.success) {
            console.log('✅ Barcode parsed successfully from modal:', {
              visitId: data.visitId,
              sampleId: data.sampleId,
              barcode: data.barcode
            });

            // Add to scanned list for visual feedback
            setScannedBarcodes(prev => [
              ...prev,
              {
                visitId: data.visitId,
                sampleId: data.sampleId,
                barcode: data.barcode,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);

            // Auto-clear scanned info after 2 seconds
            setTimeout(() => {
              setScannedBarcodes(prev => prev.slice(1));
            }, 2000);
          } else {
            console.error('❌ Barcode parsing failed:', data.message);
          }
        } catch (error) {
          console.error('❌ Barcode API error:', error);
        }
      } else if (e.key.length === 1 && e.key.match(/[0-9\-]/)) {
        // Accumulate barcode characters (only numbers and dash)
        barcodeBufferRef.current += e.key;

        // Reset timeout
        clearTimeout(barcodeTimeoutRef.current);
        barcodeTimeoutRef.current = setTimeout(() => {
          if (barcodeBufferRef.current.length > 5) {
            barcodeBufferRef.current = '';
          }
        }, 100);
      }
    };

    window.addEventListener('keydown', handleBarcodeInput);

    return () => {
      window.removeEventListener('keydown', handleBarcodeInput);
      clearTimeout(barcodeTimeoutRef.current);
    };
  }, [isOpen]);

  if (!isOpen || !barcodePatientInfo) return null;

  const selectedCount = selectedBarcodes ? selectedBarcodes.size : 0;
  const totalBarcodes = barcodeLabels?.length || 0;

  const generatePrintHtml = () => {
    return generateCompactBarcodePrintHtml(
      barcodeLabels,
      {
        patientName: barcodePatientInfo.patientName,
        gender: barcodePatientInfo.gender,
        age: barcodePatientInfo.age,
        visitId: barcodePatientInfo.visitId
      },
      (value: string) => {
        try {
          const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          
          JsBarcode(svgElement, value, {
            format: 'CODE128',
            width: 2,
            height: 40,
            margin: 0,
            lineColor: '#000000',
            displayValue: false,
            background: '#ffffff'
          });
          
          return svgElement.innerHTML;
        } catch (error) {
          console.error('❌ Barcode generation error:', error);
          return '';
        }
      }
    );
  };

  return (
    <>
      <iframe id="barcode-print-frame" style={{ display: 'none' }} />

      <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-cyan-600 rounded-t-lg">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Barcode size={16} /> Barcode Labels — {barcodePatientInfo.patientName} | {barcodePatientInfo.visitId}
              {selectedCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-green-500 rounded text-xs font-bold">
                  {selectedCount}/{totalBarcodes} selected
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const printHtml = generatePrintHtml();
                  const iframe = document.getElementById('barcode-print-frame') as HTMLIFrameElement;
                  if (iframe?.contentDocument) {
                    iframe.contentDocument.open();
                    iframe.contentDocument.write(printHtml);
                    iframe.contentDocument.close();
                    setTimeout(() => iframe.contentWindow?.print(), 300);
                  }
                }}
                className="text-white bg-cyan-700 hover:bg-cyan-800 px-3 py-1 rounded text-xs font-semibold"
              >
                Print Only
              </button>

              <button
                onClick={onPrintAndUpdate}
                disabled={selectedCount === 0}
                className="text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1 rounded text-xs font-semibold"
              >
                Print & Update ({selectedCount})
              </button>

              <button onClick={onClose} className="text-gray-200 hover:text-white text-xl font-bold px-2">×</button>
            </div>
          </div>

          {/* Scanned Barcode Display */}
          {scannedBarcodes.length > 0 && (
            <div className="px-4 py-2 bg-cyan-50 border-b border-cyan-200">
              {scannedBarcodes.map((scan, idx) => (
                <div key={idx} className="text-xs text-cyan-900 font-medium">
                  ✅ Barcode Scanned: Visit ID: <span className="font-bold">{scan.visitId}</span> | Sample ID: <span className="font-bold">{scan.sampleId}</span> @ {scan.timestamp}
                </div>
              ))}
            </div>
          )}

          <div className="overflow-y-auto flex-1 p-4 bg-white" id="barcode-print-area">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {barcodeLabels.map((label, idx) => (
                <BarcodeCard
                  key={idx}
                  label={label}
                  patientInfo={barcodePatientInfo}
                  isSelected={selectedBarcodes?.has(idx) || false}
                  index={idx}
                  onClick={() => onBarcodeToggle?.(idx)}
                  barcode_status={label.barcode_status}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BarcodeModal;
