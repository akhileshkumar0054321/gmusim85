export interface SampleProgram {
  id: string;
  title: string;
  category: string;
  description: string;
  code: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'factorial',
    title: 'Factorial of a Number',
    category: 'Arithmetic',
    description: 'Calculates factorial of a small number (e.g. 5! = 120 / 78H) using iterative multiplication.',
    code: `; Program: Factorial of a Number
; Computes N! and stores the result in memory address 2050H
; Input: N loaded in Register C

      ORG 4200H

START:
      MVI B, 05H        ; N = 5 (8-bit result supports N <= 5)
      MVI A, 01H        ; 0! and 1! are both 1
      MOV C, A
      MOV A, B
      CPI 02H
      MOV A, C
      JC STORE_RES

FACT_LOOP:
      MOV D, A          ; Save the previous factorial
      MOV C, B          ; Multiply it by B using repeated addition
      XRA A

MULT_LOOP:
      ADD D
      DCR C
      JNZ MULT_LOOP
      DCR B
      MOV E, A          ; Preserve the product while checking the counter
      MOV A, B
      CPI 01H
      MOV A, E
      JNZ FACT_LOOP

STORE_RES:
      STA 2050H         ; Store final result at 2050H (78H for 5!)
      OUT 01H           ; Output result to Port 1 (LEDs)
      HLT
`,
  },
  {
    id: 'bubble_sort',
    title: 'Bubble Sort (Ascending)',
    category: 'Array / Sorting',
    description: 'Sorts an array of numbers stored in memory starting at 2050H in ascending order.',
    code: `; Program: Bubble Sort Array in Ascending Order
; Array count is at 204FH, elements start at 2050H

      ORG 4200H

START:
      ; Initialize test array in memory
      MVI A, 05H        ; 5 elements
      STA 204FH
      MVI A, 25H
      STA 2050H
      MVI A, 12H
      STA 2051H
      MVI A, 89H
      STA 2052H
      MVI A, 04H
      STA 2053H
      MVI A, 43H
      STA 2054H

SORT_INIT:
      LDA 204FH         ; Load array count into C
      DCR A             ; Outer loop runs (Count - 1) times
      MOV C, A

OUTER_LOOP:
      MOV D, C          ; Inner loop counter
      LXI H, 2050H      ; Point HL to start of array

INNER_LOOP:
      MOV A, M          ; A = [HL]
      INX H             ; Point to next element [HL + 1]
      CMP M             ; Compare A with [HL]
      JC NO_SWAP        ; If A < M, already in order

      ; Swap elements
      MOV B, M          ; B = [HL]
      MOV M, A          ; [HL] = A
      DCX H             ; Point back
      MOV M, B          ; [HL - 1] = B
      INX H             ; Advance pointer back

NO_SWAP:
      DCR D
      JNZ INNER_LOOP

      DCR C
      JNZ OUTER_LOOP

      ; Sorting complete
      LDA 2050H         ; Load smallest element
      OUT 01H           ; Display on Port 1
      HLT
`,
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Series',
    category: 'Series',
    description: 'Generates the first N numbers of the Fibonacci series and stores them consecutively in RAM.',
    code: `; Program: Fibonacci Series Generator
; Generates first 10 Fibonacci terms starting at memory 2050H
; F(0)=0, F(1)=1, F(2)=1, F(3)=2, F(4)=3, F(5)=5, F(6)=8...

      ORG 4200H

START:
      MVI C, 08H        ; Generate 8 additional terms (after 0 and 1)
      LXI H, 2050H      ; Start memory pointer

      MVI M, 00H        ; First term = 0
      INX H
      MVI M, 01H        ; Second term = 1

      DCX H             ; HL points to F(n-2)
      MOV B, M          ; B = F(n-2)
      INX H             ; HL points to F(n-1)
      MOV A, M          ; A = F(n-1)

FIBO_LOOP:
      ADD B             ; A = F(n-1) + F(n-2)
      INX H             ; Move to next position
      MOV M, A          ; Store new term F(n)

      OUT 01H           ; Display current Fibonacci number on Port 1
      MOV B, M          ; Temporary swap
      DCX H
      MOV B, M          ; B becomes F(n-1)
      INX H
      MOV A, M          ; A becomes F(n)

      DCR C
      JNZ FIBO_LOOP

      HLT
`,
  },
  {
    id: 'find_max',
    title: 'Find Largest and Smallest in Array',
    category: 'Array / Search',
    description: 'Finds the maximum and minimum numbers from a list of data in memory.',
    code: `; Program: Find Largest and Smallest Number in an Array
; Array starts at 2050H with length 5
; Largest stored at 2060H, Smallest at 2061H

      ORG 4200H

START:
      ; Preload sample array
      LXI H, 2050H
      MVI M, 34H
      INX H
      MVI M, 9AH
      INX H
      MVI M, 12H
      INX H
      MVI M, 77H
      INX H
      MVI M, 05H

      ; Initialize search
      MVI C, 04H        ; Count - 1 comparisons
      LXI H, 2050H
      MOV A, M          ; A holds Maximum
      MOV B, M          ; B holds Minimum

SCAN_LOOP:
      INX H             ; Next element
      CMP M             ; Compare Current Max with [HL]
      JNC CHECK_MIN
      MOV A, M          ; New Max found

CHECK_MIN:
      MOV D, A          ; Preserve Max
      MOV A, B          ; Compare with Min
      CMP M
      JC RESTORE_MAX
      MOV B, M          ; New Min found

RESTORE_MAX:
      MOV A, D
      DCR C
      JNZ SCAN_LOOP

      ; Save results
      STA 2060H         ; Max stored
      MOV A, B
      STA 2061H         ; Min stored
      OUT 01H           ; Output Min to port 1
      LDA 2060H
      OUT 02H           ; Output Max to port 2
      HLT
`,
  },
  {
    id: 'hex_to_bcd',
    title: 'Hexadecimal to BCD Conversion',
    category: 'Conversion',
    description: 'Converts an 8-bit Hexadecimal number (e.g. FFH = 255) into unpacked BCD digits.',
    code: `; Program: 8-Bit Hexadecimal to BCD Conversion
; Converts Hex byte in Acc to BCD (Hundreds, Tens, Units)
; Hundreds -> 2060H, Tens -> 2061H, Units -> 2062H

      ORG 4200H

START:
      MVI A, 0FFH       ; Input hex: 255 decimal (FFH)
      MVI B, 00H        ; Hundreds counter
      MVI C, 00H        ; Tens counter

COUNT_100:
      CPI 64H           ; Compare with 100 decimal (64H)
      JC COUNT_10
      SUI 64H           ; Subtract 100
      INR B             ; Increment Hundreds
      JMP COUNT_100

COUNT_10:
      CPI 0AH           ; Compare with 10 decimal (0AH)
      JC STORE_DIGITS
      SUI 0AH           ; Subtract 10
      INR C             ; Increment Tens
      JMP COUNT_10

STORE_DIGITS:
      ; Remaining A is Units
      STA 2062H         ; Units = 5
      MOV A, C
      STA 2061H         ; Tens = 5
      MOV A, B
      STA 2060H         ; Hundreds = 2

      OUT 01H           ; Output Hundreds to port 1
      MOV A, C
      OUT 02H           ; Output Tens to port 2
      HLT
`,
  },
  {
    id: 'block_transfer',
    title: 'Block Transfer of Data',
    category: 'Memory Transfer',
    description: 'Transfers a consecutive block of bytes from source (2050H) to destination (2070H).',
    code: `; Program: Block Transfer of Memory
; Copies 4 bytes from 2050H-2053H to 2070H-2073H

      ORG 4200H

START:
      ; Fill source block with pattern
      LXI H, 2050H
      MVI M, 11H
      INX H
      MVI M, 22H
      INX H
      MVI M, 33H
      INX H
      MVI M, 44H

      ; Begin transfer
      LXI H, 2050H      ; Source pointer
      LXI D, 2070H      ; Destination pointer
      MVI C, 04H        ; Count = 4 bytes

COPY_LOOP:
      MOV A, M          ; Read from source
      STAX D            ; Store to destination
      INX H             ; Increment source
      INX D             ; Increment destination
      DCR C             ; Decrement counter
      JNZ COPY_LOOP

      HLT
`,
  },
  {
    id: 'io_led_counter',
    title: 'I/O Port LED Binary Counter',
    category: 'I/O & Peripherals',
    description: 'Demonstrates reading inputs from Port 0 (Switches) and counting outputs on Port 1 (LED bar).',
    code: `; Program: I/O Port Binary Counter with Switches
; Reads initial step from Port 0 (Dipswitch)
; Increments Accumulator and outputs to Port 1 (LEDs) & Port 2 (7-Segment)

      ORG 4200H

START:
      IN 00H            ; Read switch state from Port 0
      CPI 00H
      JNZ HAS_OFFSET
      MVI A, 01H        ; Default step if switches are 0

HAS_OFFSET:
      MOV B, A          ; Step size in B
      MVI A, 00H        ; Counter in A
      MVI C, 10H        ; Run for 16 cycles

COUNT_CYCLE:
      ADD B             ; Increment counter by step
      OUT 01H           ; Output binary to LED bar
      OUT 02H           ; Output hex value to 7-segment display
      DCR C
      JNZ COUNT_CYCLE

      HLT
`,
  },
  {
    id: 'palindrome',
    title: 'String Palindrome Checker',
    category: 'String',
    description: 'Verifies whether a given string in memory is a palindrome (e.g. "RADAR").',
    code: `; Program: Palindrome String Checker
; String at 2050H: 'R', 'A', 'D', 'A', 'R'
; Result at 2060H: 01H if Palindrome, 00H if Not

      ORG 4200H

START:
      ; Setup 'RADAR' string
      LXI H, 2050H
      MVI M, 'R'
      INX H
      MVI M, 'A'
      INX H
      MVI M, 'D'
      INX H
      MVI M, 'A'
      INX H
      MVI M, 'R'

      LXI H, 2050H      ; Start pointer
      LXI D, 2054H      ; End pointer
      MVI C, 02H        ; Half string length comparisons (5/2 = 2)

CHECK_LOOP:
      LDAX D            ; Character from end
      CMP M             ; Compare with start
      JNZ NOT_PALINDROME

      INX H             ; Move start forward
      DCX D             ; Move end backward
      DCR C
      JNZ CHECK_LOOP

      ; Is a palindrome
      MVI A, 01H
      STA 2060H
      OUT 01H
      HLT

NOT_PALINDROME:
      MVI A, 00H
      STA 2060H
      OUT 01H
      HLT
`,
  },
];
