-- CreateTable
CREATE TABLE "group_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_views_user_id_group_id_key" ON "group_views"("user_id", "group_id");

-- AddForeignKey
ALTER TABLE "group_views" ADD CONSTRAINT "group_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_views" ADD CONSTRAINT "group_views_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "subscription_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
