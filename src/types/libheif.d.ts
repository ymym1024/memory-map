declare module 'libheif-js' {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(data: Uint8ClampedArray): void;
  }

  export class HeifDecoder {
    decode(data: Uint8Array): HeifImage[];
  }

  const LibHeif: {
    HeifDecoder: typeof HeifDecoder;
  };

  export default LibHeif;
} 