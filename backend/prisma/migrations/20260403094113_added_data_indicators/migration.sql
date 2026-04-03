-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isFirstTransactionOfDay" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserMonthlySummary" ADD COLUMN     "activeExpenseDays" INTEGER NOT NULL DEFAULT 0;
