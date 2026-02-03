export interface MaxMinPhotoInfo {
  enoughForMin: boolean;
  minNeeded: MaxMinInfo;
  maxAllowed: MaxMinInfo;

  remainingCanBeAdded: MaxMinInfo;
}

export interface MaxMinInfo {
  horizontal: number;
  vertical: number;
}

export interface MaxMinPhoto {
  minPhotos: number;
  maxPhotos: number;
}
