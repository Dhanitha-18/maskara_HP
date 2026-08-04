-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "fatherPhone" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "usn" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "yearSem" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT,
    "hostelPref" TEXT NOT NULL,
    "medicalInfo" TEXT,
    "emergencyContact" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL,
    "holdReason" TEXT,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "roomNo" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Room_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "bedNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "allocatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    CONSTRAINT "Allocation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Allocation_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_usn_key" ON "Application"("usn");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_bedId_key" ON "Allocation"("bedId");
