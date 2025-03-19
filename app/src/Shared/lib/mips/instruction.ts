// Reference taken from:
// https://student.cs.uwaterloo.ca/~isg/res/mips/opcodes

import { FunctionCode } from './funct';
import {
  type KnownInstructionOpcode,
  ImmediateInstructionOpcode,
  JumpInstructionOpcode,
  RegisterInstructionOpcode,
} from './op';
import { Register } from './reg';

/**
 * Represents a base for all MIPS instructions.
 */
export type InstructionBase<TOpCode extends number = KnownInstructionOpcode> = {
  /**
   * A 6 bit number representing the instruction's opcode.
   */
  op: TOpCode;
};

/**
 * Represents an instruction encoded as a register instruction.
 */
export type RegisterInstruction = InstructionBase<RegisterInstructionOpcode> & {
  /**
   * A 5 bit number representing the instruction's first source register.
   */
  rs: Register;

  /**
   * A 5 bit number representing the instruction's second source register.
   */
  rt: Register;

  /**
   * A 5 bit number representing the instruction's destination register.
   */
  rd: Register;

  /**
   * A 5 bit number representing the instruction's shift amount.
   */
  shamt: number;

  /**
   * A 6 bit number representing the instruction's function code.
   */
  funct: FunctionCode;
};

/**
 * Represents an instruction that uses the immediate encoding.
 */
export type ImmediateInstruction =
  InstructionBase<ImmediateInstructionOpcode> & {
    /**
     * A 5 bit number representing the instruction's first register.
     */
    rs: Register;

    /**
     * A 5 bit number representing the instruction's second register.
     */
    rt: Register;

    /**
     * A 16 bit number representing the instruction's immediate data.
     */
    imm: number;
  };

/**
 * Represents an instruction that uses the jump encoding.
 */
export type JumpInstruction = InstructionBase<JumpInstructionOpcode> & {
  /**
   * A 26 bit number representing the instruction's immediate offset.
   */
  imm: number;
};

/**
 * Represents an encoded instruction.
 */
export type EncodedInstruction =
  | RegisterInstruction
  | ImmediateInstruction
  | JumpInstruction;

/**
 * Encodes the provided instruction into a strongly typed representation.
 *
 * @param instruction The instruction to encode.
 * @returns The encoded instruction.
 * @throws {RangeError} If the instruction's opcode or function code is invalid.
 * @throws {TypeError} If the instruction does not fit 32-bit unsigned range.
 */
export function encodeRawInstruction(instruction: number): EncodedInstruction {
  // Value must be within 32-bit unsigned range
  if (instruction < 0 || instruction > 4294967295) {
    throw new TypeError(
      `The provided instruction is too large - it must fall within 32-bit unsigned range.`
    );
  }

  const op = instruction >>> 26;
  if (op === RegisterInstructionOpcode.REG) {
    const funct = instruction & 63; // 6 bits
    if (funct in FunctionCode) {
      return {
        op,
        rs: (instruction >>> 21) & 31, // 5 bits
        rt: (instruction >>> 16) & 31, // 5 bits
        rd: (instruction >>> 11) & 31, // 5 bits
        shamt: (instruction >>> 6) & 31, // 5 bits
        funct,
      };
    }

    throw new RangeError(
      `The provided register instruction's function code (${funct}) is not valid.`
    );
  }

  if (op in JumpInstructionOpcode) {
    return {
      op,
      imm: instruction & 67_108_863, // 26 bits
    };
  }

  if (op in ImmediateInstructionOpcode) {
    return {
      op,
      rs: (instruction >>> 21) & 31, // 5 bits
      rt: (instruction >>> 16) & 31, // 5 bits
      imm: instruction & 65_535, // 16 bits
    };
  }

  throw new RangeError(
    `The provided instruction's opcode (${op}) is not valid.`
  );
}
