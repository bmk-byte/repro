import React, { useState, useEffect } from 'react';
import { X, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFViewer from './PDFViewer';
import { getFreshFileUrl } from '../lib/storage';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  title?: string;
}

const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  documentUrl,
  title = 'Document Preview'
}) => {
  const [viewMode, setViewMode] = useState<'download' | 'view'>('download');
  const [resolvedUrl, setResolvedUrl] = useState<string>(documentUrl);

  useEffect(() => {
    if (!isOpen) return;
    setResolvedUrl(documentUrl);
    getFreshFileUrl(documentUrl)
      .then(setResolvedUrl)
      .catch((err) => {
        console.error('Failed to resolve a fresh document URL, falling back to the original link:', err);
        toast.error('Could not refresh this document\'s link — it may be expired. Trying the original link.');
      });
  }, [isOpen, documentUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'download' ? 'view' : 'download');
  };

  const isPdf = documentUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg ${viewMode === 'view' ? 'w-full max-w-4xl h-[90vh]' : 'w-full max-w-md'} flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900 truncate max-w-[70%]">{title}</h3>
          <div className="flex items-center space-x-2">
            {isPdf && (
              <button
                onClick={toggleViewMode}
                className="text-gray-500 hover:text-primary p-2 rounded-full hover:bg-gray-100"
                title={viewMode === 'download' ? 'View Document' : 'Download Options'}
              >
                {viewMode === 'download' ? <Eye className="h-5 w-5" /> : <Download className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {viewMode === 'download' || !isPdf ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="bg-gray-100 p-8 rounded-lg mb-6">
              <svg className="h-16 w-16 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <p className="text-center text-gray-600 mb-6">
              {isPdf 
                ? "Click the button below to download this document to your device or view it in the browser."
                : "This document can only be downloaded. Click the button below to download it to your device."}
            </p>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Document
              </button>
              
              {isPdf && (
                <button
                  onClick={toggleViewMode}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View in Browser
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <PDFViewer fileUrl={documentUrl} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentModal;
