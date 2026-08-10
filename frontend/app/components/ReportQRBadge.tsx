'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { generateReportQRCode } from '@/app/utils/qr-generator';

interface ReportQRBadgeProps {
  token: string;
  patientTestId: number;
  isVerified?: boolean;
  showQRCode?: boolean;
  baseUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ReportQRBadge({
  token,
  patientTestId,
  isVerified = true,
  showQRCode = false,
  baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  size = 'md'
}: ReportQRBadgeProps) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(showQRCode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showQRCode && !qrCodeData) {
      generateQRCodeData();
    }
  }, [showQRCode]);

  const generateQRCodeData = async () => {
    try {
      setLoading(true);
      const qrUrl = await generateReportQRCode(token, baseUrl);
      setQrCodeData(qrUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const badgeSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]}`}>
      {/* Verification Badge */}
      <div className="flex items-center gap-2 mb-2">
        {isVerified ? (
          <>
            <div className={`${badgeSizeClasses[size]} bg-green-100 rounded-full flex items-center justify-center flex-shrink-0`}>
              <CheckCircle className="text-green-600" size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
            </div>
            <div>
              <p className={`font-semibold ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
                Verified Report
              </p>
              <p className={`text-gray-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                Secured with QR authentication
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={`${badgeSizeClasses[size]} bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0`}>
              <AlertCircle className="text-yellow-600" size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
            </div>
            <div>
              <p className={`font-semibold ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
                Unverified Report
              </p>
              <p className={`text-gray-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                No QR authentication available
              </p>
            </div>
          </>
        )}
      </div>

      {/* QR Code Display Section */}
      {isVerified && (
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className={`font-medium text-gray-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              Report ID: {patientTestId}
            </p>
            <button
              onClick={() => setShowQRModal(!showQRModal)}
              className={`text-blue-600 hover:text-blue-700 font-medium transition-colors ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
            >
              {showQRModal ? 'Hide' : 'Show'} QR
            </button>
          </div>

          {/* QR Code Modal */}
          {showQRModal && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : qrCodeData ? (
                <>
                  <img
                    src={qrCodeData}
                    alt="Report QR Code"
                    className="w-full max-w-xs mx-auto mb-3 border border-gray-300 rounded"
                  />
                  <p className={`text-gray-600 text-center ${size === 'sm' ? 'text-xs' : 'text-xs'} mb-2`}>
                    Scan this QR code to view the verified report
                  </p>
                </>
              ) : (
                <button
                  onClick={generateQRCodeData}
                  className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Generate QR Code
                </button>
              )}

              {/* Token Display */}
              <div className="mt-3 p-2 bg-white border border-gray-200 rounded">
                <p className={`text-gray-600 font-medium mb-1 ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
                  Token:
                </p>
                <div className="flex items-center gap-1">
                  <code className={`flex-1 break-all bg-gray-100 px-2 py-1 rounded font-mono ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
                    {token.substring(0, 16)}...
                  </code>
                  <button
                    onClick={copyTokenToClipboard}
                    className={`p-1 text-gray-600 hover:text-gray-900 transition-colors ${size === 'sm' ? '' : ''}`}
                    title="Copy full token"
                  >
                    <Copy size={size === 'sm' ? 14 : 16} />
                  </button>
                </div>
                {copied && (
                  <p className={`text-green-600 mt-1 ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
                    ✓ Token copied to clipboard
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
