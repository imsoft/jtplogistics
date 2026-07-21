-- CreateTable: agregar comentarios de seguimiento para cotizaciones
CREATE TABLE "quote_comments" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: índices para búsquedas rápidas
CREATE INDEX "quote_comments_quote_id_idx" ON "quote_comments"("quote_id");
CREATE INDEX "quote_comments_user_id_idx" ON "quote_comments"("user_id");

-- AddForeignKey
ALTER TABLE "quote_comments" ADD CONSTRAINT "quote_comments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "generated_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_comments" ADD CONSTRAINT "quote_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
