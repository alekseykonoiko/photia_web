import {Photo} from "./Photo";
import {Position} from "../../Constants";
import {PageTemplate} from "./PageTemplate";

export interface Page {
  id: string;
  Photos: Array<Photo>;
  Position: Position;
  PageTemplateId: number;
  PageTemplate: PageTemplate | null;
  HasBorders: boolean;
  IsCover: boolean;
  IsCollage: boolean;
}
