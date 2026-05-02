# SmartReceipt — TODO

## 1. Просмотр фото чека в комнате

**Зависит от:** сохранения картинки на диск.

**Шаги:**
- Volume `/data/uploads` смонтирован в контейнер.
- В `POST /api/receipts` сохранять файл `data/uploads/<receiptId>.<ext>`, в receipt
  записывать `imagePath`, `imageMime`.
- Эндпоинт `GET /api/receipts/[id]/image` стримит файл.
- В UI комнаты — миниатюра чека сверху (или в шапке), клик → fullscreen lightbox.
- На cleanup (TTL 7 дней) — удалять файл вместе с receipt.
- Лимит upload **10 MB**, проверять и в API, и в nginx (`client_max_body_size 11m`).

