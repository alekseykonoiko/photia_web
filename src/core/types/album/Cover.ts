import {Frame} from "./Frame";
import {Photo} from "./Photo";
import {CoverColor} from "./CoverColor";

export interface Cover {
  photo?: Photo | null;
  text?: Frame | null;
  backgroundColor?: CoverColor | null;
  font: string;
  fontSize: number;
  color: string;
  title?: string;
  lines: string[];
  isBold: boolean;
  isItalic: boolean;
  manual: boolean;
}
