-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "academic_transcript_filename" TEXT,
ADD COLUMN     "academic_transcript_storage_path" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "level_of_study" TEXT,
ADD COLUMN     "program" TEXT,
ADD COLUMN     "recommendation_letter_filename" TEXT,
ADD COLUMN     "recommendation_letter_storage_path" TEXT,
ADD COLUMN     "year_of_study" INTEGER;
