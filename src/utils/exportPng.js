/**
 * Smart Escape - PNG Map Exporter
 * Converts the active SVG floor map into a high-resolution PNG image for download.
 */

export function exportSvgToPng(svgElement, filename = 'smart-escape-map.png', buildingName = 'Building Map') {
  if (!svgElement) return;

  const svgRect = svgElement.getBoundingClientRect();
  const width = Math.max(svgRect.width, 900);
  const height = Math.max(svgRect.height, 600);

  // Clone SVG to modify styles safely for export
  const clone = svgElement.cloneNode(true);
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2; // Retina 2x scale
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Dark blueprint background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    // Draw SVG map
    ctx.drawImage(image, 0, 0, width, height);

    // Add Header Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(`SMART ESCAPE - ${buildingName}`, 24, 32);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Exported on ${new Date().toLocaleString()}`, 24, 52);

    URL.revokeObjectURL(blobURL);

    // Download file
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  image.src = blobURL;
}
