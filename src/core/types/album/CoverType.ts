import {CoverColor} from "./CoverColor";

export interface CoverType {
  coverTypeId: number;
  name: string;
  imageUrl: string;
  coverColors: Array<CoverColor>;
}
