-- Being active is no longer a column of its own: an excluded person is an inactive one.
ALTER TABLE "User" DROP COLUMN "isActive";
