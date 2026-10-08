import React from "react";

export default function ProgressBar({ value, label, className = "" }) {
  return (
    <div className={`progress-wrap ${className}`}>
      {label && <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>}
      <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100">
        <span className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
