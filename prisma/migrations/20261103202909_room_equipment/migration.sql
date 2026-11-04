-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('PROJECTOR', 'COMPUTERS', 'WHITEBOARD');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "equipment" "Equipment"[] DEFAULT ARRAY[]::"Equipment"[];
