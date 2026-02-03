import {Frame} from "./Frame";
import {TextFrame} from "./TextFrame";

export interface CoverTemplate {
  data: Array<Frame>;
  text: Array<TextFrame>;
  coverCategoryId: number;
  coverType: number;
}
