import {Frame} from "./Frame";
import {Position} from "../../Constants";

export interface PageTemplate {
  photoFrames: Array<Frame>;
  photoTemplateId: number;
  hasBorders: boolean;
  position: Position;
  priority: number;
  blockedcombinations: string;
  preferredcombinations: string;
}
