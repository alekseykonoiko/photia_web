import { v4 as uuidv4 } from 'uuid';
import { Album } from '../core/types/album/Album';
import { Photo } from '../core/types/album/Photo';
import { Product } from '../core/types/Product';
import { PhotosPerSpread } from '../core/Constants';
import {
  calculateMockUp,
  generatePhotoBook,
  GetExrTemplates,
  GetSmallTemplates,
  GetTemplates
} from '../core/album-new-helper';

export type BuildResult = {
  album: Album;
  previewWidth: number;
  previewHeight: number;
};

export async function buildAlbum(
  product: Product,
  inputPhotos: Photo[],
  previewWidth = 300
): Promise<BuildResult> {
  const now = new Date();
  const photos = inputPhotos.map((p, idx) => ({ ...p, index: idx + 1 }));

  const coverTemplate = product.template.coverTemplate;
  const coverText = coverTemplate?.text?.[0];

  const album: Album = {
    id: uuidv4(),
    date: now,
    name: product.name,
    title: '',
    lines: [],
    titleDefault: 'My Photobook',
    productId: product.id,
    template: product.template,
    sheetType: product.template.sheetType,
    coverType: product.template.coverType,
    photosPerPage: PhotosPerSpread.MEDUIM,
    cover: {
      text: coverTemplate?.data?.[0] ?? null,
      font: coverText?.font ?? 'Inter',
      fontSize: coverText?.fontSize ?? 200,
      color: coverText?.color ?? '#000000',
      lines: [],
      isBold: coverText?.isBold ?? false,
      isItalic: coverText?.isItalic ?? false,
      manual: false
    },
    pages: [],
    photos,
    params: product.params ?? [],
    wrappingCost: product.wrappingCost ?? 0,
    interest: product.interest ?? 0,
    pagesLow: [],
    pagesMedium: [],
    pagesHigh: [],
    fromMax: false,
    isInCart: false,
    amount: 1,
    isSelectedForOrder: false,
    currentSorting: 1,
    cost: 0,
    region: '',
    currency: product.currency ?? '',
    isPhotoPicked: true,
    isPhotoSelected: true,
    isImportantSelected: false,
    isCoverSelected: false,
    isBought: false
  };

  const templates = GetTemplates(album, PhotosPerSpread.MEDUIM);
  const smallTemplates = GetSmallTemplates(album, PhotosPerSpread.MEDUIM);
  const alternativeTemplates = GetExrTemplates(album, PhotosPerSpread.MEDUIM);

  const result = generatePhotoBook(
    PhotosPerSpread.MEDUIM,
    templates,
    smallTemplates,
    alternativeTemplates,
    photos,
    album.template.maxSpreadsCount * 2,
    album
  );

  const albumAR = album.template.width / album.template.height;
  const previewHeight = previewWidth / albumAR;
  const realToDigitalWidthScale = album.template.width / previewWidth;
  const realToDigitalHeightScale = album.template.height / previewHeight;

  const pages = await calculateMockUp(
    result.pages,
    album,
    realToDigitalWidthScale,
    realToDigitalHeightScale,
    false
  );
  album.pages = pages;

  return { album, previewWidth, previewHeight };
}
