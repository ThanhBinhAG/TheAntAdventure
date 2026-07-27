'use client';

import { useState, type ReactNode } from 'react';

type Props = {
  title: ReactNode;
  hint?: string;
  className?: string;
  children: (ctx: { editing: boolean }) => ReactNode;
};

/** Section heading with an Edit / Done toggle — fields stay read-only until Edit is pressed. */
export default function EditableSection({ title, hint, className, children }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <section className={`pcx-detail-block${className ? ` ${className}` : ''}${editing ? ' is-editing' : ''}`}>
      <div className="pcx-detail-hd">
        <h4 className="pcx-detail-title">
          {title}
          {hint && <span className="pcx-detail-hint">{hint}</span>}
        </h4>
        <button
          type="button"
          className={`btn btn-s pcx-edit-toggle${editing ? ' on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setEditing((v) => !v);
          }}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {children({ editing })}
    </section>
  );
}

type CardProps = {
  title: ReactNode;
  meta?: ReactNode;
  children: (ctx: { editing: boolean }) => ReactNode;
};

/** Card header with the same Edit / Done pattern for list-style blocks. */
export function EditableCard({ title, meta, children }: CardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section className={`card pcx-block-card${editing ? ' is-editing' : ''}`}>
      <div className="card-hd">
        <span className="card-title">{title}</span>
        <div className="pcx-card-actions">
          {meta}
          <button
            type="button"
            className={`btn btn-s pcx-edit-toggle${editing ? ' on' : ''}`}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>
      {children({ editing })}
    </section>
  );
}
