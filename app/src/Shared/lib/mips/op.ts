/**
 * Represents all valid MIPS instruction opcodes.
 */
export const enum KnownInstructionOpcode {
  REG = 0,

  j = 2,
  jal = 3,
  beq = 4,
  bne = 5,
  blez = 6,
  bgtz = 7,

  addi = 8,
  addiu = 9,
  slti = 10,
  sltiu = 11,
  andi = 12,
  ori = 13,
  xori = 14,

  llo = 24,
  lhi = 25,
  trap = 26,

  lb = 32,
  lh = 33,
  lw = 35,
  lbu = 36,
  lhu = 37,

  sb = 40,
  sh = 41,
  sw = 43,
}

/**
 * Represents the opcode used by all MIPS register instructions.
 */
export type RegisterInstructionOpcode = KnownInstructionOpcode.REG;

/**
 * Represents the valid opcodes for MIPS jump instructions.
 */
export type JumpInstructionOpcode =
  | KnownInstructionOpcode.j
  | KnownInstructionOpcode.jal
  | KnownInstructionOpcode.trap;

/**
 * Represents the valid opcodes for MIPS immediate instructions.
 */
export type ImmediateInstructionOpcode = Exclude<
  KnownInstructionOpcode,
  RegisterInstructionOpcode | JumpInstructionOpcode
>;
