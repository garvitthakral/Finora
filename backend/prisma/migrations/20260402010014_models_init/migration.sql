-- CreateEnum
CREATE TYPE "USER_ROLE" AS ENUM ('VIEWER', 'ANALYST', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "USER_ROLE" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMonthlySummary" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "totalIncome" DECIMAL(10,2) NOT NULL,
    "totalExpense" DECIMAL(10,2) NOT NULL,
    "netBalance" DECIMAL(10,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "highestExpense" DECIMAL(10,2),
    "largestCategory" TEXT,
    "avgDailySpend" DECIMAL(10,2),
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserMonthlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCategorySummary" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "totalIncome" DECIMAL(10,2) NOT NULL,
    "totalExpense" DECIMAL(10,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "highestTransaction" DECIMAL(10,2),
    "averageTransaction" DECIMAL(10,2),
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserCategorySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_userId_category_idx" ON "Transaction"("userId", "category");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "UserMonthlySummary_userId_idx" ON "UserMonthlySummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMonthlySummary_userId_month_key" ON "UserMonthlySummary"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "UserCategorySummary_userId_category_key" ON "UserCategorySummary"("userId", "category");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMonthlySummary" ADD CONSTRAINT "UserMonthlySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategorySummary" ADD CONSTRAINT "UserCategorySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
