export class PasoDto {
  text?: string;
  done?: boolean;
}

export class GuardarMesDto {
  anio?: number;
  mes?: number;
  sent?: boolean;
  amounts?: Record<string, number>;
  steps?: PasoDto[];
  followDate?: string;
  followNote?: string;
  followDone?: boolean;
}
