import { inEnum } from '../util/enum';
import { decodeInstruction } from './encoding';
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
  DecodedInstruction,
  ImmediateInstruction,
  JumpInstruction,
  RegisterInstruction,
} from './instruction';
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

function tryParseRegister(val: string) {
  let radix = 10;
  if (val.startsWith('0x')) {
    val = val.slice(2);
    radix = 16;
  } else if (val.startsWith('$')) {
    val = val.slice(1);
  }

  if (inEnum(val, Register)) {
    return Register[val];
  }

  if (
    (radix === 10 && /^[0-9]{1,2}$/.test(val)) ||
    (radix === 16 && /^[0-9A-F]{1,2}$/.test(val))
  ) {
    return parseInt(val, radix);
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
): Partial<DecodedInstruction> {
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
          radix = 16;
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
): Partial<RegisterInstruction> {
  return makeInstImpl(
    'r',
    FunctionCode[funct],
    input,
    keys
  ) as Partial<RegisterInstruction>;
}

function makeI(
  op: Exclude<keyof typeof ImmediateInstructionOpcode, number>,
  input: string[],
  keys: ValidKey<'i'>[]
): Partial<ImmediateInstruction> {
  return makeInstImpl(
    'i',
    ImmediateInstructionOpcode[op],
    input,
    keys
  ) as Partial<ImmediateInstruction>;
}

function makeLS(
  op: Exclude<keyof typeof ImmediateLoadStoreOpcode, number>,
  input: string[]
): Partial<ImmediateInstruction> {
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
  ]) as Partial<ImmediateInstruction>;
}

function makeJ(
  op: Exclude<keyof typeof JumpInstructionOpcode, number>,
  input: string[],
  keys: ValidKey<'j'>[]
): Partial<JumpInstruction> {
  return makeInstImpl(
    'j',
    JumpInstructionOpcode[op],
    input,
    keys
  ) as Partial<JumpInstruction>;
}

/**
 * Parses the provided input into a partial decoded instruction.
 *
 * @param input The input to parse.
 * @returns The decoded instruction. It may be missing certain fields.
 */
export function parsePartialInstruction(
  input: string
): Partial<DecodedInstruction> {
  if (input.startsWith('0x')) {
    input = input.slice(2);
  }

  // If we receive hex input, parse it directly
  if (/^[0-9A-F]{1,8}$/.test(input)) {
    try {
      return decodeInstruction(parseInt(input, 16));
    } catch {
      return {};
    }
  }

  // Otherwise, split and parse the input
  const [first, ...rest] = input.split(/\s+|\s*,\s*/);
  if (!first) {
    return {};
  }

  if (inEnum(first, JumpFunctionCode)) {
    const inst = makeR(first, rest, ['rs']);
    if (inst.funct === JumpFunctionCode.jalr) {
      return { ...inst, rd: Register.ra };
    }

    return inst;
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

  if (inEnum(first, MoveToFunctionCode)) {
    return makeR(first, rest, ['rs']);
  }

  if (inEnum(first, MoveFromFunctionCode)) {
    return makeR(first, rest, ['rd']);
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
