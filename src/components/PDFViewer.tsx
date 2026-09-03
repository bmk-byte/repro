import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, X } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { getFreshFileUrl } from '../lib/storage';
import { LoadingState } from './ui';

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
  const { t } = useTranslation('misc');
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
          setError(t('pdfViewer.failedToLoad'));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [fileUrl, t]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);

    if (error.message.includes('not a PDF file')) {
      setError(t('pdfViewer.notPdfFile'));
    } else {
      setError(t('pdfViewer.failedToLoad'));
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
      <div className="flex flex-col items-center justify-center h-full p-4 bg-stone-100">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <div className="text-amber-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-2">{t('pdfViewer.nonPdfTitle')}</h3>
          <p className="text-stone-600 mb-4">
            {t('pdfViewer.nonPdfDescription')}
          </p>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('pdfViewer.downloadDocument')}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center px-4 py-2 border border-stone-300 text-sm font-medium rounded-md text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <X className="h-4 w-4 mr-2" />
              {t('pdfViewer.close')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showControls && (
        <div className="flex justify-between items-center p-2 bg-stone-100 border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="p-1 rounded hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('pdfViewer.previousPage')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm">
              {t('pdfViewer.pageOf', { page: pageNumber, total: numPages || '?' })}
            </span>
            <button
              onClick={nextPage}
              disabled={numPages === null || pageNumber >= numPages}
              className="p-1 rounded hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('pdfViewer.nextPage')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="p-1 rounded hover:bg-stone-200"
              title={t('pdfViewer.zoomOut')}
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-1 rounded hover:bg-stone-200"
              title={t('pdfViewer.zoomIn')}
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={rotate}
              className="p-1 rounded hover:bg-stone-200"
              title={t('pdfViewer.rotate')}
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <button
              onClick={downloadPDF}
              className="p-1 rounded hover:bg-stone-200"
              title={t('pdfViewer.download')}
            >
              <Download className="h-5 w-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-stone-200"
                title={t('pdfViewer.close')}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-stone-200 flex justify-center">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <LoadingState label={t('pdfViewer.loadingDocument')} />
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              {t('pdfViewer.downloadDocument')}
            </button>
          </div>
        ) : resolvedUrl ? (
          <Document
            file={resolvedUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="flex justify-center items-center h-full">{t('pdfViewer.loadingDocument')}</div>}
            error={<div className="text-red-500">{t('pdfViewer.failedToLoadShort')}</div>}
            className="my-4"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
              loading={<div className="flex justify-center items-center h-[600px] w-[400px]">{t('pdfViewer.loadingPage')}</div>}
              error={<div className="text-red-500">{t('pdfViewer.errorLoadingPage', { page: pageNumber })}</div>}
            />
          </Document>
        ) : null}
      </div>
    </div>
  );
};

export default PDFViewer;
