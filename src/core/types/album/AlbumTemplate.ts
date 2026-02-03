import {CoverType} from "./CoverType";
import {SheetType} from "./SheetType";
import {PageTemplate} from "./PageTemplate";
import {CoverTemplate} from "./CoverTemplate";
import {PhotosPerSpread} from "../../Constants";

export interface AlbumTemplate {
  width: number;
  height: number;
  coverWidth: number;
  coverHeight: number;
  pageTemplates: Array<PageTemplate>;
  coverTemplates: Array<CoverTemplate>;
  coverTypes: Array<CoverType>;
  sheetTypes: Array<SheetType>;
  minSpreadsCount: number;
  maxSpreadsCount: number;
  formatW: number;
  formatH: number;
  sheetType: SheetType;
  coverType: CoverType;
  photosPerPage: PhotosPerSpread;
  coverTemplate: CoverTemplate;
  premium: boolean;
}
