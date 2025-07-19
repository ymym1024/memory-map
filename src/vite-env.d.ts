/// <reference types="vite/client" />



declare module 'exifr' {
  export interface ExifrData {
    Make?: string;
    Model?: string;
    DateTime?: string;
    DateTimeOriginal?: string;
    DateTimeDigitized?: string;
    Software?: string;
    Copyright?: string;
    Artist?: string;
    ImageDescription?: string;
    Orientation?: number;
    XResolution?: number;
    YResolution?: number;
    ResolutionUnit?: number;
    ExposureTime?: number;
    FNumber?: number;
    ISOSpeedRatings?: number;
    FocalLength?: number;
    ExposureProgram?: number;
    MeteringMode?: number;
    Flash?: number;
    ColorSpace?: number;
    ExifImageWidth?: number;
    ExifImageHeight?: number;
    ComponentsConfiguration?: string;
    CompressedBitsPerPixel?: number;
    BrightnessValue?: number;
    ExposureBiasValue?: number;
    MaxApertureValue?: number;
    SubjectDistance?: number;
    WhiteBalance?: number;
    DigitalZoomRatio?: number;
    FocalLengthIn35mmFilm?: number;
    SceneCaptureType?: number;
    GainControl?: number;
    Contrast?: number;
    Saturation?: number;
    Sharpness?: number;
    SubjectDistanceRange?: number;
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSAltitude?: number;
    GPSLatitudeRef?: string;
    GPSLongitudeRef?: string;
    GPSAltitudeRef?: number;
    GPSTimeStamp?: string;
    GPSDateStamp?: string;
    GPSSpeed?: number;
    GPSSpeedRef?: string;
    GPSTrack?: number;
    GPSTrackRef?: string;
    [key: string]: any;
  }

  export function parse(input: File | ArrayBuffer | Uint8Array, options?: {
    tiff?: boolean;
    xmp?: boolean;
    icc?: boolean;
    iptc?: boolean;
    jfif?: boolean;
    ihdr?: boolean;
    thumb?: boolean;
    gps?: boolean;
    exif?: boolean;
    interop?: boolean;
    translateValues?: boolean;
    translateNames?: boolean;
    translateTags?: boolean;
    reviveValues?: boolean;
    mergeOutput?: boolean;
    firstChunkSize?: number;
    chunkSize?: number;
    chunked?: boolean;
    async?: boolean;
  }): Promise<ExifrData | null>;

  export function gps(input: File | ArrayBuffer | Uint8Array): Promise<{
    latitude?: number;
    longitude?: number;
    altitude?: number;
    timestamp?: Date;
  } | null>;

  export function orientation(input: File | ArrayBuffer | Uint8Array): Promise<number | null>;
  export function thumbnail(input: File | ArrayBuffer | Uint8Array): Promise<Blob | null>;
}

declare module 'libheif-js' {
  export interface HeifImage {
    getImageData(): ImageData;
    width: number;
    height: number;
  }

  export class HeifDecoder {
    decode(data: Uint8Array): HeifImage[];
  }

  const libheif: {
    HeifDecoder: typeof HeifDecoder;
  };
  
  export default libheif;
}
