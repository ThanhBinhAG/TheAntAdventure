'use client';

interface Props {
  hasContent: boolean;
  pdfLoading: boolean;
  error: string;
  onDownloadPdf: () => void;
  onPrintPdf: () => void;
  onDownloadWord: () => void;
  onBack: () => void;
  onReset: () => void;
  canWrite?: boolean;
}

export default function ProposalExportActionBar({
  hasContent,
  pdfLoading,
  error,
  onDownloadPdf,
  onPrintPdf,
  onDownloadWord,
  onBack,
  onReset,
  canWrite = true,
}: Props) {
  return (
    <div className="td-export-action-bar">
      {error ? (
        <div className="td-ai-error td-export-action-error" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}
      <div className="td-export-action-row">
        <div className="td-export-action-left">
          <button className="btn btn-s" type="button" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-s" type="button" onClick={onReset} disabled={!canWrite}>
            + New Design
          </button>
        </div>
        <div className="td-export-action-right">
          <button
            className="btn btn-p"
            type="button"
            onClick={onDownloadPdf}
            disabled={pdfLoading || !hasContent || !canWrite}
          >
            {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
          </button>
          <button
            className="btn btn-s"
            type="button"
            onClick={onPrintPdf}
            disabled={pdfLoading || !hasContent || !canWrite}
          >
            Print / Save PDF
          </button>
          <button className="btn btn-s" type="button" onClick={onDownloadWord} disabled={!hasContent || !canWrite}>
            Download Word
          </button>
        </div>
      </div>
    </div>
  );
}
