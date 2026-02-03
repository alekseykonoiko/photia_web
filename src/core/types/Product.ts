import {AlbumTemplate} from "./album/AlbumTemplate";

export interface Product {
  id: number;
  name: string;
  image: string;
  params: Array<string>;
  wrappingCost: number;
  interest: number;
  selected?: boolean;
  photos: Array<unknown>;
  template: AlbumTemplate;
  notes: string;
  skeleton?: boolean;
  cost: number;
  currency: string;
  productTypeId: number;
  period: number;
}
