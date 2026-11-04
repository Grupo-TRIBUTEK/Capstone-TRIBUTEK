import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator'

/** Describe únicamente controles disponibles, sin contraseñas ni valores de formularios. */
export class ControlIaDto {
  @IsString() @MaxLength(40) id!: string
  @IsString() @MaxLength(300) nombre!: string
  @IsIn(['boton', 'texto', 'numero', 'fecha', 'mes', 'seleccion']) tipo!: string
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(200, { each: true }) opciones?: string[]
}

export class MensajeIaDto {
  @IsIn(['user', 'assistant']) role!: 'user' | 'assistant'
  @IsString() @MaxLength(3000) text!: string
}

/** La interfaz envía un catálogo acotado. El servidor propone una sola acción por consulta. */
export class ConsultaIaDto {
  @IsString() @MinLength(1) @MaxLength(4000) consulta!: string
  @IsOptional() @IsString() @MaxLength(200) contexto?: string
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ControlIaDto)
  controles?: ControlIaDto[]
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => MensajeIaDto)
  historial?: MensajeIaDto[]
  @IsOptional() @IsString() @MaxLength(5000) vista?: string
}
