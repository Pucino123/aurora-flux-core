import React from "react";
import { DbDocument } from "@/hooks/useDocuments";

interface DocumentViewProps {
  document: DbDocument;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
}

const DocumentView = ({ document, onBack, onUpdate, onDelete }: DocumentViewProps) => {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <p>Document view implementation coming soon in Batch 3.</p>
      <p>Title: {document.title}</p>
      <button onClick={onBack} className="mt-4 text-primary">Back</button>
    </div>
  );
};

export default DocumentView;
