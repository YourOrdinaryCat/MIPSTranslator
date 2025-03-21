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
import { EncodedInstruction, encodeRawInstruction } from './instruction';
import {
  ImmediateArithmeticOpcode,
  ImmediateBranchOpcode,
  ImmediateBranchZOpcode,
  ImmediateInstructionOpcode,
  ImmediateLoadOpcode,
  ImmediateLoadStoreOpcode,
  JumpInstructionOpcode,
  RegisterInstructionOpcode,
} from './op';
import { Register } from './reg';

function inEnum<TEnum extends object>(
  val: string | number | symbol,
  e: TEnum
): val is keyof TEnum {
  return val in e;
}

function tryParseRegister(val: string) {
  if (val.startsWith('$')) {
    val = val.slice(1);

    if (inEnum(val, Register)) {
      return Register[val];
    }
  }

  return undefined;
}

type InstructionType = 'r' | 'i' | 'j';
type ValidOp<TType extends InstructionType> = TType extends 'r'
  ? FunctionCode
  : TType extends 'i'
  ? ImmediateInstructionOpcode
  : JumpInstructionOpcode;

type ValidKey<TType extends InstructionType> = TType extends 'r'
  ? 'rd' | 'rs' | 'rt' | 'shamt'
  : TType extends 'i'
  ? 'rs' | 'rt' | 'imm'
  : 'imm';

function getSkipped(type: InstructionType, keys: string[]) {
  if (type === 'r') {
    return ['rd', 'rs', 'rt', 'shamt'].filter((k) => !keys.includes(k));
  }

  if (type === 'i') {
    return ['rs', 'rt', 'imm'].filter((k) => !keys.includes(k));
  }

  return ['imm'].filter((k) => !keys.includes(k));
}

function makeInstImpl<TType extends InstructionType>(
  type: TType,
  op: ValidOp<TType>,
  input: string[],
  keys: ValidKey<TType>[]
): Partial<EncodedInstruction> {
  let inst: Record<string, unknown>;

  if (type === 'r') {
    inst = {
      op: RegisterInstructionOpcode.REG,
      funct: op,
    };
  } else {
    inst = {
      op,
    };
  }

  for (const key of getSkipped(type, keys)) {
    inst[key] = 0;
  }

  for (const key of keys) {
    let val = input.shift();
    if (!val) {
      // Could just be empty string, so breaking would be wrong
      continue;
    }

    switch (key) {
      case 'rd':
      case 'rs':
      case 'rt':
        inst[key] = tryParseRegister(val);
        break;

      case 'imm':
      case 'shamt': {
        let radix = 10;
        if (val.startsWith('0x')) {
          val = val.slice(2);
          radix = 8;
        }

        inst[key] = parseInt(val, radix);
        break;
      }

      default:
        throw new Error(`The provided key was not valid: ${key}`);
    }
  }

  return inst;
}

function makeR(
  funct: Exclude<keyof typeof FunctionCode, number>,
  input: string[],
  keys: ValidKey<'r'>[]
): Partial<EncodedInstruction> {
  return makeInstImpl('r', FunctionCode[funct], input, keys);
}

function makeI(
  op: Exclude<keyof typeof ImmediateInstructionOpcode, number>,
  input: string[],
  keys: ValidKey<'i'>[]
): Partial<EncodedInstruction> {
  return makeInstImpl('i', ImmediateInstructionOpcode[op], input, keys);
}

function makeLS(
  op: Exclude<keyof typeof ImmediateLoadStoreOpcode, number>,
  input: string[]
): Partial<EncodedInstruction> {
  // Handle imm(rs) and imm (rs)
  const second = input.at(2);

  if (second?.includes('(') && second?.endsWith(')')) {
    const [imm, rs] = second.split('(');
    input = [...input.slice(0, 2), imm, rs.slice(0, -1)];
  } else {
    let rsIn = input.at(3);
    if (rsIn) {
      if (rsIn.startsWith('(') && rsIn.endsWith(')')) {
        rsIn = rsIn.slice(1, -1);
      }

      input = [...input.slice(0, 3), rsIn];
    }
  }

  return makeInstImpl('i', ImmediateLoadStoreOpcode[op], input, [
    'rt',
    'imm',
    'rs',
  ]);
}

function makeJ(
  op: Exclude<keyof typeof JumpInstructionOpcode, number>,
  input: string[],
  keys: ValidKey<'j'>[]
): Partial<EncodedInstruction> {
  return makeInstImpl('j', JumpInstructionOpcode[op], input, keys);
}

/**
 * Parses the provided input into a partial encoded instruction.
 *
 * @param input The input to parse.
 * @returns The encoded instruction. It may be missing certain fields.
 */
export function parsePartialInstruction(
  input: string
): Partial<EncodedInstruction> {
  if (input.startsWith('0x')) {
    input = input.slice(2);
  }

  // If we receive hex input, parse it directly
  if (/^[0-9A-F]{1,8}$/.test(input)) {
    return encodeRawInstruction(parseInt(input, 16));
  }

  // Otherwise, split and parse the input
  const [start, ...end] = input.split(/\s*,\s*/);
  const [first, second] = start.split(/\s+/);
  const rest = [second, ...end];

  if (!first) {
    return {};
  }

  if (inEnum(first, ArithmeticFunctionCode)) {
    return makeR(first, rest, ['rd', 'rs', 'rt']);
  }

  if (inEnum(first, MultiplicationFunctionCode)) {
    return makeR(first, rest, ['rs', 'rt']);
  }

  if (inEnum(first, ShiftFunctionCode)) {
    return makeR(first, rest, ['rd', 'rt', 'shamt']);
  }

  if (inEnum(first, ShiftVFunctionCode)) {
    return makeR(first, rest, ['rd', 'rt', 'rs']);
  }

  if (inEnum(first, JumpFunctionCode) || inEnum(first, MoveToFunctionCode)) {
    return makeR(first, rest, ['rs']);
  }

  if (inEnum(first, MoveFromFunctionCode)) {
    return makeR(first, rest, ['rd', 'rt', 'shamt']);
  }

  if (inEnum(first, ImmediateArithmeticOpcode)) {
    return makeI(first, rest, ['rt', 'rs', 'imm']);
  }

  if (inEnum(first, ImmediateLoadOpcode)) {
    return makeI(first, rest, ['rt', 'imm']);
  }

  if (inEnum(first, ImmediateBranchOpcode)) {
    return makeI(first, rest, ['rs', 'rt', 'imm']);
  }

  if (inEnum(first, ImmediateBranchZOpcode)) {
    return makeI(first, rest, ['rs', 'imm']);
  }

  if (inEnum(first, ImmediateLoadStoreOpcode)) {
    return makeLS(first, rest);
  }

  if (inEnum(first, JumpInstructionOpcode)) {
    return makeJ(first, rest, ['imm']);
  }

  return {};
}
