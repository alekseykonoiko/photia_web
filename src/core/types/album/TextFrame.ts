export interface TextFrame {
  width: number;
  height: number;
  top: number;
  left: number;
  angle: number;
  type: number;

  scaledWidth: number;
  scaledHeight: number;
  scaledTop: number;
  scaledLeft: number;

  font: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  version: number;
}
