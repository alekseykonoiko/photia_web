import {Frame} from "./Frame";
import {Orientation} from "../../Constants";
import {Face} from "./Face";

export interface Photo {
  id: string;
  width: number;
  height: number;
  top: number;
  left: number;
  imageUrl: string;
  localUrl: string;
  frame: Frame;
  lowQuality: boolean;
  faces: Array<Face>;
  fileName: string;
  fileSize: number;
  type: "image/jpg";
  isFavorite: boolean;
  isBig: boolean;
  isSelected: boolean;
  blockedQuality: boolean;
  timestamp: number;
  orientation: Orientation;
  fileExtension: string;
  index: number;
  scaledWidth: number;
  scaledHeight: number;
  offsetX: number;
  offsetY: number;
  scaledFrameWidth: number;
  scaledFrameHeight: number;
  resizedPhotoWidth: number;
  resizedPhotoHeight: number;
  locked: boolean;
  assetId: string;

  maxFaceLeft: number;
  maxFaceRight: number;
  maxFaceTop: number;
  maxFaceBottom: number;
}
