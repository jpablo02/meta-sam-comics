/**
 * Cut the tracked object out of the panel it was found in.
 *
 * SAM measures its boxes against the CLIP canvas, not against the panel. The
 * clip letterboxes each panel onto a square, so a box has to be mapped back
 * through that transform before it means anything on the original art —
 * otherwise the crop lands off the object on every panel that was not already
 * square.
 */
import sharp from "sharp";
import type { PanelAppearance } from "./trackObject";

/** Grown slightly so the cut does not shave the object's edge. */
const PADDING_RATIO = 0.04;

export interface CropResult {
  path: string;
  width: number;
  height: number;
}

/**
 * Undo the `fit: "contain"` letterbox and crop the panel.
 *
 * The panel was scaled by the same factor on both axes to fit inside the
 * canvas, then centred — so the inverse is: subtract the offset, divide by the
 * scale.
 */
export async function cropFromPanel(
  panelPath: string,
  appearance: PanelAppearance,
  outPath: string,
): Promise<CropResult> {
  const meta = await sharp(panelPath).metadata();
  const panelW = meta.width;
  const panelH = meta.height;
  if (!panelW || !panelH) throw new Error(`Cannot read dimensions of ${panelPath}`);

  const scale = Math.min(appearance.canvas.w / panelW, appearance.canvas.h / panelH);
  const offsetX = (appearance.canvas.w - panelW * scale) / 2;
  const offsetY = (appearance.canvas.h - panelH * scale) / 2;

  const toPanel = (x: number, y: number) => ({
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale,
  });

  const topLeft = toPanel(appearance.box.x1, appearance.box.y1);
  const bottomRight = toPanel(appearance.box.x2, appearance.box.y2);

  const rawW = bottomRight.x - topLeft.x;
  const rawH = bottomRight.y - topLeft.y;
  const padX = rawW * PADDING_RATIO;
  const padY = rawH * PADDING_RATIO;

  // Clamp: a padded box can run past the edge of the panel.
  const left = Math.max(0, Math.round(topLeft.x - padX));
  const top = Math.max(0, Math.round(topLeft.y - padY));
  const width = Math.min(panelW - left, Math.round(rawW + padX * 2));
  const height = Math.min(panelH - top, Math.round(rawH + padY * 2));

  if (width <= 0 || height <= 0) {
    throw new Error(`Box maps outside panel ${panelPath}`);
  }

  await sharp(panelPath).extract({ left, top, width, height }).toFile(outPath);
  return { path: outPath, width, height };
}
