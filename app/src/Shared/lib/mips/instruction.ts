// Reference taken from:
// https://student.cs.uwaterloo.ca/~isg/res/mips/opcodes

import type {
  ImmediateInstructionOpcode,
  JumpInstructionOpcode,
  KnownInstructionOpcode,
  RegisterInstructionOpcode
} from "./op";

/**
 * Represents a base for all MIPS instructions.
 */
export type InstructionBase<TOpCode extends number = KnownInstructionOpcode> = {
  /**
   * A 6 bit number representing the instruction's opcode.
   */
  op: TOpCode;
}

/**
 * Represents an instruction encoded as a register instruction.
 */
export type RegisterInstruction = InstructionBase<RegisterInstructionOpcode> & {
  /**
   * A 5 bit number representing the instruction's first source register.
   */
  rs: number;

  /**
   * A 5 bit number representing the instruction's second source register.
   */
  rt: number;

  /**
   * A 5 bit number representing the instruction's destination register.
   */
  rd: number,

  /**
   * A 5 bit number representing the instruction's shift amount.
   */
  shamt: number;

  /**
   * A 6 bit number representing the instruction's function.
   */
  funct: number;
}

/**
 * Represents an instruction that uses the immediate encoding.
 */
export type ImmediateInstruction = InstructionBase<ImmediateInstructionOpcode> & {
  /**
   * A 5 bit number representing the instruction's first register.
   */
  rs: number;

  /**
   * A 5 bit number representing the instruction's second register.
   */
  rt: number;

  /**
   * A 16 bit number representing the instruction's immediate data.
   */
  imm: number;
}

/**
 * Represents an instruction that uses the jump encoding.
 */
export type JumpInstruction = InstructionBase<JumpInstructionOpcode> & {
  /**
   * A 26 bit number representing the instruction's immediate offset.
   */
  imm: number;
}
