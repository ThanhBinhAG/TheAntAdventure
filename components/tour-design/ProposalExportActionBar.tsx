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
          <button className="btn btn-s" type="button" onClick={onReset}>
            + New Design
          </button>
        </div>
        <div className="td-export-action-right">
          <button
            className="btn btn-p"
            type="button"
            onClick={onDownloadPdf}
            disabled={pdfLoading || !hasContent}
          >
            {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
          </button>
          <button
            className="btn btn-s"
            type="button"
            onClick={onPrintPdf}
            disabled={pdfLoading || !hasContent}
          >
            Print / Save PDF
          </button>
          <button className="btn btn-s" type="button" onClick={onDownloadWord} disabled={!hasContent}>
            Download Word
          </button>
        </div>
      </div>
    </div>
  );
}
