import { PDFDocument, degrees, rgb } from 'pdf-lib';
import { ProjectModel, KeyElement } from '../types';
import { mmToPoints, paperSizeMm } from './units';

function getDataUrlMime(dataUrl: string): string | undefined {
  const match = /^data:([^;,]+)[;,]/i.exec(dataUrl);
  return match?.[1]?.toLowerCase();
}

function dataUrlToBytes(dataUrl: string): Uint8Array | undefined {
  const data = dataUrl.split(',')[1];
  if (!data) return undefined;
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
}

async function convertDataUrlToPng(dataUrl: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(undefined);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

async function embedImage(doc: PDFDocument, el: KeyElement) {
  if (el.type !== 'image') return undefined;
  const dataUrl = el.dataUrl;
  if (!dataUrl) return undefined;
  const mime = getDataUrlMime(dataUrl);
  const bytes = dataUrlToBytes(dataUrl);
  if (bytes && mime === 'image/png') return doc.embedPng(bytes);
  if (bytes && (mime === 'image/jpeg' || mime === 'image/jpg')) return doc.embedJpg(bytes);

  const converted = await convertDataUrlToPng(dataUrl);
  if (!converted) return undefined;
  const convertedBytes = dataUrlToBytes(converted);
  if (!convertedBytes) return undefined;
  return doc.embedPng(convertedBytes);
}

export async function exportProjectToPdf(project: ProjectModel, includeRuler = true): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { width, height } = paperSizeMm(project.paper.size, project.paper.orientation || 'portrait');
  const page = doc.addPage([mmToPoints(width), mmToPoints(height)]);

  const font = await doc.embedFont('Helvetica');
  const margin = project.paper.marginMm;
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  for (const key of project.layout.keys) {
    const keyWidthPt = mmToPoints(key.width);
    const keyHeightPt = mmToPoints(key.height);
    const originX = mmToPoints(margin + key.x);
    const originY = mmToPoints(height - margin - key.y - key.height);
    const rotationDeg = -(key.rotation || 0);
    const rotation = degrees(rotationDeg);
    const rad = degToRad(rotationDeg);
    const cx = originX + keyWidthPt / 2;
    const cy = originY + keyHeightPt / 2;
    const rotPt = (x: number, y: number) => {
      if (!rotationDeg) return { x, y };
      const dx = x - cx;
      const dy = y - cy;
      return {
        x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
        y: cy + dx * Math.sin(rad) + dy * Math.cos(rad)
      };
    };
    const outlineColor = key.background && key.background !== 'transparent' ? rgbFromHex(key.background) : undefined;
    let rawOutline: Array<{ x: number; y: number }>;
    if (key.keyType === 'iso-enter') {
      const topH = key.height / 2;
      const squareW = key.height / 2;
      rawOutline = [
        { x: originX, y: originY },
        { x: originX + keyWidthPt, y: originY },
        { x: originX + keyWidthPt, y: originY + keyHeightPt },
        { x: originX + keyWidthPt - mmToPoints(squareW), y: originY + keyHeightPt },
        { x: originX + keyWidthPt - mmToPoints(squareW), y: originY + mmToPoints(topH) },
        { x: originX, y: originY + mmToPoints(topH) }
      ];
    } else if (key.keyType === 'big-enter') {
      const topH = key.height / 2;
      const topW = Math.min(key.width, 20.25);
      rawOutline = [
        { x: originX, y: originY + keyHeightPt },
        { x: originX + keyWidthPt, y: originY + keyHeightPt },
        { x: originX + keyWidthPt, y: originY },
        { x: originX + keyWidthPt - mmToPoints(topW), y: originY },
        { x: originX + keyWidthPt - mmToPoints(topW), y: originY + mmToPoints(topH) },
        { x: originX, y: originY + mmToPoints(topH) }
      ];
    } else {
      rawOutline = [
        { x: originX, y: originY },
        { x: originX + keyWidthPt, y: originY },
        { x: originX + keyWidthPt, y: originY + keyHeightPt },
        { x: originX, y: originY + keyHeightPt }
      ];
    }
    const outline = rawOutline.map((pt) => rotPt(pt.x, pt.y));
    const path = ['M', `${outline[0].x}`, `${outline[0].y}`];
    for (let i = 1; i < outline.length; i += 1) {
      path.push('L', `${outline[i].x}`, `${outline[i].y}`);
    }
    path.push('Z');
    const pathString = path.join(' ');
    if (outlineColor) {
      page.drawSvgPath(pathString, {
        color: outlineColor
      });
    }
    for (let i = 0; i < outline.length; i += 1) {
      const start = outline[i];
      const end = outline[(i + 1) % outline.length];
      page.drawLine({
        start,
        end,
        thickness: 0.6,
        color: rgb(0, 0, 0)
      });
    }

    const sorted = [...key.elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      const pad = el.padding ?? key.padding ?? 0;
      const elX = originX + mmToPoints((el.x || 0) + pad);
      const elY = originY + mmToPoints(key.height - (el.y || 0) - (el.height || key.height) + pad);
      const elWidth = mmToPoints((el.width || key.width) - pad * 2);
      const elHeight = mmToPoints((el.height || key.height) - pad * 2);
      const baseOrigin = rotPt(elX, elY);
      const baseOpts = {
        x: baseOrigin.x,
        y: baseOrigin.y,
        width: elWidth,
        height: elHeight,
        rotate: rotation
      };

      if (el.type === 'text') {
        const textX = elX + 2;
        const textY = elY + elHeight / 2 - (el.fontSize || 10) / 2;
        const textOrigin = rotPt(textX, textY);
        page.drawText(el.text || '', {
          x: textOrigin.x,
          y: textOrigin.y,
          size: el.fontSize || 10,
          color: rgbFromHex(el.color || '#f8fafc'),
          font,
          rotate: rotation
        });
      }
      if (el.type === 'shape') {
        page.drawRectangle({
          ...baseOpts,
          color: rgbFromHex(el.background || '#1e293b')
        });
      }
      if (el.type === 'image') {
        const image = await embedImage(doc, el);
        if (image) {
          const availW = elWidth;
          const availH = elHeight;
          const naturalRatio = image.width / image.height;
          const areaRatio = availW / availH;
          let drawW = availW;
          let drawH = availH;
          if (el.fit === 'contain') {
            if (areaRatio > naturalRatio) {
              drawH = availH;
              drawW = availH * naturalRatio;
            } else {
              drawW = availW;
              drawH = availW / naturalRatio;
            }
          } else if (el.fit === 'cover') {
            if (areaRatio < naturalRatio) {
              drawH = availH;
              drawW = availH * naturalRatio;
            } else {
              drawW = availW;
              drawH = availW / naturalRatio;
            }
          }
          const alignX = el.alignX || 'center';
          const alignY = el.alignY || 'center';
          const offsetX =
            alignX === 'center' ? elX + (availW - drawW) / 2 : alignX === 'right' ? elX + (availW - drawW) : elX;
          const offsetY =
            alignY === 'center' ? elY + (availH - drawH) / 2 : alignY === 'bottom' ? elY + (availH - drawH) : elY;

          const imageOrigin = rotPt(offsetX, offsetY);
          page.drawImage(image, {
            x: imageOrigin.x,
            y: imageOrigin.y,
            width: drawW,
            height: drawH,
            rotate: rotation
          });
        }
      }
    }
  }

  if (includeRuler) {
    const barWidth = mmToPoints(50);
    page.drawRectangle({
      x: mmToPoints(margin),
      y: mmToPoints(margin),
      width: barWidth,
      height: mmToPoints(4),
      color: rgb(0, 0, 0)
    });
    page.drawText('50mm test bar', {
      x: mmToPoints(margin),
      y: mmToPoints(margin + 6),
      size: 8,
      font,
      color: rgb(0.2, 0.24, 0.3)
    });
  }

  return doc.save();
}

export function exportProjectToSvg(project: ProjectModel): string {
  const { width, height } = paperSizeMm(project.paper.size, project.paper.orientation || 'portrait');
  const margin = project.paper.marginMm;
  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">`
  ];

  project.layout.keys.forEach((key) => {
    const x = margin + key.x;
    const y = margin + key.y;
    const cx = x + key.width / 2;
    const cy = y + key.height / 2;
    const rotation = key.rotation || 0;
    const transform = rotation ? ` transform="rotate(${rotation} ${cx} ${cy})"` : '';
    svgParts.push(`<g id="${key.id}"${transform}>`);
    if (key.keyType === 'iso-enter') {
      const topH = key.height / 2;
      const squareW = key.height / 2;
      const fill = key.background && key.background !== 'transparent' ? key.background : 'none';
      const path = [
        `M ${x} ${y}`,
        `L ${x + key.width} ${y}`,
        `L ${x + key.width} ${y + key.height}`,
        `L ${x + key.width - squareW} ${y + key.height}`,
        `L ${x + key.width - squareW} ${y + topH}`,
        `L ${x} ${y + topH}`,
        'Z'
      ].join(' ');
      svgParts.push(`<path d="${path}" fill="${fill}" stroke="#000" stroke-width="0.3" />`);
    } else if (key.keyType === 'big-enter') {
      const topH = key.height / 2;
      const topW = Math.min(key.width, 20.25);
      const fill = key.background && key.background !== 'transparent' ? key.background : 'none';
      const path = [
        `M ${x} ${y + key.height}`,
        `L ${x + key.width} ${y + key.height}`,
        `L ${x + key.width} ${y}`,
        `L ${x + key.width - topW} ${y}`,
        `L ${x + key.width - topW} ${y + topH}`,
        `L ${x} ${y + topH}`,
        'Z'
      ].join(' ');
      svgParts.push(`<path d="${path}" fill="${fill}" stroke="#000" stroke-width="0.3" />`);
    } else {
      svgParts.push(
        `<rect x="${x}" y="${y}" width="${key.width}" height="${key.height}" rx="${key.cornerRadius}" fill="${key.background && key.background !== 'transparent' ? key.background : 'none'}" stroke="#000" stroke-width="0.3" />`
      );
    }
    const sorted = [...key.elements].sort((a, b) => a.zIndex - b.zIndex);
    sorted.forEach((el) => {
      const pad = el.padding ?? key.padding ?? 0;
      if (el.type === 'shape') {
        svgParts.push(
          `<rect x="${x + (el.x || 0) + pad}" y="${y + (el.y || 0) + pad}" width="${(el.width || key.width) - pad * 2}" height="${(el.height || key.height) - pad * 2}" rx="${el.cornerRadius || 0}" fill="${el.background || '#1e293b'}" />`
        );
      }
      if (el.type === 'text') {
        svgParts.push(
          `<text x="${x + (el.x || 0) + pad + 2}" y="${y + (el.y || 0) + pad + (el.fontSize || 10) + 2}" font-family="${el.fontFamily}" font-size="${el.fontSize || 10}" fill="${el.color || '#f8fafc'}">${escapeHtml(
            el.text || ''
          )}</text>`
        );
      }
      if (el.type === 'image' && el.dataUrl) {
        svgParts.push(
          `<image href="${el.dataUrl}" x="${x + (el.x || 0) + pad}" y="${y + (el.y || 0) + pad}" width="${(el.width || key.width) - pad * 2}" height="${(el.height || key.height) - pad * 2}" preserveAspectRatio="${el.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}" />`
        );
      }
    });
    svgParts.push('</g>');
  });

  svgParts.push('</svg>');
  return svgParts.join('');
}

function rgbFromHex(hex: string) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return rgb(r / 255, g / 255, b / 255);
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
