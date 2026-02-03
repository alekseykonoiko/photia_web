import {Frame} from "./Frame";

export interface Text {
  color: string;
  frame?: Frame;
  text: string;
  isBold: boolean;
  isItalic: boolean;
}
