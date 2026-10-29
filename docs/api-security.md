# API Security

Every API request must be signed with HMAC-SHA256 using the merchant's secret key. The signature is sent in the X-Signature header.

Requests with a timestamp older than 5 minutes are rejected, to prevent replay attacks.

Every payment request must include an Idempotency-Key header. If the same key is sent again within 24 hours, the original response is returned and the customer is not charged twice.

Each merchant can send up to 100 API requests per second. If the limit is exceeded, the API returns HTTP 429 with a Retry-After header.