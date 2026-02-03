import {AlbumTemplate} from "./AlbumTemplate";
import {SheetType} from "./SheetType";
import {CoverType} from "./CoverType";
import {Cover} from "./Cover";
import {Photo} from "./Photo";
import {PhotosPerSpread} from "../../Constants";
import {Page} from "./Page";

export interface Album {
  id: string;
  date: Date;
  title: string;
  lines: string[];
  titleDefault: string;
  name: string;
  productId: number;
  template: AlbumTemplate;
  sheetType: SheetType;
  coverType: CoverType;
  photosPerPage: PhotosPerSpread;

  cover: Cover;
  pages: Array<Page>;
  photos: Array<Photo>;
  wrappingCost: number;
  interest: number;
  params: Array<string>;
  pagesLow: Array<Page>;
  pagesMedium: Array<Page>;
  pagesHigh: Array<Page>;
  fromMax: boolean;

  isInCart: boolean;
  amount: number;
  isSelectedForOrder: boolean;
  currentSorting: number;
  cost: number;
  region: string;
  currency: string;
  isPhotoPicked: boolean;
  isPhotoSelected: boolean;
  isImportantSelected: boolean;
  isCoverSelected: boolean;
  isBought: boolean;
}
