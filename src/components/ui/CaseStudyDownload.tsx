import React from "react";
import Icon from "./AppIcon";

interface CaseStudyDownloadProps {
  label?: string;
  fileSize?: string;
}

export default function CaseStudyDownload({ label = "Detaylı Sunumu İndir (PDF)", fileSize = "2.4 MB" }: CaseStudyDownloadProps) {
  return (
    <button className="group flex items-center justify-between w-full border border-primary/20 p-4 hover:border-primary/50 hover:bg-bg-soft transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white text-primary transition-colors duration-300">
          <Icon name="DocumentArrowDownIcon" size={20} />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-body text-[13px] font-bold text-primary tracking-wide">
            {label}
          </span>
          <span className="font-body text-[10px] text-secondary tracking-wider uppercase">
            PDF Dosyası — {fileSize}
          </span>
        </div>
      </div>
      <Icon name="ArrowDownTrayIcon" size={16} className="text-auxiliary group-hover:text-primary transition-colors duration-300" />
    </button>
  );
}
