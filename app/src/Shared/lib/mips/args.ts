import { inEnum } from '../util/enum';
import {
  ArithmeticFunctionCode,
  FunctionCode,
  JumpFunctionCode,
  MoveFromFunctionCode,
  MoveToFunctionCode,
  MultiplicationFunctionCode,
  ShiftFunctionCode,
  ShiftVFunctionCode,
} from './funct';
import {
  ImmediateArithmeticOpcode,
  ImmediateBranchOpcode,
  ImmediateBranchZOpcode,
  ImmediateInstructionOpcode,
  ImmediateLoadOpcode,
  ImmediateLoadStoreOpcode,
  JumpInstructionOpcode,
} from './op';

export type InstructionType = 'reg' | 'imm' | 'jump';

export type ValidArgument<TType extends InstructionType> = TType extends 'reg'
  ? 'rd' | 'rs' | 'rt' | 'shamt'
  : TType extends 'imm'
  ? 'rs' | 'rt' | 'imm'
  : 'imm';

export type InstructionArgumentsBase<TType extends InstructionType> = {
  type: TType;
  arguments: ValidArgument<TType>[];
};

export type RegisterInstructionArguments = InstructionArgumentsBase<'reg'>;
export type ImmediateInstructionArguments = InstructionArgumentsBase<'imm'>;
export type JumpInstructionArguments = InstructionArgumentsBase<'jump'>;

export type InstructionArguments =
  | RegisterInstructionArguments
  | ImmediateInstructionArguments
  | JumpInstructionArguments;

type OptionalIfNot<T, TExpect, TActual> = TActual extends TExpect
  ? T
  : T | undefined;

/**
 * Gets the arguments required by the provided immediate opcode.
 *
 * @param operation A MIPS immediate opcode.
 * @returns The required arguments, or undefined if the opcode is invalid.
 */
export function getRequiredImmArguments<
  TOpcode extends string | ImmediateInstructionOpcode
>(
  op: TOpcode
): OptionalIfNot<
  ValidArgument<'imm'>[],
  keyof typeof ImmediateInstructionOpcode,
  TOpcode
> {
  if (inEnum(op, ImmediateArithmeticOpcode)) {
    return ['rt', 'rs', 'imm'];
  } else if (inEnum(op, ImmediateLoadOpcode)) {
    return ['rt', 'imm'];
  } else if (inEnum(op, ImmediateBranchOpcode)) {
    return ['rs', 'rt', 'imm'];
  } else if (inEnum(op, ImmediateBranchZOpcode)) {
    return ['rs', 'imm'];
  } else if (inEnum(op, ImmediateLoadStoreOpcode)) {
    return ['rt', 'imm', 'rs'];
  }

  return undefined!;
}

/**
 * Gets the arguments required by the provided jump opcode.
 *
 * @param operation A MIPS jump opcode.
 * @returns The required arguments, or undefined if the opcode is invalid.
 */
export function getRequiredJumpArguments<
  TOpcode extends string | JumpInstructionOpcode
>(
  op: TOpcode
): OptionalIfNot<
  ValidArgument<'jump'>[],
  keyof typeof JumpInstructionOpcode,
  TOpcode
> {
  if (inEnum(op, JumpInstructionOpcode)) {
    return ['imm'];
  }

  return undefined!;
}

/**
 * Gets the arguments required by the provided function.
 *
 * @param operation A MIPS function.
 * @returns The required arguments, or undefined if the function is invalid.
 */
export function getRequiredFunctArguments<TFunct extends string | FunctionCode>(
  funct: TFunct
): OptionalIfNot<ValidArgument<'reg'>[], keyof typeof FunctionCode, TFunct> {
  if (inEnum(funct, JumpFunctionCode) || inEnum(funct, MoveToFunctionCode)) {
    return ['rs'];
  } else if (inEnum(funct, ArithmeticFunctionCode)) {
    return ['rd', 'rs', 'rt'];
  } else if (inEnum(funct, MultiplicationFunctionCode)) {
    return ['rs', 'rt'];
  } else if (inEnum(funct, ShiftFunctionCode)) {
    return ['rd', 'rt', 'shamt'];
  } else if (inEnum(funct, ShiftVFunctionCode)) {
    return ['rd', 'rt', 'rs'];
  } else if (inEnum(funct, MoveFromFunctionCode)) {
    return ['rd'];
  }

  return undefined!;
}

/**
 * Gets the arguments required by the provided operation, alongside its type.
 *
 * @param operation A MIPS operation or function.
 * @returns The required arguments and instruction type, or undefined if the argument
 *          is invalid.
 */
export function getRequiredArguments(
  operation: string
): InstructionArguments | undefined {
  const jump = getRequiredJumpArguments(operation);
  if (jump) {
    return { type: 'jump', arguments: jump };
  }

  const imm = getRequiredImmArguments(operation);
  if (imm) {
    return { type: 'imm', arguments: imm };
  }

  const funct = getRequiredFunctArguments(operation);
  if (funct) {
    return { type: 'reg', arguments: funct };
  }

  return undefined;
}
