const iframeRuntime = `
<script>
(function () {
  function reportHeight() {
    var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    parent.postMessage({ type: "isolated-html-height", height: height }, "*");
  }
  window.addEventListener("load", reportHeight);
  window.addEventListener("resize", reportHeight);
  if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.documentElement);
  setTimeout(reportHeight, 250);
  setTimeout(reportHeight, 1000);
})();
</script>`;

export function createIsolatedHtmlDocument(body: string): string {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body { background: transparent; color: #263d4a; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; font-size: 24px; line-height: 1; letter-spacing: normal; text-transform: none; display: inline-block; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-feature-settings: 'liga'; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body>${body}${iframeRuntime}</body>
</html>`;
}
