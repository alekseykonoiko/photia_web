export interface Frame {
  width: number;
  height: number;
  top: number;
  left: number;
  angle: number;
  type: number;

  scaledWidth: number;
  scaledHeight: number;
  scaledTop: number;
  scaledLeft: number;

  index: number;
  universal: boolean;

  cutWidth: number;
  cutHeight: number;
  cutTop: number;
  cutLeft: number;

  cutScaledWidth: number;
  cutScaledHeight: number;
  cutScaledTop: number;
  cutScaledLeft: number;

  secWidth: number;
  secHeight: number;
  secTop: number;
  secLeft: number;

  secScaledWidth: number;
  secScaledHeight: number;
  secScaledTop: number;
  secScaledLeft: number;

  version: number;
}
