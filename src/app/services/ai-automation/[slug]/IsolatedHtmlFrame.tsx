"use client";

import { useEffect, useRef, useState } from "react";

type IsolatedHtmlFrameProps = {
  srcDoc: string;
  title: string;
};

export default function IsolatedHtmlFrame({ srcDoc, title }: IsolatedHtmlFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== "isolated-html-height") return;
      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) setHeight(Math.ceil(nextHeight));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{ height }}
      className="block w-full border-0"
      loading="lazy"
    />
  );
}
