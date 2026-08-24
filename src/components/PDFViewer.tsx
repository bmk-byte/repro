import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, X } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { getFreshFileUrl } from '../lib/storage';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  fileUrl: string;
  onClose?: () => void;
  showControls?: boolean;
  initialScale?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  onClose,
  showControls = true,
  initialScale = 1.0
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(initialScale);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResolvedUrl(null);

    getFreshFileUrl(fileUrl)
      .then((freshUrl) => {
        if (!cancelled) setResolvedUrl(freshUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load PDF document. Please try again later or download the file.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);

    if (error.message.includes('not a PDF file')) {
      setError('This document is not a PDF file. Please download it to view.');
    } else {
      setError('Failed to load PDF document. Please try again later or download the file.');
    }

    setLoading(false);
  };

  const previousPage = () => {
    setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  };

  const nextPage = () => {
    setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages || 1));
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = resolvedUrl || fileUrl;
    link.download = fileUrl.split('/').pop() || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPdfFile = fileUrl.toLowerCase().endsWith('.pdf');

  if (!isPdfFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <div className="text-amber-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Non-PDF Document</h3>
          <p className="text-gray-600 mb-4">
            This document cannot be previewed in the browser. Please download it to view.
          </p>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Document
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showControls && (
        <div className="flex justify-between items-center p-2 bg-gray-100 border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <button
              onClick={nextPage}
              disabled={numPages === null || pageNumber >= numPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="p-1 rounded hover:bg-gray-200"
              title="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-1 rounded hover:bg-gray-200"
              title="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={rotate}
              className="p-1 rounded hover:bg-gray-200"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <button
              onClick={downloadPDF}
              className="p-1 rounded hover:bg-gray-200"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-200"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-200 flex justify-center">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Download Document
            </button>
          </div>
        ) : resolvedUrl ? (
          <Document
            file={resolvedUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="flex justify-center items-center h-full">Loading document...</div>}
            error={<div className="text-red-500">Failed to load PDF document</div>}
            className="my-4"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
              loading={<div className="flex justify-center items-center h-[600px] w-[400px]">Loading page...</div>}
              error={<div className="text-red-500">Error loading page {pageNumber}</div>}
            />
          </Document>
        ) : null}
      </div>
    </div>
  );
};

export default PDFViewer;
